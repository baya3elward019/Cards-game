/* Computer opponent. level 0 = easy (monsters only), 1 = normal (spells, traps, tributes). */
(function () {
  const SD = window.SD;
  SD.AI = function (G, p, level) {
    const me = () => G.P[p], foe = 1 - p, D = SD.def;
    const threat = () => Math.max(0, ...G.mons(foe).filter(c => !c.faceDown && c.pos === 'atk').map(c => G.atkOf(c)));
    const best = (a, f) => a.reduce((x, y) => f(y) > f(x) ? y : x);

    function wantSpell(c) {
      const op = D(c).fx.op;
      if (op === 'draw' || op === 'burn' || op === 'destroyST') return true;
      if (op === 'heal') return me().lp < SD.START_LP;
      if (op === 'destroyMonster') return G.mons(foe).some(x => !x.faceDown && G.atkOf(x) >= 1500);
      if (op === 'revive') return me().gy.some(x => D(x).kind === 'monster' && D(x).atk >= 1500);
      if (op === 'equip') return G.mons(p).some(x => !x.faceDown && x.pos === 'atk');
      return false;
    }
    async function spells(wait) {
      for (let guard = 0; guard < 10 && !G.over; guard++) {
        const c = me().hand.find(c => D(c).kind === 'spell' && G.canActivate(p, c) && wantSpell(c));
        if (!c) return; await G.playSpell(p, c); await wait();
      }
    }
    async function summon(wait) {
      const opts = me().hand.filter(c => G.canSummon(p, c)).filter(c => {
        const need = SD.tributes(D(c)); if (!need) return true; if (!level) return false;
        const fodder = [...G.mons(p)].sort((a, b) => G.atkOf(a) - G.atkOf(b)).slice(0, need);
        return fodder.every(f => G.atkOf(f) < D(c).atk - 300);
      });
      if (!opts.length) return;
      const c = best(opts, c => D(c).atk), d = D(c), th = threat();
      const set = (d.fx && d.fx.on === 'flip') || (d.atk < th) || (!SD.tributes(d) && d.atk < 1000 && G.mons(foe).length);
      await G.summon(p, c, set ? 'set' : 'atk'); await wait();
    }
    async function positions(wait) {
      const th = threat();
      for (const c of G.mons(p)) {
        if (G.over || c.summonedTurn >= G.turnCount) continue;
        const d = D(c), a = G.atkOf(c);
        if (c.faceDown) { if ((d.fx && d.fx.on === 'flip' && G.mons(foe).length && level) || a > th && a >= 1400) { await G.flipSummon(p, c); await wait(); } }
        else if (c.pos === 'atk' && a < th) { if (G.changePos(p, c)) await wait(); }
        else if (c.pos === 'def' && a >= th && a >= 1400) { if (G.changePos(p, c)) await wait(); }
      }
    }
    async function battle(wait) {
      if (!G.nextPhase(p)) return;
      const order = G.mons(p).filter(c => G.canAttack(p, c)).sort((a, b) => G.atkOf(b) - G.atkOf(a));
      for (const a of order) {
        if (G.over || G.phase !== 'battle' || !G.canAttack(p, a)) continue;
        const A = G.atkOf(a), foes = G.mons(foe); let t = null, go = !foes.length;
        if (foes.length) {
          const beat = foes.filter(f => !f.faceDown && (f.pos === 'atk' ? G.atkOf(f) < A : D(f).def < A));
          if (beat.length) { t = best(beat, f => (f.pos === 'atk' ? 5000 : 0) + G.atkOf(f)); go = true; }
          else { const fd = foes.find(f => f.faceDown); if (fd && A >= (level ? 1600 : 1900)) { t = fd; go = true; } }
        }
        if (go) { await wait(); await G.attack(p, a, t); await wait(); }
      }
    }
    return {
      chooseTributes: (cands, n) => [...cands].sort((a, b) => G.atkOf(a) - G.atkOf(b)).slice(0, n),
      chooseTarget(cands, why) {
        if (why === 'destroyMonster') { const up = cands.filter(c => !c.faceDown); return up.length ? best(up, c => G.atkOf(c)) : cands[0]; }
        if (why === 'destroyST') return cands.find(c => c.faceDown) || cands[0];
        if (why === 'equip') { const atk = cands.filter(c => c.pos === 'atk'); return best(atk.length ? atk : cands, c => G.atkOf(c)); }
        return best(cands, c => D(c).atk || 0);
      },
      confirmTrap: () => true,
      chooseDiscard: hand => best(hand, c => -(D(c).kind === 'monster' ? D(c).atk : 2000)),
      async takeTurn(wait) {
        await wait();
        if (level) await spells(wait);
        if (!G.over) await summon(wait);
        if (level && !G.over) await spells(wait);
        if (level) for (const c of [...me().hand]) if (D(c).kind === 'trap' && G.setCard(p, c)) await wait();
        if (!G.over) await positions(wait);
        if (!G.over) await battle(wait);
        if (!G.over) await G.endTurn(p);
      }
    };
  };
})();
