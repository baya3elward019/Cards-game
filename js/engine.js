/* Rules engine. No DOM here: the UI and the AI both drive the game through these methods. */
(function () {
  const SD = window.SD;
  let UID = 0;
  const mk = (id, owner) => ({ uid: ++UID, id, owner, pos: 'atk', faceDown: false, summonedTurn: -1, changedPos: false, attacked: false, attacks: 0, mod: 0, tmp: 0, setTurn: -1, equippedTo: null });
  SD.def = c => SD.CARDS[c.id];
  SD.shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  SD.tributes = d => d.lvl >= 7 ? 2 : d.lvl >= 5 ? 1 : 0;
  SD.START_LP = 8000; SD.HAND_LIMIT = 6;

  SD.Game = class {
    /* o.decks: two arrays of card ids, LAST element is the top of the deck */
    constructor(o) {
      this.P = [0, 1].map(p => ({ lp: SD.START_LP, deck: o.decks[p].map(id => mk(id, p)), hand: [], gy: [], m: Array(5).fill(null), st: Array(5).fill(null) }));
      this.ctrl = o.ctrl; this.onEvent = o.onEvent || (() => { }); this.onAnim = o.onAnim || (() => null);
      this.turn = o.first || 0; this.turnCount = 0; this.phase = 'draw'; this.normalUsed = false; this.over = false; this.winner = null;
    }
    emit(type, d) { this.onEvent(type, d || {}); }
    start() { for (const p of [0, 1]) for (let i = 0; i < 5; i++) this.P[p].hand.push(this.P[p].deck.pop()); this.startTurn(); }
    mons(p) { return this.P[p].m.filter(Boolean); }
    sts(p) { return this.P[p].st.filter(Boolean); }
    free(p, z) { return this.P[p][z].indexOf(null); }
    isMain(p) { return !this.over && this.turn === p && (this.phase === 'main1' || this.phase === 'main2'); }
    where(c) { const P = this.P[c.owner]; return P.hand.includes(c) ? 'hand' : P.m.includes(c) ? 'm' : P.st.includes(c) ? 'st' : P.gy.includes(c) ? 'gy' : 'deck'; }
    onField(c) { const w = this.where(c); return w === 'm' || w === 'st'; }
    /* base ATK + permanent change (mod) + until-end-of-turn change (tmp) + equips + auras */
    atkOf(c) {
      let a = SD.def(c).atk + (c.mod || 0) + (c.tmp || 0); const P = this.P[c.owner];
      if (P.m.includes(c)) {
        for (const s of P.st) if (s && !s.faceDown) { const f = SD.def(s).fx; if (s.equippedTo === c.uid) a += f.atk; else if (f.op === 'aura') a += f.atk; }
        for (const m of P.m) if (m && m !== c && !m.faceDown) { const f = SD.def(m).fx; if (f && f.aura) a += f.aura; }
      }
      return Math.max(0, a);
    }

    startTurn() {
      this.turnCount++; this.phase = 'draw'; this.normalUsed = false;
      for (const c of this.mons(this.turn)) { c.changedPos = false; c.attacked = false; c.attacks = 0; }
      this.emit('turn', { p: this.turn });
      if (this.turnCount > 1) this.draw(this.turn, 1);
      if (this.over) return;
      this.phase = 'main1'; this.emit('phase', { phase: 'main1' });
    }
    draw(p, n) {
      for (let i = 0; i < n; i++) {
        if (!this.P[p].deck.length) { this.end(1 - p, 'deckout'); return; }
        const c = this.P[p].deck.pop(); this.P[p].hand.push(c); this.emit('draw', { p, card: c });
      }
    }
    damage(p, n) { if (this.over) return; this.P[p].lp = Math.max(0, this.P[p].lp - n); this.emit('lp', { p, delta: -n }); if (!this.P[p].lp) this.end(1 - p, 'lp'); }
    end(winner, reason) { if (this.over) return; this.over = true; this.winner = winner; this.emit('over', { winner, reason }); }

    toGY(c) {
      const P = this.P[c.owner], wasMon = P.m.includes(c);
      let i = P.hand.indexOf(c); if (i >= 0) P.hand.splice(i, 1);
      i = P.m.indexOf(c); if (i >= 0) P.m[i] = null;
      i = P.st.indexOf(c); if (i >= 0) P.st[i] = null;
      if (wasMon) for (const s of [...P.st]) if (s && s.equippedTo === c.uid) this.toGY(s);
      Object.assign(c, { pos: 'atk', faceDown: false, equippedTo: null, changedPos: false, attacked: false, attacks: 0, mod: 0, tmp: 0 });
      P.gy.push(c);
    }
    toHand(c) { /* return a monster on the field to its owner's hand */
      if (this.where(c) !== 'm') return; const P = this.P[c.owner];
      this.emit('bounce', { card: c }); P.m[P.m.indexOf(c)] = null;
      for (const s of [...P.st]) if (s && s.equippedTo === c.uid) this.toGY(s);
      Object.assign(c, { pos: 'atk', faceDown: false, changedPos: false, attacked: false, attacks: 0, mod: 0, tmp: 0 }); P.hand.push(c);
    }
    destroy(c) { if (!this.onField(c)) return; this.emit('destroy', { card: c }); this.toGY(c); }

    canSummon(p, c) {
      const d = SD.def(c); if (d.kind !== 'monster' || !this.isMain(p) || this.normalUsed || this.where(c) !== 'hand') return false;
      const need = SD.tributes(d); return need ? this.mons(p).length >= need : this.free(p, 'm') >= 0;
    }
    async summon(p, c, mode) {
      if (!this.canSummon(p, c)) return false;
      const need = SD.tributes(SD.def(c));
      if (need) {
        const picks = await this.ctrl[p].chooseTributes(this.mons(p), need, c);
        if (!picks) return false;
        for (const t of picks) { this.emit('tribute', { p, card: t }); this.toGY(t); }
      }
      const P = this.P[p]; P.hand.splice(P.hand.indexOf(c), 1); P.m[this.free(p, 'm')] = c;
      c.pos = mode === 'set' ? 'def' : 'atk'; c.faceDown = mode === 'set'; c.summonedTurn = this.turnCount; this.normalUsed = true;
      this.emit('summon', { p, card: c, mode, tribute: need });
      if (mode !== 'set') await this.afterSummon(p, c);
      return true;
    }
    async afterSummon(p, c) {
      await this.trapWindow(1 - p, 'summon', { card: c });
      const fx = SD.def(c).fx;
      if (!this.over && this.onField(c) && fx && fx.on === 'summon') await this.runFx(fx, p, c);
    }
    async flipSummon(p, c) {
      if (!this.isMain(p) || this.where(c) !== 'm' || !c.faceDown || c.summonedTurn >= this.turnCount) return false;
      c.faceDown = false; c.pos = 'atk'; c.changedPos = true; this.emit('flip', { p, card: c });
      const fx = SD.def(c).fx; if (fx && fx.on === 'flip') await this.runFx(fx, p, c);
      return true;
    }
    canChangePos(p, c) { return this.isMain(p) && this.where(c) === 'm' && !c.faceDown && !c.changedPos && !c.attacked && c.summonedTurn < this.turnCount; }
    changePos(p, c) { if (!this.canChangePos(p, c)) return false; c.pos = c.pos === 'atk' ? 'def' : 'atk'; c.changedPos = true; this.emit('pos', { p, card: c }); return true; }

    canActivate(p, c) {
      const d = SD.def(c); if (d.kind !== 'spell' || !this.isMain(p)) return false;
      const w = this.where(c);
      if (w === 'hand') { if (this.free(p, 'st') < 0) return false; } else if (!(w === 'st' && c.faceDown)) return false;
      switch (d.fx.op) {
        case 'destroyMonster': return this.mons(1 - p).length > 0;
        case 'destroyST': return this.sts(1 - p).length > 0;
        case 'revive': return this.P[p].gy.some(x => SD.def(x).kind === 'monster') && this.free(p, 'm') >= 0;
        case 'equip': case 'buffAll': return this.mons(p).some(x => !x.faceDown);
        case 'weaken': case 'shrink': return this.mons(1 - p).some(x => !x.faceDown);
        case 'toDef': return this.mons(1 - p).some(x => !x.faceDown && x.pos === 'atk');
        case 'bounce': case 'burnPer': return this.mons(1 - p).length > 0;
        case 'wipeMon': return this.mons(0).length + this.mons(1).length > 0;
        case 'wipeST': return this.sts(0).concat(this.sts(1)).some(x => x !== c);
        case 'cycle': return this.P[p].hand.some(x => x !== c);
        default: return true;
      }
    }
    async playSpell(p, c) {
      if (!this.canActivate(p, c)) return false;
      const P = this.P[p];
      if (this.where(c) === 'hand') { P.hand.splice(P.hand.indexOf(c), 1); P.st[this.free(p, 'st')] = c; }
      c.faceDown = false; this.emit('spell', { p, card: c });
      const ctx = { card: c, spell: true }; await this.trapWindow(1 - p, 'spell', ctx);
      if (ctx.negated) { if (this.onField(c)) this.toGY(c); this.emit('resolved', { p, card: c }); return true; }
      const stays = await this.runFx(SD.def(c).fx, p, c) && SD.def(c).sub !== 'normal';
      if (!stays && this.onField(c)) this.toGY(c);
      this.emit('resolved', { p, card: c });
      return true;
    }
    canSet(p, c) { return SD.def(c).kind !== 'monster' && this.isMain(p) && this.where(c) === 'hand' && this.free(p, 'st') >= 0; }
    setCard(p, c) {
      if (!this.canSet(p, c)) return false;
      const P = this.P[p]; P.hand.splice(P.hand.indexOf(c), 1); P.st[this.free(p, 'st')] = c;
      c.faceDown = true; c.setTurn = this.turnCount; this.emit('set', { p, card: c }); return true;
    }

    /* Returns true when the effect resolved */
    async runFx(fx, p, src) {
      const pick = (cands, why) => this.ctrl[p].chooseTarget(cands, why, src);
      switch (fx.op) {
        case 'draw': this.draw(p, fx.n); return true;
        case 'heal': this.P[p].lp += fx.n; this.emit('lp', { p, delta: fx.n }); return true;
        case 'burn': this.damage(1 - p, fx.n); return true;
        case 'destroyMonster': { const c = this.mons(1 - p); if (!c.length) return false; this.destroy(await pick(c, 'destroyMonster')); return true; }
        case 'destroyST': { const c = this.sts(1 - p); if (!c.length) return false; this.destroy(await pick(c, 'destroyST')); return true; }
        case 'revive': {
          const c = this.P[p].gy.filter(x => SD.def(x).kind === 'monster'); if (!c.length || this.free(p, 'm') < 0) return false;
          const t = await pick(c, 'revive'), P = this.P[p];
          P.gy.splice(P.gy.indexOf(t), 1); P.m[this.free(p, 'm')] = t; t.pos = 'atk'; t.faceDown = false; t.summonedTurn = this.turnCount;
          this.emit('summon', { p, card: t, mode: 'atk', special: true });
          await this.afterSummon(p, t); return true;
        }
        case 'weaken': case 'shrink': {
          const c = this.mons(1 - p).filter(x => !x.faceDown); if (!c.length) return false; const t = await pick(c, fx.op);
          if (fx.op === 'weaken') t.mod -= fx.n; else t.tmp -= Math.floor(this.atkOf(t) / 2);
          this.emit('mod', { card: t }); return true;
        }
        case 'weakenAll': for (const t of this.mons(1 - p)) if (!t.faceDown) t.mod -= fx.n; this.emit('mod', {}); return true;
        case 'buffAll': for (const t of this.mons(p)) if (!t.faceDown) t.tmp += fx.n; this.emit('mod', {}); return true;
        case 'gainAtk': src.mod += fx.n; this.emit('mod', { card: src }); return true;
        case 'bounce': { const c = this.mons(1 - p); if (!c.length) return false; this.toHand(await pick(c, 'bounce')); return true; }
        case 'toDef': { const c = this.mons(1 - p).filter(x => !x.faceDown && x.pos === 'atk'); if (!c.length) return false; const t = await pick(c, 'toDef'); t.pos = 'def'; this.emit('pos', { p: 1 - p, card: t }); return true; }
        case 'wipeST': for (const q of [0, 1]) for (const t of this.sts(q)) if (t !== src) this.destroy(t); return true;
        case 'wipeMon': for (const q of [0, 1]) for (const t of this.mons(q)) this.destroy(t); return true;
        case 'cycle': { const h = this.P[p].hand; if (!h.length) return false; const c = await this.ctrl[p].chooseDiscard(h); this.emit('discard', { p, card: c }); this.toGY(c); this.draw(p, 2); return true; }
        case 'burnPer': this.damage(1 - p, fx.n * this.mons(1 - p).length); return true;
        case 'discardOpp': { const h = this.P[1 - p].hand; if (!h.length) return false; const c = h[Math.floor(Math.random() * h.length)]; this.emit('discard', { p: 1 - p, card: c }); this.toGY(c); return true; }
        case 'return': { const P = this.P[p], i = P.gy.indexOf(src); if (i < 0) return false; P.gy.splice(i, 1); P.hand.push(src); this.emit('bounce', { card: src }); return true; }
        case 'aura': return true;
        case 'equip': { const c = this.mons(p).filter(x => !x.faceDown); if (!c.length) return false; const t = await pick(c, 'equip'); src.equippedTo = t.uid; this.emit('equip', { p, card: src, target: t }); return true; }
      }
      return false;
    }

    /* Let player p answer with one set trap. Traps cannot be used on the turn they were set. */
    async trapWindow(p, trigger, ctx) {
      for (const t of [...this.P[p].st]) {
        if (!t || !t.faceDown || t.setTurn >= this.turnCount) continue;
        const d = SD.def(t); if (d.kind !== 'trap' || d.trigger !== trigger) continue;
        if (trigger === 'summon' && this.atkOf(ctx.card) < d.min) continue;
        if (!await this.ctrl[p].confirmTrap(t, ctx)) continue;
        t.faceDown = false; this.emit('trap', { p, card: t });
        if (d.fx.op === 'negateDestroy') { ctx.negated = true; this.destroy(ctx.attacker); }
        else if (d.fx.op === 'endBattle') { ctx.negated = true; ctx.endBattle = true; }
        else if (d.fx.op === 'destroySummoned') this.destroy(ctx.card);
        else if (d.fx.op === 'bounceSummoned') this.toHand(ctx.card);
        else if (d.fx.op === 'weakenAttacker') { ctx.attacker.mod -= d.fx.n; this.emit('mod', { card: ctx.attacker }); }
        else if (d.fx.op === 'reflect') { ctx.negated = true; this.damage(1 - p, Math.floor(this.atkOf(ctx.attacker) / 2)); }
        else if (d.fx.op === 'negateSpell') ctx.negated = true;
        this.toGY(t); this.emit('resolved', { p, card: t });
        return;
      }
    }

    canAttack(p, a) { const f = SD.def(a).fx; return !this.over && this.turn === p && this.phase === 'battle' && this.where(a) === 'm' && !a.faceDown && a.pos === 'atk' && (!a.attacked || !!(f && f.twice) && a.attacks < 2); }
    async battleDestroy(c) {
      const fx = SD.def(c).fx;
      if (fx && fx.guard && c.guardTurn !== this.turnCount) { c.guardTurn = this.turnCount; this.emit('guard', { card: c }); return false; }
      this.destroy(c);
      if (fx && fx.on === 'destroyed' && !this.over) await this.runFx(fx, c.owner, c);
      return true;
    }
    /* t = the defending card, or null for a direct attack */
    async attack(p, a, t) {
      if (!this.canAttack(p, a)) return false;
      const afx = SD.def(a).fx || {};
      if (t ? this.where(t) !== 'm' || t.owner === p : this.mons(1 - p).length && !afx.direct) return false;
      a.attacked = true; a.attacks = (a.attacks || 0) + 1; this.emit('attack', { p, attacker: a, target: t });
      const ctx = { attacker: a, target: t }; await this.trapWindow(1 - p, 'attack', ctx);
      if (ctx.endBattle) { this.phase = 'main2'; this.emit('phase', { phase: 'main2' }); return true; }
      if (ctx.negated || this.over || !this.onField(a)) return true;
      await this.onAnim('attack', { p, attacker: a, target: t }); /* lets the UI play the lunge before damage lands */
      const A = this.atkOf(a);
      if (!t) { this.damage(1 - p, A); return true; }
      let flipped = false, killed = false;
      if (t.faceDown) { t.faceDown = false; flipped = true; this.emit('flip', { p: 1 - p, card: t, byAttack: true }); }
      const tfx = SD.def(t).fx;
      if (t.pos === 'atk') {
        const B = this.atkOf(t);
        if (A > B) { killed = await this.battleDestroy(t); this.damage(1 - p, A - B); }
        else if (A < B) { await this.battleDestroy(a); this.damage(p, B - A); }
        else { await this.battleDestroy(a); await this.battleDestroy(t); }
      } else {
        const D = SD.def(t).def;
        if (A > D) { killed = await this.battleDestroy(t); if (afx.pierce) this.damage(1 - p, A - D); } else if (A < D) this.damage(p, D - A);
      }
      if (killed && afx.on === 'kill' && !this.over && this.onField(a)) await this.runFx(afx, p, a);
      if (flipped && tfx && tfx.on === 'flip' && !this.over) await this.runFx(tfx, t.owner, t);
      return true;
    }

    nextPhase(p) {
      if (this.over || this.turn !== p) return false;
      if (this.phase === 'main1' && this.turnCount > 1) this.phase = 'battle';
      else if (this.phase === 'battle') this.phase = 'main2';
      else return false;
      this.emit('phase', { phase: this.phase }); return true;
    }
    async endTurn(p) {
      if (this.over || this.turn !== p) return false;
      this.phase = 'end'; this.emit('phase', { phase: 'end' });
      const P = this.P[p];
      while (P.hand.length > SD.HAND_LIMIT) { const c = await this.ctrl[p].chooseDiscard(P.hand); this.emit('discard', { p, card: c }); this.toGY(c); }
      for (const q of [0, 1]) for (const c of this.mons(q)) c.tmp = 0;
      this.turn = 1 - p; this.startTurn(); return true;
    }
  };
})();
