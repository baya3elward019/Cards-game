const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');

// Three independent in-memory brokers duplicate every delivery, like overlapping
// public relays/QoS redelivery. Real WebCrypto encrypts/decrypts every packet.
function relay() {
  const clients = [], wire = [];
  return { clients, wire, connect(url) {
    const c = new EventEmitter(); c.url = url; c.connected = false;
    c.subscribe = (topic, options, cb) => { c.topic = topic; queueMicrotask(() => cb(null)); };
    c.publish = (topic, body) => {
      wire.push({ topic, body });
      for (const peer of clients) if (peer.connected && peer.url === url && peer.topic === topic) {
        for (let i = 0; i < 2; i++) queueMicrotask(() => peer.emit('message', topic, Buffer.from(body)));
      }
    };
    c.end = () => { c.connected = false; c.emit('close'); };
    clients.push(c); queueMicrotask(() => { c.connected = true; c.emit('connect'); }); return c;
  } };
}
function page(bus) {
  const context = vm.createContext({ window: { mqtt: bus }, crypto, TextEncoder, TextDecoder, Uint8Array, Uint32Array, btoa, atob, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask });
  for (const name of ['cards', 'engine', 'host-room', 'room-network']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/', name + '.js'), 'utf8'), context);
  return context.window.SD;
}
function client(SD, request) {
  const socket = new SD.RoomSocket(), messages = [];
  socket.onmessage = e => messages.push(JSON.parse(e.data));
  socket.onopen = () => socket.send(JSON.stringify(request));
  return { socket, messages, send: m => socket.send(JSON.stringify(m)) };
}
async function until(fn) {
  const end = Date.now() + 3000;
  while (Date.now() < end) { const value = fn(); if (value) return value; await new Promise(r => setTimeout(r, 5)); }
  throw Error('Timed out waiting for relay');
}
const latest = (c, type) => c.messages.filter(m => m.type === type).at(-1);
async function pair(t) {
  const bus = relay(), host = client(page(bus), { type: 'create', deck: 'eclipse' });
  t.after(() => host.socket.close());
  const joined = await until(() => latest(host, 'joined'));
  const guest = client(page(bus), { type: 'join', code: joined.code, deck: 'starter' }); t.after(() => guest.socket.close());
  await until(() => latest(guest, 'state'));
  return { bus, host, guest, code: joined.code };
}

test('static rooms encrypt traffic, hide opponent cards and synchronize despite duplicate relays', async t => {
  const { bus, host, guest, code } = await pair(t);
  assert.match(code, /^[A-Z2-9]{10}$/);
  const h = latest(host, 'state').state, g = latest(guest, 'state').state;
  assert.equal(h.turn, 1 - g.turn);
  assert.ok(g.P[1].hand.every(c => !c.id)); assert.ok(g.P.every(p => p.deck.every(c => !c.id)));
  assert.ok(bus.wire.every(p => !p.body.includes('emberFox') && !p.body.includes('state') && !p.topic.includes(code)));
  const active = h.turn === 0 ? host : guest;
  await active.send({ type: 'action', action: 'end' });
  await until(() => latest(guest, 'state').state.turnCount === 2);
  assert.equal(latest(host, 'state').state.turnCount, 2);
  assert.equal(latest(guest, 'state').state.P[g.turn === 0 ? 1 : 0].hand.length, 6);
});

test('only two seats are admitted; guest refresh resumes and retains pending state', async t => {
  const { bus, host, guest, code } = await pair(t);
  const third = client(page(bus), { type: 'join', code, deck: 'wild' }); t.after(() => third.socket.close());
  assert.equal((await until(() => latest(third, 'error'))).code, 'full');
  const token = latest(guest, 'joined').token, hand = latest(guest, 'state').state.P[0].hand;
  guest.socket.close();
  const resumed = client(page(bus), { type: 'resume', code, token }); t.after(() => resumed.socket.close());
  const restored = (await until(() => latest(resumed, 'state'))).state;
  assert.deepEqual(restored.P[0].hand, hand);
  const wrongTurn = restored.turn === 0 ? host : resumed;
  await wrongTurn.send({ type: 'action', action: 'end' });
  assert.equal((await until(() => latest(wrongTurn, 'error'))).code, 'invalid');
});

test('host room validates and resumes multi-step trap decisions without leaking hidden cards', async t => {
  const SD = page(relay()), messages = [[], []];
  // Fixed top cards make a real set-trap -> end-turn -> summon -> attack sequence.
  SD.shuffle = a => a;
  SD.DECKS.fixture = { list: [['emberFox', 35], ['ward', 5]] };
  const room = SD.createHostedRoom(['fixture', 'fixture'], (p, batch) => messages[p].push(...JSON.parse(JSON.stringify(batch))));
  t.after(() => room.close()); room.start();
  const first = room.snapshot(0).turn === 0 ? 0 : 1, second = 1 - first;
  const trap = room.snapshot(first).P[0].hand[0];
  await room.handle(first, { type: 'action', action: 'setst', uid: trap.uid });
  assert.equal(room.snapshot(second).P[1].st[0].id, undefined);
  await room.handle(first, { type: 'action', action: 'end' });
  const monster = room.snapshot(second).P[0].hand.find(c => c.id === 'emberFox');
  await room.handle(second, { type: 'action', action: 'summon', uid: monster.uid });
  await room.handle(second, { type: 'action', action: 'next' });
  const attack = room.handle(second, { type: 'action', action: 'direct', uid: monster.uid });
  const q = messages[first].find(m => m.type === 'prompt'); assert.equal(q.kind, 'trap');
  room.setConnected(first, false); room.setConnected(first, true);
  assert.equal(messages[first].filter(m => m.type === 'prompt').at(-1).id, q.id);
  await room.handle(second, { type: 'answer', id: q.id, value: true }); assert.equal(messages[second].at(-1).code, 'invalid');
  await room.handle(first, { type: 'answer', id: q.id, value: true }); await attack;
  assert.equal(room.snapshot(first).P[0].lp, 8000); assert.equal(room.snapshot(second).P[0].m[0], null);
});
