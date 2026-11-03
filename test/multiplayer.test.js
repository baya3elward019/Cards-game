const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { WebSocket } = require('ws');
const { createServer } = require('../server');

async function setup(t) {
  const service = createServer();
  service.server.listen(0, '127.0.0.1'); await once(service.server, 'listening');
  const clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); for (const ws of service.wss.clients) ws.terminate(); await new Promise(r => service.wss.close(r)); await new Promise(r => service.server.close(r)); });
  async function client() {
    const ws = new WebSocket(`ws://127.0.0.1:${service.server.address().port}/ws`), messages = [], waiters = [];
    ws.on('message', data => {
      const m = JSON.parse(data), index = waiters.findIndex(w => w.match(m));
      if (index >= 0) { const w = waiters.splice(index, 1)[0]; clearTimeout(w.timer); w.resolve(m); } else messages.push(m);
    });
    await once(ws, 'open');
    const c = { ws, send: m => ws.send(JSON.stringify(m)), next(type, predicate = () => true) {
      const match = m => m.type === type && predicate(m), index = messages.findIndex(match);
      if (index >= 0) return Promise.resolve(messages.splice(index, 1)[0]);
      return new Promise((resolve, reject) => { const w = { match, resolve }; w.timer = setTimeout(() => reject(Error('No message: ' + type)), 3000); waiters.push(w); });
    } };
    clients.push(c); return c;
  }
  const a = await client(); a.send({ type: 'create', deck: 'eclipse' }); const joined = await a.next('joined');
  const b = await client(); b.send({ type: 'join', deck: 'starter', code: joined.code.toLowerCase() }); await b.next('joined');
  const sa = (await a.next('state')).state, sb = (await b.next('state')).state;
  return { ...service, a, b, sa, sb, joined, client, room: service.rooms.get(joined.code) };
}

test('rooms synchronize both perspectives, hide cards, and reject outsiders and illegal actions', async t => {
  const { a, b, sa, sb, joined, client, room } = await setup(t);
  assert.match(joined.code, /^[A-Z0-9]{6}$/);
  assert.equal(sa.turn, 1 - sb.turn);
  for (const state of [sa, sb]) {
    assert.equal(state.P[0].hand.length, 5);
    assert.ok(state.P[0].hand.every(c => c.id && c.owner === 0));
    assert.ok(state.P[1].hand.every(c => !('id' in c) && c.owner === 1));
    assert.ok(state.P.every(p => p.deck.every(c => !('id' in c))));
  }
  const third = await client(); third.send({ type: 'join', deck: 'starter', code: joined.code }); assert.equal((await third.next('error')).code, 'full');
  third.send({ type: 'resume', code: joined.code, token: 'forged' }); assert.equal((await third.next('error')).code, 'expired');
  const active = sa.turn === 0 ? a : b, idle = active === a ? b : a;
  idle.send({ type: 'action', action: 'end' }); assert.equal((await idle.next('error')).code, 'invalid');
  active.send({ type: 'action', action: 'summon', uid: room.game.P[1 - room.game.turn].hand[0].uid }); assert.equal((await active.next('error')).code, 'invalid');
  active.send({ type: 'action', action: 'end' });
  const next = await idle.next('state', m => m.state.turnCount === 2); assert.equal(next.state.turn, 0); assert.equal(next.state.P[0].hand.length, 6);
});

test('trap decisions are private, validated, and resolve through the server', async t => {
  const { a, b, room, SD } = await setup(t), g = room.game;
  const p = g.turn, active = p === 0 ? a : b, defender = p === 0 ? b : a;
  const attacker = g.P[p].hand[0]; attacker.id = 'emberFox'; g.P[p].hand.shift(); g.P[p].m[0] = attacker;
  const trap = g.P[1 - p].hand[0]; trap.id = 'sanctuaryVeil'; g.P[1 - p].hand.shift(); g.P[1 - p].st[0] = trap; trap.faceDown = true; trap.setTurn = 0;
  g.turnCount = 3; g.phase = 'battle';
  active.send({ type: 'action', action: 'direct', uid: attacker.uid });
  const question = await defender.next('prompt'); assert.equal(question.kind, 'trap');
  const during = await active.next('state', m => m.state.busy); assert.equal(during.state.P[1].st[0].id, undefined);
  active.send({ type: 'answer', id: question.id, value: true }); assert.equal((await active.next('error')).code, 'invalid');
  defender.send({ type: 'answer', id: question.id, value: 'true' }); assert.equal((await defender.next('error')).code, 'invalid');
  defender.send({ type: 'answer', id: question.id, value: true });
  const after = await defender.next('state', m => !m.state.busy); assert.equal(after.state.P[0].lp, SD.START_LP + 500); assert.equal(after.state.P[0].gy.at(-1).id, 'sanctuaryVeil');
});

test('reconnect restores the same hand without giving a third seat', async t => {
  const { a, b, room, joined, client } = await setup(t);
  const original = room.game.P[0].hand.map(c => c.uid);
  a.ws.close(); await once(a.ws, 'close');
  await b.next('state', m => !m.state.opponentConnected);
  const restored = await client(); restored.send({ type: 'resume', code: joined.code, token: joined.token }); await restored.next('joined');
  const state = (await restored.next('state')).state;
  assert.deepEqual(state.P[0].hand.map(c => c.uid), [...original]); assert.equal(room.players.length, 2);
});

test('a pending trap survives refresh and rejects a replayed answer', async t => {
  const { a, b, room, joined, client } = await setup(t), g = room.game;
  g.turn = 1; g.turnCount = 3; g.phase = 'battle';
  const attacker = g.P[1].hand.shift(); attacker.id = 'emberFox'; g.P[1].m[0] = attacker;
  const trap = g.P[0].hand.shift(); trap.id = 'gravitySnare'; trap.faceDown = true; trap.setTurn = 1; g.P[0].st[0] = trap;
  b.send({ type: 'action', action: 'direct', uid: attacker.uid });
  const original = await a.next('prompt');
  a.ws.close(); await once(a.ws, 'close'); await b.next('state', m => !m.state.opponentConnected);
  const restored = await client(); restored.send({ type: 'resume', code: joined.code, token: joined.token });
  const pending = await restored.next('prompt'); assert.equal(pending.id, original.id);
  restored.send({ type: 'answer', id: pending.id, value: true });
  const done = await restored.next('state', m => !m.state.busy); assert.equal(done.state.P[1].m[0].pos, 'def');
  restored.send({ type: 'answer', id: pending.id, value: true }); assert.equal((await restored.next('error')).code, 'invalid');
});

test('all six decks contain 40 valid cards; new traps and ownership checks follow rules', async () => {
  const { SD, server, wss } = createServer(); wss.close(); server.close();
  assert.equal(Object.keys(SD.DECKS).length, 6);
  for (const key of Object.keys(SD.DECKS)) { const deck = SD.buildDeck(key); assert.equal(deck.length, 40, key); assert.ok(deck.every(id => SD.CARDS[id])); }
  const ctrl = [0, 1].map(() => ({ confirmTrap: () => true, chooseTarget: cs => cs[0], chooseTributes: (cs, n) => cs.slice(0, n), chooseDiscard: cs => cs[0] }));
  const g = new SD.Game({ decks: [SD.buildDeck('eclipse'), SD.buildDeck('eclipse')], ctrl }); g.start();
  const a = g.P[0].hand[0]; a.id = 'skyMantis'; g.P[0].hand.shift(); g.P[0].m[0] = a;
  const trap = g.P[1].hand[0]; trap.id = 'gravitySnare'; g.P[1].hand.shift(); g.P[1].st[0] = trap; trap.faceDown = true; trap.setTurn = 1;
  g.turnCount = 3; g.phase = 'battle';
  assert.equal(g.canAttack(1, a), false);
  await g.attack(0, a, null); assert.equal(a.pos, 'def'); assert.equal(g.P[1].lp, 8000);
  g.phase = 'main1'; assert.equal(g.canSummon(0, g.P[1].hand[0]), false);
});
