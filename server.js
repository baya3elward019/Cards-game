'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomInt, randomUUID } = require('node:crypto');
const { WebSocketServer, WebSocket } = require('ws');
const context = vm.createContext({ window: {}, Math });
for (const file of ['cards', 'engine']) vm.runInContext(fs.readFileSync(path.join(__dirname, 'js', file + '.js'), 'utf8'), context);
const SD = context.window.SD;

function createServer() {
  const rooms = new Map();
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!/^(index\.html|(?:js|css)\/[\w.-]+\.(?:js|css))$/.test(file)) { res.writeHead(404).end(); return; }
    fs.readFile(path.join(__dirname, file), (error, data) => {
      if (error) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(data);
    });
  });
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });
  const send = (ws, data) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); };
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
      busy: room.busy, opponentConnected: room.players[1 - viewer].ws?.readyState === WebSocket.OPEN,
      log: (room.history || []).map(e => ({ ...e, a: e.a.map(a => a && a.player !== undefined ? { k: a.player === viewer ? 'you' : 'opp' } : a) }))
    };
  }
  function broadcast(room) {
    room.players.forEach((player, p) => {
      if (!player.ws) return;
      send(player.ws, room.game ? { type: 'state', state: snapshot(room, p) } : { type: 'waiting', code: room.code });
      if (room.pending?.p === p) send(player.ws, room.pending.message);
    });
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
  function leave(ws) {
    const room = ws.room; if (!room) return;
    const player = room.players[ws.seat];
    if (player.ws !== ws) return;
    player.ws = null; ws.room = null;
    player.timer = setTimeout(() => {
      if (room.pending) { clearTimeout(room.pending.timer); room.pending.reject(new Error('disconnected')); room.pending = null; }
      if (room.game) room.game.end(1 - room.players.indexOf(player), 'disconnect');
      broadcast(room); rooms.delete(room.code);
    }, 60000);
    broadcast(room);
  }
  wss.on('connection', ws => {
    ws.alive = true; ws.on('pong', () => { ws.alive = true; });
    ws.on('error', () => {});
    let rateStart = Date.now(), count = 0;
    ws.on('message', async raw => {
      if (Date.now() - rateStart > 10000) { rateStart = Date.now(); count = 0; }
      if (++count > 100) { ws.close(1008); return; }
      try {
        const m = JSON.parse(raw); if (!m || typeof m !== 'object') throw Error('invalid');
        if (m.type === 'create' || m.type === 'join') {
          if (ws.room || !Object.hasOwn(SD.DECKS, m.deck)) throw Error('invalid');
          let room, seat;
          if (m.type === 'create') {
            if (rooms.size >= 500) throw Error('capacity');
            let code; do { code = randomInt(0, 36 ** 6).toString(36).padStart(6, '0').toUpperCase(); } while (rooms.has(code));
            room = { code, players: [], busy: false, created: Date.now() }; rooms.set(code, room); seat = 0;
          } else {
            room = rooms.get(String(m.code).trim().toUpperCase());
            if (!room) throw Error('notFound');
            if (room.players.length !== 1 || !room.players[0].ws) throw Error('full');
            seat = 1;
          }
          const player = { ws, deck: m.deck, token: randomUUID() }; room.players.push(player); ws.room = room; ws.seat = seat;
          send(ws, { type: 'joined', code: room.code, token: player.token });
          if (seat === 1) start(room); else broadcast(room);
          return;
        }
        if (m.type === 'resume') {
          const room = rooms.get(m.code), seat = room?.players.findIndex(p => p.token === m.token);
          if (!room || seat < 0 || ws.room) throw Error('expired');
          const player = room.players[seat]; clearTimeout(player.timer);
          if (player.ws) { player.ws.room = null; player.ws.close(); }
          player.ws = ws; ws.room = room; ws.seat = seat;
          send(ws, { type: 'joined', code: room.code, token: player.token }); broadcast(room); return;
        }
        const room = ws.room, p = ws.seat;
        if (!room || !room.game) throw Error('invalid');
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
      } catch (error) { send(ws, { type: 'error', code: ['notFound', 'full', 'expired', 'capacity'].includes(error.message) ? error.message : 'invalid' }); }
    });
    ws.on('close', () => leave(ws));
  });
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) { if (!ws.alive) ws.terminate(); else { ws.alive = false; ws.ping(); } }
    for (const room of rooms.values()) if (Date.now() - room.created > 4 * 3600000) {
      room.players.forEach(p => p.ws?.close()); rooms.delete(room.code);
    }
  }, 30000);
  heartbeat.unref();
  server.on('close', () => { clearInterval(heartbeat); for (const room of rooms.values()) { room.players.forEach(p => clearTimeout(p.timer)); if (room.pending) clearTimeout(room.pending.timer); } });
  return { server, wss, rooms, SD };
}
module.exports = { createServer };
if (require.main === module) createServer().server.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('Sigil Duel ready on port ' + (process.env.PORT || 3000)));
