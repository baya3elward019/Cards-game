/* Card art, drawn in code (no image files).
   Monsters: hand-built SVG creatures made of animated parts. Spells and traps: a seal generated from the card id.
   Colour classes: m1 main, m2 dark, m3 light, gl glow, wh white, dk black, st outline.
   Motion classes: a-bob a-flap a-blink a-flick a-pulse a-sway a-spin a-rise a-wave a-peek (see css/style.css). */
(function () {
  const SD = window.SD;
  function rng(str) {
    let h = 2166136261;
    for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    return () => ((h = (Math.imul(h, 1664525) + 1013904223) >>> 0) / 4294967296);
  }
  const pt = (r, a) => [(50 + r * Math.cos(a)).toFixed(1), (50 + r * Math.sin(a)).toFixed(1)];
  function seal(seed, color) {
    const r = rng(seed), n = 3 + Math.floor(r() * 6), step = 1 + Math.floor(r() * Math.max(1, Math.floor((n - 1) / 2)));
    const rot = r() * Math.PI, inner = 12 + r() * 12, m = 3 + Math.floor(r() * 4), rays = r() > .5;
    let s = `<circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="39" stroke-dasharray="${(2 + r() * 6).toFixed(1)} ${(2 + r() * 5).toFixed(1)}"/>`;
    for (let i = 0; i < n; i++) {
      const a = pt(39, rot + i * 2 * Math.PI / n), b = pt(39, rot + (i + step) * 2 * Math.PI / n);
      s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/><circle cx="${a[0]}" cy="${a[1]}" r="3" fill="${color}"/>`;
      if (rays) { const c = pt(inner, rot + i * 2 * Math.PI / n); s += `<line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" stroke-width="1.2"/>`; }
    }
    s += `<polygon points="${Array.from({ length: m }, (_, i) => pt(inner, -rot + i * 2 * Math.PI / m).join(',')).join(' ')}"/>`;
    s += `<circle cx="50" cy="50" r="${(3 + r() * 4).toFixed(1)}" fill="${color}"/>`;
    return `<g fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${s}</g>`;
  }
  /* draw a part on the left, get it on both sides */
  const both = s => s + `<g transform="translate(100 0) scale(-1 1)">${s}</g>`;
  const eyes = (x1, x2, y, r) => `<g class="a-blink"><circle class="dk" cx="${x1}" cy="${y}" r="${r}"/><circle class="dk" cx="${x2}" cy="${y}" r="${r}"/></g>`;
  const spark = (x, y, r, d, cls = 'gl') => `<circle class="${cls} a-rise" style="--d:${d}s" cx="${x}" cy="${y}" r="${r}"/>`;

  SD.MONSTER_ART = {
    emberFox: `<path class="m1 a-sway" d="M62 78C84 80 90 58 78 44C82 58 74 66 60 68Z"/><path class="gl a-flick" d="M78 42C73 50 78 57 83 52C85 48 81 46 78 42Z"/>
      <ellipse class="m1" cx="48" cy="72" rx="16" ry="15"/><ellipse class="wh" cx="48" cy="77" rx="8" ry="9"/>
      <path class="m1" d="M32 44L34 20L46 34ZM64 44L62 20L50 34Z"/><path class="m2" d="M35 38L36 27L42 34ZM61 38L60 27L54 34Z"/>
      <path class="m1" d="M30 44Q48 26 66 44Q62 62 48 66Q34 62 30 44Z"/><path class="wh" d="M38 52Q48 50 58 52Q54 64 48 66Q42 64 38 52Z"/>
      <circle class="dk" cx="48" cy="60" r="2.2"/>${eyes(40, 56, 46, 2.6)}${spark(22, 70, 1.6, 0)}${spark(76, 34, 1.3, -1.2)}`,
    graniteSentinel: `<g class="a-sway" style="--d:-1s"><rect class="m2" x="16" y="42" width="13" height="30" rx="5"/></g><g class="a-sway"><rect class="m2" x="71" y="42" width="13" height="30" rx="5"/></g>
      <rect class="m2" x="35" y="72" width="12" height="16" rx="3"/><rect class="m2" x="53" y="72" width="12" height="16" rx="3"/>
      <rect class="m1" x="29" y="36" width="42" height="40" rx="7"/><path class="sk" d="M38 44L46 54L42 64M60 42L56 50M62 62L58 70"/>
      <rect class="m1" x="38" y="18" width="24" height="20" rx="5"/><rect class="gl a-pulse" x="43" y="26" width="14" height="4" rx="2"/>
      <circle class="m3" cx="34" cy="41" r="3"/><circle class="m3" cx="66" cy="41" r="3"/><circle class="gl a-pulse" style="--d:-.8s" cx="50" cy="58" r="4.5"/>`,
    tideDancer: `<path class="st a-wave" d="M6 88Q16 82 26 88T46 88T66 88T86 88T106 88"/><g class="a-sway">
      <path class="m1" d="M50 38C40 50 36 68 28 84Q50 74 72 84C64 68 60 50 50 38Z"/><path class="m3" d="M50 46C46 58 46 70 44 80Q50 78 56 80C54 70 54 58 50 46Z"/>
      <path class="st" style="stroke-width:3" d="M46 44Q30 36 26 22M54 44Q70 36 74 22"/><circle class="m3" cx="50" cy="30" r="8"/>
      <path class="m1" d="M42 28Q50 14 62 26Q68 34 66 42Q62 32 56 28Q48 24 42 28Z"/>${eyes(47, 53, 31, 1.2)}</g>
      ${spark(24, 62, 2, 0, 'm3')}${spark(78, 68, 1.6, -1, 'm3')}${spark(70, 40, 1.2, -1.8, 'm3')}`,
    galeLancer: `<path class="m3" d="M18 88L80 18L84 10L87 20L81 22L21 91Z"/>
      ${both('<path class="m1 a-flap" d="M44 50L10 34L20 52L12 58L24 64L18 72L44 66Z"/>')}
      <ellipse class="m2" cx="50" cy="60" rx="10" ry="17"/><path class="m3" d="M44 54H56L54 70H46Z"/>
      <circle class="m1" cx="50" cy="36" r="9"/><path class="m3" d="M50 26L54 12L57 27Z"/><path class="gl" d="M48 38L59 40L48 43Z"/>${eyes(46, 54, 34, 1.6)}`,
    lanternWisp: `<g opacity=".22"><circle class="gl a-pulse" cx="50" cy="54" r="32"/></g><path class="st" d="M50 8V18"/><rect class="m2" x="38" y="18" width="24" height="6" rx="2"/>
      <path class="st" d="M38 24Q24 54 38 82M62 24Q76 54 62 82"/><rect class="m2" x="36" y="80" width="28" height="6" rx="2"/>
      <path class="m3 a-flick" d="M50 30C62 44 64 56 58 66Q50 76 42 66C36 56 38 44 50 30Z"/><path class="gl a-flick" style="--d:-.2s" d="M50 44C56 52 56 60 53 65Q50 69 47 65C44 60 44 52 50 44Z"/>
      ${eyes(46, 54, 60, 1.8)}${spark(30, 40, 1.3, -.6)}${spark(70, 50, 1.3, -1.6)}`,
    duskBlade: `<g class="a-sway" style="--d:-1s"><rect class="wh" x="70" y="8" width="5" height="52" rx="2"/><rect class="m3" x="63" y="58" width="19" height="4" rx="2"/><rect class="m2" x="71" y="62" width="3" height="11"/></g>
      <path class="m2" d="M48 26L74 88H22Z"/><path class="m1" d="M48 34L62 88H34Z"/><path class="m2" d="M34 36Q48 10 62 36Q56 46 48 46Q40 46 34 36Z"/>
      <ellipse class="dk" cx="48" cy="36" rx="8" ry="7"/><g class="a-pulse"><path class="gl" d="M42 35L47 36L42 38ZM54 35L49 36L54 38Z"/></g>${spark(28, 70, 1.4, -.4, 'm3')}`,
    mossTurtle: `<ellipse class="m2" cx="28" cy="75" rx="8" ry="7"/><ellipse class="m2" cx="64" cy="75" rx="8" ry="7"/><path class="m2" d="M14 66L5 70L14 73Z"/>
      <g class="a-peek"><ellipse class="m3" cx="82" cy="60" rx="10" ry="8"/><circle class="dk a-blink" cx="85" cy="58" r="1.8"/><path class="sk" d="M85 64H91"/></g>
      <path class="m1" d="M12 70Q14 30 46 28Q78 30 80 70Z"/><path class="m2" d="M36 40L46 36L56 40V52L46 56L36 52Z"/>
      <path class="m2" d="M20 54L30 52L34 62L26 68L18 64ZM62 52L72 54L74 64L66 68L58 62Z"/>
      <circle class="mg" cx="30" cy="36" r="5"/><circle class="mg" cx="38" cy="30" r="4"/><circle class="mg" cx="60" cy="33" r="5"/><circle class="mg" cx="52" cy="29" r="3"/>
      <rect class="m2" x="10" y="68" width="72" height="5" rx="2.5"/>`,
    scrollKeeper: `<path class="m2" d="M34 30L30 14L44 26ZM66 30L70 14L56 26Z"/><ellipse class="m1" cx="50" cy="52" rx="22" ry="28"/><ellipse class="m3" cx="50" cy="62" rx="13" ry="16"/>
      ${both('<path class="m2 a-flap" style="transform-origin:100% 0" d="M28 44Q16 60 26 76Q32 62 30 46Z"/>')}
      <circle class="wh" cx="41" cy="40" r="8"/><circle class="wh" cx="59" cy="40" r="8"/>${eyes(41, 59, 40, 3.5)}<path class="gl" d="M47 46H53L50 53Z"/>
      <rect class="wh" x="30" y="74" width="40" height="12" rx="2"/><circle class="m2" cx="30" cy="80" r="6"/><circle class="m2" cx="70" cy="80" r="6"/><path class="sk" d="M40 78H60M40 82H54"/>`,
    rustMoth: `${both('<g class="a-flap"><path class="m1" d="M46 46C30 14 4 26 14 50C18 58 34 58 46 52Z"/><circle class="m3" cx="24" cy="38" r="5"/><circle class="dk" cx="24" cy="38" r="2"/></g><path class="m2 a-flap" style="--d:-.2s" d="M46 54C28 58 18 72 30 82C40 86 46 70 46 60Z"/>')}
      <path class="st" d="M48 34Q44 22 36 18M52 34Q56 22 64 18"/><ellipse class="m2" cx="50" cy="54" rx="5" ry="18"/><path class="sk" d="M46 50H54M46 58H54M47 66H53"/>
      <circle class="m3" cx="50" cy="36" r="5"/><circle class="dk" cx="48" cy="35" r="1.2"/><circle class="dk" cx="52" cy="35" r="1.2"/>${spark(20, 78, 1.2, -.5, 'm3')}${spark(82, 70, 1.2, -1.5, 'm3')}`,
    mirrorLurker: `<path class="m3" d="M50 4L57 13L50 11L43 13Z"/><ellipse class="m1" cx="50" cy="48" rx="28" ry="36"/><ellipse class="dk" cx="50" cy="48" rx="22" ry="30"/>
      <g class="a-peek"><g class="a-blink"><path class="gl" d="M37 44Q43 37 49 44Q43 49 37 44ZM51 44Q57 37 63 44Q57 49 51 44Z"/></g><circle class="dk" cx="43" cy="44" r="1.7"/><circle class="dk" cx="57" cy="44" r="1.7"/>
      <path class="m3" d="M40 58L44 54L48 58L52 54L56 58L60 54L58 63Q50 69 42 63Z"/></g>
      <path class="shine a-wave" d="M34 28L42 24L36 62L30 58Z"/>
      ${both('<path class="m2" d="M28 80q2.5-9 5 0q2.5-9 5 0q2.5-9 5 0v6h-15Z"/>')}<rect class="m2" x="44" y="84" width="12" height="9" rx="2"/>`,
    cinderHound: `<path class="m1 a-flick" d="M22 50C14 34 26 30 24 16C36 24 34 34 40 30C40 20 50 16 50 6C56 18 62 20 60 30C68 32 66 22 76 16C74 30 86 34 78 50Z"/>
      <path class="gl a-flick" style="--d:-.25s" d="M30 50C26 40 32 36 32 28C40 32 40 38 44 36C44 28 50 24 50 18C54 26 58 28 56 36C62 38 62 32 68 28C68 36 74 40 70 50Z"/>
      <path class="m2" d="M30 46L26 26L42 40ZM70 46L74 26L58 40Z"/><path class="m2" d="M28 48Q50 30 72 48Q72 66 60 76Q50 84 40 76Q28 66 28 48Z"/>
      <path class="m1" d="M40 62Q50 56 60 62Q60 74 50 80Q40 74 40 62Z"/><path class="dk" d="M46 62H54L50 67Z"/><path class="wh" d="M43 72L45 79L47 73ZM57 72L55 79L53 73Z"/>
      <g class="a-pulse"><path class="gl" d="M34 52L44 54L36 58ZM66 52L56 54L64 58Z"/></g>${spark(20, 78, 1.5, 0)}${spark(82, 72, 1.3, -1.1)}`,
    stormWyvern: `${both('<g class="a-flap"><path class="m1" d="M44 44L8 16L12 36L4 40L14 50L8 58L22 60L20 70L44 58Z"/><path class="sk" d="M44 46L12 36M44 50L14 50M44 54L22 60"/></g>')}
      <path class="st" style="stroke-width:4" d="M50 70Q54 86 68 88L73 83"/><path class="m2" d="M42 44Q50 36 58 44L56 72Q50 78 44 72Z"/><path class="m3" d="M46 48H54L53 70H47Z"/>
      <path class="m1" d="M40 30Q50 18 60 30L56 44Q50 48 44 44Z"/><path class="m3" d="M42 26L36 12L46 22ZM58 26L64 12L54 22Z"/>
      <g class="a-blink"><path class="gl" d="M43 32L48 34L43 36ZM57 32L52 34L57 36Z"/></g><path class="gl a-pulse" style="--d:-.7s" d="M80 60L72 74H78L74 90L88 70H81L85 60Z"/>`,
    deepColossus: `<path class="st a-sway" style="stroke-width:5" d="M24 84Q8 66 16 46Q20 38 26 42"/><path class="st a-sway" style="stroke-width:5;--d:-1.5s" d="M76 84Q92 66 84 46Q80 38 74 42"/>
      <path class="m1" d="M22 90Q20 28 50 26Q80 28 78 90Z"/><path class="m2" d="M30 90Q30 62 50 62Q70 62 70 90Z"/>
      <circle class="m2" cx="32" cy="46" r="4"/><circle class="m2" cx="69" cy="42" r="3"/><circle class="m2" cx="60" cy="32" r="2"/>
      <circle class="dk" cx="50" cy="46" r="11"/><circle class="gl a-pulse" cx="50" cy="46" r="7.5"/><ellipse class="dk" cx="50" cy="46" rx="2" ry="6"/>
      <path class="st" style="stroke-width:2" d="M41 70V80M47 68V82M53 68V82M59 70V80"/>
      <path class="wv a-wave" d="M-6 90Q4 82 14 90T34 90T54 90T74 90T94 90T114 90V104H-6Z"/>${spark(20, 30, 1.6, 0, 'm3')}${spark(84, 26, 1.3, -1.3, 'm3')}`,
    dawnSeraph: `<g class="a-spin" opacity=".3"><path class="gl" d="M50 50L46 2H54ZM50 50L98 46V54ZM50 50L54 98H46ZM50 50L2 54V46ZM50 50L82 14L88 20ZM50 50L86 82L80 88ZM50 50L18 86L12 80ZM50 50L14 18L20 12Z"/></g>
      ${both('<path class="wh a-flap" d="M44 42C30 20 12 16 6 22C12 26 10 32 16 34C12 38 18 44 24 44C22 50 34 52 44 50Z"/><path class="m3 a-flap" style="--d:-.4s;transform-origin:100% 0" d="M44 54C30 56 18 66 16 80C24 76 26 82 32 76C34 80 42 72 44 62Z"/>')}
      <path class="m1" d="M50 34C42 46 40 70 36 90H64C60 70 58 46 50 34Z"/><path class="gl" d="M46 50H54L55 58H45Z"/><circle class="m3" cx="50" cy="28" r="7"/>
      <ellipse class="hl a-pulse" cx="50" cy="16" rx="9" ry="3"/><path class="sk" d="M46 28q1.5 1.5 3 0M51 28q1.5 1.5 3 0"/>`,
    voidTyrant: `<circle class="dk" cx="50" cy="44" r="34"/><circle class="st a-pulse" cx="50" cy="44" r="34"/>
      <g class="a-spin" style="animation-duration:7s"><circle class="gl" cx="50" cy="8" r="2.6"/><circle class="m3" cx="88" cy="66" r="2"/><circle class="m3" cx="12" cy="66" r="2"/></g>
      <path class="m2" d="M18 94L28 56Q50 44 72 56L82 94Z"/><path class="m1" d="M34 94L40 60Q50 56 60 60L66 94Z"/><path class="m1" d="M28 58L12 42L34 52ZM72 58L88 42L66 52Z"/>
      <path class="m3" d="M38 36Q26 30 28 10Q36 24 44 28ZM62 36Q74 30 72 10Q64 24 56 28Z"/><path class="m2" d="M36 38Q50 22 64 38L60 56Q50 64 40 56Z"/>
      <g class="a-pulse"><path class="gl" d="M40 42L47 44L41 47ZM60 42L53 44L59 47Z"/><ellipse class="gl" cx="50" cy="35" rx="1.6" ry="3.2"/></g><path class="sk" d="M45 54H55"/>
      <circle class="gl a-pulse" style="--d:-1s" cx="50" cy="72" r="3"/>`
  };

  SD.art = function (id, color) {
    const mon = SD.MONSTER_ART[id];
    if (!mon) return `<svg viewBox="0 0 100 100" class="mon" aria-hidden="true"><g class="a-spin">${seal(id, color)}</g></svg>`;
    return `<svg viewBox="0 0 100 100" class="mon" aria-hidden="true"><g class="a-spin" opacity=".2">${seal(id, color)}</g><g class="a-bob">${mon}</g></svg>`;
  };
  SD.backArt = `<svg viewBox="0 0 100 140" fill="none" stroke="#d1ad62" stroke-width="2" aria-hidden="true"><rect x="7" y="7" width="86" height="126" rx="6"/><rect x="12" y="12" width="76" height="116" rx="4" stroke-width="1" stroke-dasharray="2 3"/><circle cx="50" cy="70" r="30"/><circle cx="50" cy="70" r="22" stroke-dasharray="3 4"/><polygon points="50,44 72.5,83 27.5,83"/><polygon points="50,96 27.5,57 72.5,57"/><circle cx="50" cy="70" r="5" fill="#d1ad62"/></svg>`;
})();
