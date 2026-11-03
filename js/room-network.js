/* MQTT is only a relay. The room creator runs the rules and sends private views.
   Room traffic is AES-GCM encrypted with a key derived from a random invitation code. */
(function () {
  const SD = window.SD;
  const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  const randomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
  SD.RoomSocket = class {
    constructor() {
      this.readyState = 0; this.clients = []; this.seq = 0; this.lastSeq = 0; this.seen = new Set();
      this.sendQueue = Promise.resolve(); this.receiveQueue = Promise.resolve(); this.startedAt = Date.now();
      queueMicrotask(() => { if (this.readyState !== 3) { this.readyState = 1; this.onopen?.(); } });
    }
    emit(message) { if (this.readyState !== 3) this.onmessage?.({ data: JSON.stringify(message) }); }
    async send(raw) {
      const m = JSON.parse(raw);
      if (!this.request) { this.request = m; try { await this.open(m); } catch { this.emit({ type: 'error', code: 'unavailable' }); this.close(); } return; }
      if (this.host) { if (this.room) await this.room.handle(0, m); return; }
      this.outbox = { ...m, requestId: crypto.randomUUID() };
      this.publish('up', { cid: this.cid, command: this.outbox });
    }
    async open(m) {
      if (!window.mqtt || !crypto.subtle) throw Error('unsupported');
      this.host = m.type === 'create'; this.code = this.host ? randomCode() : String(m.code).trim().toUpperCase();
      if (!/^[A-Z2-9]{10}$/.test(this.code)) throw Error('invalid code');
      this.cid = m.type === 'resume' ? m.token : crypto.randomUUID();
      this.deck = m.deck;
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode('sigil-duel-v2:' + this.code)));
      this.key = await crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
      const topicHash = await crypto.subtle.digest('SHA-256', digest);
      this.topic = 'sigil-duel/v2/' + hex(new Uint8Array(topicHash)) + '/';
      if (this.readyState === 3) return;
      const subscription = this.topic + (this.host ? 'up' : 'dn/' + this.cid);
      for (const url of BROKERS) {
        const c = window.mqtt.connect(url, { clientId: 'sd_' + crypto.randomUUID(), clean: true, keepalive: 20, connectTimeout: 9000, reconnectPeriod: 2500, queueQoSZero: false });
        this.clients.push(c);
        c.on('connect', () => c.subscribe(subscription, { qos: 1 }, error => {
          if (error || this.readyState === 3) return;
          c.subscribed = true;
          if (this.host && !this.announced) {
            this.announced = true; this.emit({ type: 'joined', code: this.code, host: true }); this.emit({ type: 'waiting', code: this.code });
          }
          this.tick();
        }));
        c.on('close', () => { c.subscribed = false; });
        c.on('error', () => {});
        c.on('message', (topic, bytes) => {
          if (topic !== subscription || bytes.length > 150000) return;
          this.receiveQueue = this.receiveQueue.then(async () => {
            if (this.readyState === 3) return;
            const data = JSON.parse(bytes.toString());
            const iv = Uint8Array.from(atob(data.iv), c => c.charCodeAt(0));
            const body = Uint8Array.from(atob(data.body), c => c.charCodeAt(0));
            const packet = JSON.parse(decoder.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, this.key, body)));
            if (this.host) this.hostMessage(packet); else this.guestMessage(packet);
          }).catch(() => {});
        });
      }
      this.timer = setInterval(() => this.tick(), 3000);
    }
    publish(suffix, packet) {
      this.sendQueue = this.sendQueue.then(async () => {
        if (this.readyState === 3) return;
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const body = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, encoder.encode(JSON.stringify(packet))));
        const payload = JSON.stringify({ iv: btoa(String.fromCharCode(...iv)), body: btoa(String.fromCharCode(...body)) });
        for (const c of this.clients) if (c.connected && c.subscribed) c.publish(this.topic + suffix, payload, { qos: 0, retain: false });
      }).catch(() => {});
    }
    tick() {
      if (this.readyState === 3) return;
      const now = Date.now(), connected = this.clients.some(c => c.connected && c.subscribed);
      if (!connected && now - this.startedAt > 20000 && !this.announced) { this.emit({ type: 'error', code: 'unavailable' }); this.close(); return; }
      if (!this.host) {
        if (connected) {
          this.publish('up', { cid: this.cid, hello: true, deck: this.deck, resume: this.request.type === 'resume' });
          if (this.outbox) this.publish('up', { cid: this.cid, command: this.outbox });
        }
        const elapsed = now - (this.lastHost || this.startedAt);
        if (elapsed > 15000 && this.announced && !this.hostAway) { this.hostAway = true; this.emit({ type: 'connection', status: 'reconnecting' }); }
        if (elapsed > (this.announced ? 60000 : 25000)) { this.emit({ type: 'error', code: this.announced || this.request.type === 'resume' ? 'expired' : 'notFound' }); this.close(); }
      } else if (this.room) {
        const away = !connected || now - this.lastGuest > 15000;
        if (away !== !!this.guestAway) { this.guestAway = away; this.room.setConnected(1, !away); }
        if (now - this.lastGuest > 60000 && !this.expired) { this.expired = true; this.room.expire(1); }
      }
    }
    hostMessage(packet) {
      if (!packet || typeof packet.cid !== 'string' || !/^[a-f0-9-]{36}$/.test(packet.cid)) return;
      const cid = packet.cid;
      if (packet.hello && !this.guest) {
        if (packet.resume) { this.publish('dn/' + cid, { error: 'expired' }); return; }
        if (!Object.hasOwn(SD.DECKS, packet.deck)) return;
        this.guest = cid; this.lastGuest = Date.now();
        this.room = SD.createHostedRoom([this.deck, packet.deck], (p, messages) => {
          if (!p) { for (const message of messages) this.emit(message); }
          else {
            if (messages.every(m => m.type === 'error') && this.latest) messages = [...this.latest.messages.filter(m => m.type !== 'error'), ...messages];
            this.latest = { seq: ++this.seq, messages }; this.publish('dn/' + this.guest, this.latest);
          }
        });
        this.room.start();
      }
      if (cid !== this.guest) { if (packet.hello) this.publish('dn/' + cid, { error: 'full' }); return; }
      if (this.expired) { this.publish('dn/' + cid, { error: 'expired' }); return; }
      this.lastGuest = Date.now();
      if (this.guestAway) { this.guestAway = false; this.room.setConnected(1, true); }
      if (packet.hello) { if (this.latest) this.publish('dn/' + cid, this.latest); return; }
      const m = packet.command;
      if (!m || typeof m.requestId !== 'string') return;
      this.publish('dn/' + cid, { ack: m.requestId });
      if (this.seen.has(m.requestId)) { if (this.latest) this.publish('dn/' + cid, this.latest); return; }
      this.seen.add(m.requestId);
      // Bound memory while retaining far more requests than a normal duel needs.
      if (this.seen.size > 10000) { this.expired = true; this.room.expire(1); return; }
      this.room.handle(1, m);
    }
    guestMessage(packet) {
      if (!packet || this.readyState === 3) return;
      this.lastHost = Date.now();
      if (this.hostAway) { this.hostAway = false; this.emit({ type: 'connection', status: 'connected' }); }
      if (packet.error) { this.emit({ type: 'error', code: packet.error }); this.close(); return; }
      if (packet.ack) { if (this.outbox?.requestId === packet.ack) this.outbox = null; return; }
      if (!Array.isArray(packet.messages) || !Number.isSafeInteger(packet.seq)) return;
      if (!this.announced) { this.announced = true; this.emit({ type: 'joined', code: this.code, token: this.cid, host: false }); }
      if (packet.seq <= this.lastSeq) return;
      this.lastSeq = packet.seq;
      for (const m of packet.messages) this.emit(m);
    }
    close() {
      this.readyState = 3; clearInterval(this.timer); this.room?.close();
      for (const c of this.clients) c.end(true);
    }
  };
})();
