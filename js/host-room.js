/* Host-owned rules for static-site rooms. Transport never receives the full game state. */
(function () {
const SD = window.SD, randomUUID = () => crypto.randomUUID(), randomInt = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;
SD.createHostedRoom = function (decks, deliver) {
  const room = { players: decks.map(deck => ({ deck, ws: { readyState: 1 } })), busy: false };
  let closed = false;
  function cardView(c, viewer, hidden = false) {
    if (!c) return null;
    const owner = c.owner === viewer ? 0 : 1;
    if (hidden) return { uid: c.uid, owner, faceDown: true, pos: c.pos, hidden: true };
    return { ...c, owner };
  }
  function snapshot(room, viewer) {
    const g = room.game;
    return {
      P: [viewer, 1 - viewer].map(p => Object.fromEntries(Object.entries(g.P[p]).map(([z, value]) => [z, z === 'lp' ? value : value.map(c => cardView(c, viewer, z === 'deck' || p !== viewer && (z === 'hand' || c && c.faceDown)))]))),
      turn: g.turn === viewer ? 0 : 1, turnCount: g.turnCount, phase: g.phase,
      normalUsed: g.normalUsed, over: g.over, winner: g.winner === null ? null : g.winner === viewer ? 0 : 1, reason: g.reason,
      busy: room.busy, opponentConnected: room.players[1 - viewer].ws?.readyState === 1,
      log: (room.history || []).map(e => ({ ...e, a: e.a.map(a => a && a.player !== undefined ? { k: a.player === viewer ? 'you' : 'opp' } : a) }))
    };
  }

  function broadcast(room) {
    if (closed) return;
    for (const p of [0, 1]) {
      const messages = [{ type: 'state', state: snapshot(room, p) }];
      if (room.pending?.p === p) messages.push(room.pending.message);
      deliver(p, messages);
    }
  }
  function ask(room, p, kind, cards, extra = {}) {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const message = { type: 'prompt', id, kind, cards: cards.map(c => cardView(c, p, c.owner !== p && c.faceDown)), ...extra };
      const timer = setTimeout(() => {
        room.pending = null;
        room.game.end(1 - p, 'timeout');
        reject(new Error('timeout'));
      }, 120000);
      room.pending = { p, message, cards, resolve, reject, timer };
      broadcast(room);
    });
  }
  function start(room) {
    room.history = [];
    const ctrl = [0, 1].map(p => ({
      chooseTributes: (cards, n) => ask(room, p, 'tribute', cards, { n }),
      chooseTarget: (cards, why) => ask(room, p, 'target', cards, { why }),
      chooseDiscard: cards => ask(room, p, 'discard', cards),
      confirmTrap: card => ask(room, p, 'trap', [card])
    }));
    room.game = new SD.Game({ decks: room.players.map(p => SD.shuffle(SD.buildDeck(p.deck))), first: randomInt(2), ctrl,
      onEvent(type, d) {
        if (type === 'over') room.game.reason = d.reason;
        const who = { player: d.p }, card = c => c.faceDown ? { k: 'hidden' } : { id: c.id };
        const add = (k, a, c = '') => { room.history.push({ k, a, c }); room.history = room.history.slice(-40); };
        if (type === 'turn') add('log_turn', [room.game.turnCount, who], 'sep');
        if (type === 'summon') d.mode === 'set' ? add('log_setm', [who]) : add(d.special ? 'log_special' : 'log_summon', [who, card(d.card)]);
        if (type === 'set') add('log_set', [who]);
        if (type === 'spell' || type === 'trap') add('log_' + type, [who, card(d.card)], 'hl');
        if (type === 'attack') d.target ? add('log_attack', [card(d.attacker), card(d.target)]) : add('log_direct', [card(d.attacker)]);
        if (type === 'lp') add('log_lp', [who, (d.delta > 0 ? '+' : '') + d.delta], d.delta < 0 ? 'dmg' : 'heal');
        if (type === 'destroy' || type === 'flip' || type === 'tribute' || type === 'bounce') add('log_' + type, [card(d.card)]);
        if (type === 'discard') add('log_discard', [who]);
      } });
    room.game.start(); broadcast(room);
  }

  return {
    start() { start(room); },
    async handle(p, m) {
      if (closed) return;
      try {
        if (m.type === 'answer') {
          const q = room.pending;
          if (!q || q.p !== p || q.message.id !== m.id) throw Error('invalid');
          let value;
          if (q.message.kind === 'trap') { if (typeof m.value !== 'boolean') throw Error('invalid'); value = m.value; }
          else if (q.message.kind === 'tribute') {
            if (m.value === null) value = null;
            else {
              if (!Array.isArray(m.value) || m.value.length !== q.message.n || new Set(m.value).size !== m.value.length) throw Error('invalid');
              value = m.value.map(uid => q.cards.find(c => c.uid === uid)); if (value.some(c => !c)) throw Error('invalid');
            }
          } else { value = q.cards.find(c => c.uid === m.value); if (!value) throw Error('invalid'); }
          clearTimeout(q.timer); room.pending = null; q.resolve(value); return;
        }
        const g = room.game;
        if (m.type !== 'action' || room.busy || g.over || g.turn !== p || room.players.some(x => !x.ws)) throw Error('invalid');
        const c = [...g.P[p].hand, ...g.P[p].m, ...g.P[p].st].find(c => c && c.uid === m.uid);
        const target = g.mons(1 - p).find(c => c.uid === m.target);
        const actions = {
          summon: () => g.summon(p, c, 'atk'), setm: () => g.summon(p, c, 'set'), activate: () => g.playSpell(p, c),
          setst: () => g.setCard(p, c), flip: () => g.flipSummon(p, c), pos: () => g.changePos(p, c),
          attack: () => g.attack(p, c, target || null), direct: () => g.attack(p, c, null), next: () => g.nextPhase(p), end: () => g.endTurn(p)
        };
        if (!Object.hasOwn(actions, m.action) || !['next', 'end'].includes(m.action) && !c || m.target != null && !target) throw Error('invalid');
        room.busy = true;
        try { if (await actions[m.action]() === false) throw Error('invalid'); }
        finally { room.busy = false; broadcast(room); }

      } catch { deliver(p, [{ type: 'error', code: 'invalid' }]); }
    },
    setConnected(p, connected) { room.players[p].ws = connected ? { readyState: 1 } : null; broadcast(room); },
    expire(p) { if (room.pending) { clearTimeout(room.pending.timer); room.pending.reject(Error('closed')); room.pending = null; } room.game.end(1 - p, 'disconnect'); broadcast(room); },
    close() { closed = true; if (room.pending) { clearTimeout(room.pending.timer); room.pending.reject(Error('closed')); room.pending = null; } },
    snapshot: p => snapshot(room, p)
  };
};
})();
