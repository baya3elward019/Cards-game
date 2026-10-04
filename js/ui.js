/* Screens, board rendering, player input and the tutorial coach. */
(function () {
  const SD = window.SD, app = document.getElementById('app'), fx = document.getElementById('fx');
  const store = { get(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
  let lang = store.get('sd-lang', 'ar'), level = +store.get('sd-level', 1);
  let screen = 'menu', mode = null, G = null, ai = null, sel = null, prompt = null, modal = null, busy = false, log = [], goals = null, libFilter = 'all';
  const GOALS = ['read', 'summon', 'spell', 'trapset', 'end', 'trapuse', 'tribute', 'attack', 'set'];
  const PHASES = ['draw', 'main1', 'battle', 'main2', 'end'];
  const appear = new Map(), calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const t = (k, ...a) => { let s = SD.STR[lang][k]; if (typeof s !== 'string') return s; a.forEach((v, i) => s = s.replace('{' + i + '}', v)); return s; };
  const D = c => SD.CARDS[c.id], cname = c => D(c).name[lang];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const btn = (act, label, cls = '') => `<button type="button" class="btn ${cls}" data-act="${act}">${label}</button>`;

  /* ---------- cards ---------- */
  function cardHTML(c, o = {}) {
    const d = D(c), cls = ['card', 'k-' + d.kind];
    if (o.full) cls.push('full'); if (o.mini) cls.push('mini');
    if (o.field && d.kind === 'monster') cls.push(c.pos === 'def' ? 'def' : 'isatk');
    let st = '';
    if (o.field) { /* drop-in animation the first time a card shows up (or flips) on the field */
      const key = c.uid + (c.faceDown ? 'd' : 'u'), now = performance.now();
      if (!appear.has(key)) appear.set(key, now);
      const el = now - appear.get(key); if (el < 600) { cls.push('enter'); st = `--e:-${Math.round(el)}ms;`; }
    }
    if (sel && sel.uid === c.uid && !o.full) cls.push('sel');
    if (prompt && prompt.ids && prompt.ids.has(c.uid)) cls.push('pick');
    if (o.hidden) return `<div class="${cls.join(' ')} back" data-uid="${c.uid}" style="${st}"><div class="cf">${SD.backArt}</div></div>`;
    if (o.ownDown) cls.push('own-down');
    const col = d.kind === 'monster' ? SD.ATTR[d.attr].c : SD.KIND_COLOR[d.kind];
    const kindLabel = d.kind === 'monster' ? `${SD.ATTR[d.attr][lang]} · ${t(d.fx ? 'effectM' : 'normalM')}` : t(d.kind === 'trap' ? 'kTrap' : d.sub === 'equip' ? 'kEquip' : 'kSpell');
    const atk = d.kind === 'monster' ? (G && o.field ? G.atkOf(c) : d.atk) : 0;
    const foot = d.kind === 'monster'
      ? `<div class="c-stats"><b class="atk${atk > d.atk ? ' up' : ''}">${o.full ? `<i>${t('atk')}</i>` : ''}${atk}</b><b class="dfn">${o.full ? `<i>${t('def')}</i>` : ''}${d.def}</b></div>`
      : `<div class="c-stats one"><b>${t(d.kind === 'trap' ? 'kTrap' : 'kSpell')}</b></div>`;
    return `<div class="${cls.join(' ')}" data-uid="${c.uid}" style="${st}--c:${col}"><div class="cf">
      <div class="c-head"><span class="c-name">${d.name[lang]}</span>${d.kind === 'monster' ? `<span class="c-lvl">${d.lvl}</span>` : ''}</div>
      <div class="c-art">${SD.art(c.id, col)}</div>
      ${o.full ? `<div class="c-type">${kindLabel}${d.kind === 'monster' ? ` · ${t('lvl')} ${d.lvl}` : ''}</div><p class="c-text">${d.text[lang]}</p>` : ''}
      ${foot}</div></div>`;
  }
  function findCard(uid) {
    if (String(uid).startsWith('lib-')) return { id: uid.slice(4), uid };
    if (!G) return null;
    for (const P of G.P) for (const z of [P.hand, P.m, P.st, P.gy]) for (const c of z) if (c && c.uid === +uid) return c;
    return null;
  }

  /* ---------- screens ---------- */
  function menuHTML() {
    const fan = ['stormWyvern', 'voidTyrant', 'emberFox'].map((id, i) => `<div class="fan f${i}">${cardHTML({ id, uid: 'lib-' + id }, {})}</div>`).join('');
    return `<main class="menu">
      <div class="menu-top"><button type="button" class="btn ghost" data-act="lang">${t('langBtn')}</button></div>
      <div class="hero"><div class="fan-wrap">${fan}</div><div><h1>${t('title')}</h1><p class="tag">${t('tagline')}</p></div></div>
      <div class="menu-list">
        <button type="button" class="mbtn" data-act="tutorial"><b>${t('mTutorial')}</b><span>${t('mTutorialSub')}</span></button>
        <button type="button" class="mbtn" data-act="duel"><b>${t('mDuel')}</b><span>${t('mDuelSub')}</span></button>
        <div class="seg" role="group" aria-label="${t('level')}"><span>${t('level')}</span>
          <button type="button" class="${level ? '' : 'on'}" data-act="lvl0">${t('easy')}</button><button type="button" class="${level ? 'on' : ''}" data-act="lvl1">${t('normal')}</button></div>
        <button type="button" class="mbtn" data-act="lib"><b>${t('mLib')}</b><span>${t('mLibSub')}</span></button>
      </div></main>`;
  }
  function libHTML() {
    const ids = Object.keys(SD.CARDS).filter(id => libFilter === 'all' || SD.CARDS[id].kind === libFilter);
    const tabs = [['all', 'fAll'], ['monster', 'kMonster'], ['spell', 'kSpell'], ['trap', 'kTrap']].map(([f, k]) => `<button type="button" class="${libFilter === f ? 'on' : ''}" data-act="f-${f}">${t(k)}</button>`).join('');
    return `<main class="lib">
      <div class="bar"><button type="button" class="btn ghost" data-act="menu">${t('back')}</button><h2>${t('mLib')}</h2><button type="button" class="btn ghost" data-act="lang">${t('langBtn')}</button></div>
      <div class="rules"><section><h3>${t('libRules')}</h3><ol>${t('rules').map(r => `<li>${r}</li>`).join('')}</ol></section>
        <section><h3>${t('libBattle')}</h3><ul>${t('battle').map(r => `<li>${r}</li>`).join('')}</ul></section></div>
      <div class="seg tabs">${tabs}</div>
      <div class="lib-grid">${ids.map(id => cardHTML({ id, uid: 'lib-' + id }, { full: true })).join('')}</div></main>`;
  }

  function zone(c, kind, owner) {
    let inner = '';
    if (c) inner = cardHTML(c, { field: true, mini: true, hidden: c.faceDown && owner === 1, ownDown: c.faceDown && owner === 0 });
    return `<div class="zone z-${kind}">${inner}</div>`;
  }
  function piles(p, which) {
    const P = G.P[p];
    if (which === 'deck') return `<div class="zone pile" title="${t('deck')}">${P.deck.length ? `<div class="card mini back"><div class="cf">${SD.backArt}</div></div>` : ''}<span class="count">${P.deck.length}</span></div>`;
    const top = P.gy[P.gy.length - 1];
    return `<button type="button" class="zone pile gy" data-act="gy${p}" title="${t('gy')}">${top ? cardHTML({ id: top.id, uid: 'x' }, { mini: true }) : ''}<span class="count">${P.gy.length}</span><span class="plabel">${t('gy')}</span></button>`;
  }
  function info(p) {
    const P = G.P[p];
    return `<div class="info ${G.turn === p && !G.over ? 'active' : ''}"><span class="who">${t(p ? 'opp' : 'you')}</span>
      <span class="lp" id="lp${p}"><small>${t('lp')}</small> ${P.lp}</span><span class="lpbar"><i style="width:${Math.min(100, P.lp / SD.START_LP * 100)}%"></i></span><span class="meta">${t('hand')} ${P.hand.length}</span></div>`;
  }
  function gameHTML() {
    const me = G.P[0], op = G.P[1], rev = a => [...a].reverse();
    const live = new Set(); for (const P of G.P) for (const c of [...P.m, ...P.st]) if (c) live.add(c.uid + 'd').add(c.uid + 'u');
    for (const k of appear.keys()) if (!live.has(k)) appear.delete(k);
    const board = `<div class="board" dir="ltr">
      ${info(1)}
      <div class="opp-hand">${op.hand.map(() => `<div class="card mini back"><div class="cf">${SD.backArt}</div></div>`).join('')}</div>
      <div class="zones opp">${piles(1, 'deck')}${rev(op.st).map(c => zone(c, 'st', 1)).join('')}</div>
      <div class="zones opp">${piles(1, 'gy')}${rev(op.m).map(c => zone(c, 'm', 1)).join('')}</div>
      <div class="phasebar"><span class="turn">${t('turnN', G.turnCount)}</span>${PHASES.map(p => `<span class="${G.phase === p ? 'on' : ''}">${t('ph_' + p)}</span>`).join('')}</div>
      <div class="zones">${me.m.map(c => zone(c, 'm', 0)).join('')}${piles(0, 'gy')}</div>
      <div class="zones">${me.st.map(c => zone(c, 'st', 0)).join('')}${piles(0, 'deck')}</div>
      ${info(0)}
    </div>`;
    const mid = (me.hand.length - 1) / 2;
    const hand = `<div class="hand">${me.hand.map((c, i) => `<div class="slot" style="--r:${(i - mid).toFixed(1)}">${cardHTML(c, {})}</div>`).join('')}</div>`;
    const detail = `<aside class="detail">${sel ? cardHTML(sel, { full: true }) : `<p class="muted">${t('detailEmpty')}</p>`}</aside>`;
    const logBox = `<aside class="logbox"><h3>${t('logTitle')}</h3><ol>${log.slice(-40).reverse().map(l => `<li class="${l.c}">${t(l.k, ...l.a.map(x => x && x.k ? t(x.k) : x && x.id ? SD.CARDS[x.id].name[lang] : x))}</li>`).join('')}</ol></aside>`;
    return `<main class="game ${mode}">
      <div class="bar"><button type="button" class="btn ghost" data-act="menu">${t('back')}</button><h2>${t(mode === 'tutorial' ? 'mTutorial' : 'mDuel')}</h2><button type="button" class="btn ghost" data-act="lang">${t('langBtn')}</button></div>
      ${mode === 'tutorial' ? coachHTML() : ''}
      <div class="table">${board}<div class="actions" aria-live="polite">${actionsHTML()}</div>${hand}</div>
      ${detail}${logBox}</main>${modalHTML()}`;
  }

  function actionsHTML() {
    if (G.over) return `<p class="result ${G.winner ? 'bad' : 'good'}"><b>${t(G.winner ? 'lose' : 'win')}</b> ${t('r_' + G.reason)}</p><div class="btns">${btn('again', t('again'), 'primary')}${btn('menu', t('back'))}</div>`;
    if (prompt && prompt.ids && !prompt.modal) return `<p class="ask">${prompt.msg}</p><div class="btns">${prompt.cancel ? btn('cancel', t('cancel')) : ''}</div>`;
    if (G.turn !== 0 || busy) return `<p class="muted">${G.turn ? t('oppTurn') : '…'}</p>`;
    const b = [];
    if (sel && sel.owner === 0) {
      const d = D(sel), w = G.where(sel);
      if (w === 'hand' && d.kind === 'monster' && G.canSummon(0, sel)) {
        const n = SD.tributes(d); b.push(btn('summon', n ? t('bTribute', n) : t('bSummon'), 'primary'), btn('setm', t('bSetM')));
      }
      if (d.kind === 'spell' && G.canActivate(0, sel)) b.push(btn('activate', t('bActivate'), 'primary'));
      if (w === 'hand' && G.canSet(0, sel)) b.push(btn('setst', t('bSetST')));
      if (w === 'm') {
        if (G.isMain(0) && sel.faceDown && sel.summonedTurn < G.turnCount) b.push(btn('flip', t('bFlip'), 'primary'));
        if (G.canChangePos(0, sel)) b.push(btn('pos', t('bPos')));
        if (G.canAttack(0, sel)) b.push(btn('attack', t(G.mons(1).length ? 'bAttack' : 'bDirect'), 'primary'));
      }
    }
    const ph = [];
    if (G.phase === 'main1' && G.turnCount > 1) ph.push(btn('next', t('bBattle')));
    if (G.phase === 'battle') ph.push(btn('next', t('bMain2')));
    ph.push(btn('end', t('bEnd')));
    const hint = b.length ? '' : `<p class="muted">${G.phase === 'main1' && G.turnCount === 1 ? t('noBattleFirst') : t('yourMove')}</p>`;
    return `${hint}<div class="btns">${b.join('')}<span class="gap"></span>${ph.join('')}</div>`;
  }
  function modalHTML() {
    if (prompt && prompt.confirm) return `<div class="modal"><div class="sheet"><p class="ask">${prompt.msg}</p>${cardHTML(prompt.card, { full: true })}<div class="btns">${btn('yes', t('yes'), 'primary')}${btn('no', t('no'))}</div></div></div>`;
    if (prompt && prompt.modal) return `<div class="modal"><div class="sheet"><p class="ask">${prompt.msg}</p><div class="mgrid">${prompt.modal.map(c => cardHTML(c, {})).join('')}</div></div></div>`;
    if (modal) return `<div class="modal" data-act="closeModal"><div class="sheet"><h3>${modal.title}</h3><div class="mgrid">${modal.cards.length ? modal.cards.map(c => cardHTML(c, {})).join('') : `<p class="muted">${t('empty')}</p>`}</div><div class="btns">${btn('closeModal', t('close'))}</div></div></div>`;
    return '';
  }

  /* ---------- tutorial coach ---------- */
  function coachHTML() {
    const next = GOALS.find(g => !goals[g]);
    let tip = next ? t('h_' + next) : t('allDone'), about = '';
    if (sel) {
      const d = D(sel), n = d.kind === 'monster' ? SD.tributes(d) : 0;
      about = d.kind === 'monster' ? (n ? t('k_high', d.lvl, n) : t('k_low', d.lvl)) + (d.fx ? ' ' + t('k_fx') : '') : t(d.kind === 'trap' ? 'k_trap' : d.sub === 'equip' ? 'k_equip' : 'k_spell');
    }
    return `<aside class="coach"><h3>${t('coach')}</h3><p class="tip">${tip}</p>${about ? `<p class="about"><b>${cname(sel)}:</b> ${about}</p>` : ''}
      <h4>${t('goalsTitle')}</h4><ul class="goals">${GOALS.map(g => `<li class="${goals[g] ? 'done' : g === next ? 'next' : ''}">${t('g_' + g)}</li>`).join('')}</ul></aside>`;
  }
  const mark = g => { if (goals) goals[g] = true; };
  function tutorialEvent(type, d) {
    if (type === 'summon' && d.p === 0 && !d.special) mark(d.mode === 'set' ? 'set' : d.tribute ? 'tribute' : 'summon');
    if (type === 'spell' && d.p === 0) mark('spell');
    if (type === 'set' && d.p === 0 && D(d.card).kind === 'trap') mark('trapset');
    if (type === 'turn' && d.p === 1) mark('end');
    if (type === 'attack' && d.p === 0) mark('attack');
    if (type === 'trap' && d.p === 0) mark('trapuse');
  }

  /* ---------- game events ---------- */
  function onEvent(type, d) {
    /* log entries keep keys, not text, so the log follows the language switch */
    const who = p => ({ k: p ? 'opp' : 'you' }), nm = c => (c.faceDown && c.owner === 1) ? { k: 'hidden' } : { id: c.id }, cn = c => ({ id: c.id });
    const add = (k, a = [], c = '') => log.push({ k, a, c });
    switch (type) {
      case 'turn': add('log_turn', [G.turnCount, who(d.p)], 'sep'); break;
      case 'summon': d.mode === 'set' ? add('log_setm', [who(d.p)]) : add(d.special ? 'log_special' : 'log_summon', [who(d.p), cn(d.card)]); break;
      case 'set': add('log_set', [who(d.p)]); break;
      case 'spell': add('log_spell', [who(d.p), cn(d.card)], 'hl'); break;
      case 'trap': add('log_trap', [who(d.p), cn(d.card)], 'hl'); break;
      case 'attack': d.target ? add('log_attack', [cn(d.attacker), nm(d.target)]) : add('log_direct', [cn(d.attacker)]); break;
      case 'destroy': add('log_destroy', [nm(d.card)]); break;
      case 'tribute': add('log_tribute', [nm(d.card)]); break;
      case 'flip': add('log_flip', [cn(d.card)]); break;
      case 'pos': add('log_pos', [cn(d.card), { k: d.card.pos }]); break;
      case 'equip': add('log_equip', [cn(d.target), cn(d.card)]); break;
      case 'discard': add('log_discard', [who(d.p)]); break;
      case 'lp': add('log_lp', [who(d.p), (d.delta > 0 ? '+' : '') + d.delta], d.delta < 0 ? 'dmg' : 'heal'); break;
      case 'over': G.reason = d.reason; break;
    }
    if (type === 'destroy' || type === 'tribute') ghost(d.card);
    if (type === 'spell' || type === 'trap') fxNode('showcase', cardHTML(d.card, { full: true }), 1250);
    if (type === 'turn') fxNode('banner ' + (d.p ? 'foe' : ''), `<span>${t(d.p ? 'opp' : 'you')}</span><small>${t('turnN', G.turnCount)}</small>`, 1300);
    if (type === 'lp' && d.delta < 0 && !calm) app.animate([{ transform: 'translate(0)' }, { transform: 'translate(-7px,3px)' }, { transform: 'translate(6px,-3px)' }, { transform: 'translate(-4px,2px)' }, { transform: 'translate(0)' }], { duration: 320 });
    if (mode === 'tutorial') tutorialEvent(type, d);
    render();
    if (type === 'lp') floatLP(d);
  }
  /* ---------- effects (drawn in #fx, which is never re-rendered) ---------- */
  const boardCard = c => document.querySelector(`.board .card[data-uid="${c.uid}"]`);
  function fxNode(cls, html, ms, css) { if (calm) return; const n = document.createElement('div'); n.className = cls; n.innerHTML = html || ''; Object.assign(n.style, css || {}); fx.appendChild(n); setTimeout(() => n.remove(), ms); }
  function ghost(c) { /* a dying card leaves a copy that burns away */
    const el = boardCard(c); if (!el || calm) return; const r = el.getBoundingClientRect(), n = el.cloneNode(true);
    n.classList.remove('enter', 'sel', 'pick', 'def'); n.classList.add('fx-ghost');
    Object.assign(n.style, { left: r.left + r.width / 2 - el.offsetWidth / 2 + 'px', top: r.top + r.height / 2 - el.offsetHeight / 2 + 'px', width: el.offsetWidth + 'px', height: el.offsetHeight + 'px' });
    fx.appendChild(n); setTimeout(() => n.remove(), 700);
  }
  async function onAnim(type, d) { /* attacker lunges at its target, then the hit lands */
    if (type !== 'attack' || calm) return;
    const a = boardCard(d.attacker), tg = d.target ? boardCard(d.target) : document.getElementById('lp' + (1 - d.p)); if (!a || !tg) return;
    const ra = a.getBoundingClientRect(), rt = tg.getBoundingClientRect(), cx = rt.left + rt.width / 2, cy = rt.top + rt.height / 2;
    const dx = (cx - ra.left - ra.width / 2) * .8, dy = (cy - ra.top - ra.height / 2) * .8;
    a.style.zIndex = 6;
    const an = a.animate([{ transform: 'none' }, { transform: `translate(${-dx * .08}px,${-dy * .08}px) scale(1.08)`, offset: .25 }, { transform: `translate(${dx}px,${dy}px) scale(1.18)`, offset: .6 }, { transform: 'none' }], { duration: 520, easing: 'ease-in-out' });
    setTimeout(() => fxNode('burst', '', 450, { left: cx + 'px', top: cy + 'px' }), 290);
    await Promise.race([an.finished.catch(() => { }), sleep(560)]);
  }
  function floatLP(d) {
    const el = document.getElementById('lp' + d.p); if (!el) return;
    const r = el.getBoundingClientRect(), f = document.createElement('div');
    f.className = 'float ' + (d.delta < 0 ? 'dmg' : 'heal'); f.textContent = (d.delta > 0 ? '+' : '') + d.delta;
    f.style.left = r.left + r.width / 2 + 'px'; f.style.top = r.top + 'px';
    fx.appendChild(f); setTimeout(() => f.remove(), 1300);
  }

  /* ---------- player input ---------- */
  const pick = (cands, msg, cancel, inModal) => new Promise(resolve => { prompt = { ids: new Set(cands.map(c => c.uid)), msg, resolve, cancel, modal: inModal ? cands : null }; render(); });
  const human = {
    async chooseTributes(cands, n) {
      const out = []; let pool = [...cands];
      while (out.length < n) { const c = await pick(pool, t('pickTribute', n - out.length), true); if (!c) return null; out.push(c); pool = pool.filter(x => x !== c); }
      return out;
    },
    chooseTarget: (cands, why) => pick(cands, t('pick_' + why), false, why === 'revive'),
    confirmTrap: (card, ctx) => new Promise(resolve => { prompt = { confirm: true, card, msg: t(ctx.attacker ? 'trapAskAttack' : 'trapAskSummon', cname(ctx.attacker || ctx.card), cname(card)), resolve }; render(); }),
    chooseDiscard: hand => pick(hand, t('pickDiscard'), false)
  };
  function answer(v) { const r = prompt.resolve; prompt = null; render(); r(v); }

  async function run(fn) {
    if (busy || !G || G.over) return;
    busy = true; render();
    try { await fn(); } finally { busy = false; if (sel && G && !['hand', 'm', 'st'].includes(G.where(sel))) sel = null; render(); }
  }
  async function aiTurn() { const g = G; await ai.takeTurn(() => g === G ? sleep(mode === 'tutorial' ? 900 : 650) : Promise.reject(new Error('stopped'))).catch(() => { }); }

  function newGame(m) {
    mode = m; screen = 'game'; sel = null; prompt = null; modal = null; busy = false; log = [];
    goals = m === 'tutorial' ? {} : null;
    let decks, first = 0, lv = level;
    if (m === 'tutorial') {
      lv = 0;
      decks = ['you', 'opp'].map(k => { const rest = SD.buildDeck(); for (const id of SD.TUTORIAL[k]) rest.splice(rest.indexOf(id), 1); return [...SD.shuffle(rest), ...[...SD.TUTORIAL[k]].reverse()]; });
    } else { decks = [SD.shuffle(SD.buildDeck()), SD.shuffle(SD.buildDeck())]; first = Math.random() < .5 ? 0 : 1; }
    const ctrl = [human]; appear.clear(); G = new SD.Game({ decks, ctrl, first, onEvent, onAnim });
    ai = SD.AI(G, 1, lv); ctrl.push(ai);
    G.start();
    if (G.turn === 1) run(aiTurn);
  }

  const acts = {
    lang() { lang = lang === 'ar' ? 'en' : 'ar'; store.set('sd-lang', lang); },
    lvl0() { level = 0; store.set('sd-level', 0); }, lvl1() { level = 1; store.set('sd-level', 1); },
    tutorial() { newGame('tutorial'); }, duel() { newGame('duel'); }, again() { newGame(mode); },
    lib() { screen = 'lib'; }, menu() { if (prompt) prompt = null; G = null; screen = 'menu'; },
    gy0() { modal = { title: t('gyOf', t('you')), cards: G.P[0].gy }; }, gy1() { modal = { title: t('gyOf', t('opp')), cards: G.P[1].gy }; },
    closeModal() { modal = null; },
    cancel() { answer(null); }, yes() { answer(true); }, no() { answer(false); },
    summon() { const c = sel; run(() => G.summon(0, c, 'atk')); }, setm() { const c = sel; run(() => G.summon(0, c, 'set')); },
    activate() { const c = sel; run(() => G.playSpell(0, c)); }, setst() { const c = sel; run(async () => G.setCard(0, c)); },
    flip() { const c = sel; run(() => G.flipSummon(0, c)); }, pos() { const c = sel; run(async () => G.changePos(0, c)); },
    attack() { const a = sel; run(async () => { let tg = null; if (G.mons(1).length) { tg = await pick(G.mons(1), t('pickTarget'), true); if (!tg) return; } await G.attack(0, a, tg); }); },
    next() { run(async () => G.nextPhase(0)); },
    end() { run(async () => { sel = null; await G.endTurn(0); if (!G.over) await aiTurn(); }); }
  };

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'), cEl = e.target.closest('.card[data-uid]');
    if (b && !(cEl && b.classList.contains('modal'))) {
      const a = b.dataset.act;
      if (a === 'closeModal' && b.classList.contains('modal') && e.target !== b) return;
      if (a.startsWith('f-')) libFilter = a.slice(2); else if (acts[a]) acts[a]();
      render(); return;
    }
    if (!cEl || screen !== 'game') return;
    const c = findCard(cEl.dataset.uid); if (!c || !c.owner && c.owner !== 0) return;
    if (prompt && prompt.ids) { if (prompt.ids.has(c.uid)) answer(c); return; }
    if (prompt) return;
    if (c.owner === 1 && (c.faceDown || G.where(c) === 'hand')) return;
    sel = sel === c ? null : c; if (sel && goals && G.where(c) === 'hand') mark('read');
    render();
  });

  function render() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t('title');
    const y = window.scrollY;
    app.style.setProperty('--t', -Math.round(performance.now()) + 'ms'); /* keeps looping art in phase across re-renders */
    app.innerHTML = screen === 'menu' ? menuHTML() : screen === 'lib' ? libHTML() : gameHTML();
    window.scrollTo(0, y);
  }
  render();
})();
