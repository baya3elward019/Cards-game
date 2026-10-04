/* Card database — add or edit cards here.
   kind: monster | spell | trap
   Monsters: lvl (1-4 no tribute, 5-6 one tribute, 7+ two), atk, def, attr, optional fx {on, op, n}
   Spells:   sub normal|equip, fx {op, n}
   Traps:    trigger attack|summon, fx {op} */
(function () {
const SD = window.SD = window.SD || {};
SD.ATTR = {
  fire:  { c: '#e0603a', ar: 'نار',  en: 'Fire' },
  water: { c: '#3f8fd6', ar: 'ماء',  en: 'Water' },
  earth: { c: '#9a7b3f', ar: 'أرض',  en: 'Earth' },
  wind:  { c: '#4fae6b', ar: 'ريح',  en: 'Wind' },
  light: { c: '#d9b23c', ar: 'نور',  en: 'Light' },
  dark:  { c: '#8a5fc7', ar: 'ظلام', en: 'Dark' }
};
SD.KIND_COLOR = { spell: '#23a394', trap: '#c8405c' };

const M = (lvl, atk, def, attr, name, text, fx) => ({ kind: 'monster', lvl, atk, def, attr, name, text, fx });
const S = (sub, fx, name, text) => ({ kind: 'spell', sub, fx, name, text });
const T = (trigger, fx, name, text, min) => ({ kind: 'trap', trigger, fx, name, text, min: min || 0 });

SD.CARDS = {
  emberFox: M(3, 1400, 800, 'fire', { ar: 'ثعلب الجمر', en: 'Ember Fox' },
    { ar: 'يترك أثراً من الشرر أينما ركض.', en: 'Leaves a trail of sparks wherever it runs.' }),
  graniteSentinel: M(4, 1300, 2000, 'earth', { ar: 'حارس الجرانيت', en: 'Granite Sentinel' },
    { ar: 'جدار حيّ. ضعه في الدفاع ودعه يصمد.', en: 'A living wall. Put it in defense and let it hold.' }),
  tideDancer: M(4, 1700, 1000, 'water', { ar: 'راقصة المدّ', en: 'Tide Dancer' },
    { ar: 'تضرب مع كل موجة.', en: 'She strikes with every wave.' }),
  galeLancer: M(4, 1800, 600, 'wind', { ar: 'رمّاح العاصفة', en: 'Gale Lancer' },
    { ar: 'هجوم سريع ودفاع هشّ.', en: 'Fast on the attack, brittle on defense.' }),
  lanternWisp: M(2, 800, 1200, 'light', { ar: 'طيف القنديل', en: 'Lantern Wisp' },
    { ar: 'ضوء صغير يصلح كتضحية.', en: 'A small light. Good tribute material.' }),
  duskBlade: M(4, 1900, 400, 'dark', { ar: 'نصل الغسق', en: 'Dusk Blade' },
    { ar: 'أقوى وحوش المستوى 4 هجوماً، وأضعفها دفاعاً.', en: 'The hardest hitter at level 4, and the weakest defender.' }),
  mossTurtle: M(3, 900, 1900, 'earth', { ar: 'سلحفاة الطحلب', en: 'Moss Turtle' },
    { ar: 'صدفة قديمة يصعب كسرها.', en: 'An old shell that is hard to crack.' }),
  scrollKeeper: M(3, 1200, 1000, 'light', { ar: 'حافظ اللفائف', en: 'Scroll Keeper' },
    { ar: 'عند استدعائه مكشوفاً: اسحب ورقة واحدة.', en: 'When summoned face-up: draw 1 card.' },
    { on: 'summon', op: 'draw', n: 1 }),
  rustMoth: M(3, 1000, 1000, 'wind', { ar: 'عثّة الصدأ', en: 'Rust Moth' },
    { ar: 'عند استدعائها مكشوفة: دمّر ورقة سحر أو فخ للخصم.', en: 'When summoned face-up: destroy 1 of your opponent\'s spell or trap cards.' },
    { on: 'summon', op: 'destroyST' }),
  mirrorLurker: M(2, 600, 1500, 'dark', { ar: 'متربّص المرايا', en: 'Mirror Lurker' },
    { ar: 'عند قلبه مكشوفاً: دمّر وحشاً واحداً للخصم.', en: 'When flipped face-up: destroy 1 of your opponent\'s monsters.' },
    { on: 'flip', op: 'destroyMonster' }),
  cinderHound: M(4, 1500, 900, 'fire', { ar: 'كلب الرماد', en: 'Cinder Hound' },
    { ar: 'عند تدميره في معركة: الخصم يخسر 500 نقطة.', en: 'When destroyed by battle: your opponent loses 500 LP.' },
    { on: 'destroyed', op: 'burn', n: 500 }),
  stormWyvern: M(5, 2300, 1600, 'wind', { ar: 'تنّين قمة العاصفة', en: 'Stormcrest Wyvern' },
    { ar: 'يحتاج تضحية واحدة.', en: 'Needs 1 tribute.' }),
  deepColossus: M(6, 2400, 2200, 'water', { ar: 'عملاق الأعماق', en: 'Deepsea Colossus' },
    { ar: 'يحتاج تضحية واحدة.', en: 'Needs 1 tribute.' }),
  dawnSeraph: M(7, 2700, 2100, 'light', { ar: 'ملاك الفجر', en: 'Dawn Seraph' },
    { ar: 'يحتاج تضحيتين. عند استدعائه: تكسب 1000 نقطة.', en: 'Needs 2 tributes. When summoned: gain 1000 LP.' },
    { on: 'summon', op: 'heal', n: 1000 }),
  voidTyrant: M(8, 3000, 2500, 'dark', { ar: 'طاغية الفراغ', en: 'Void Tyrant' },
    { ar: 'يحتاج تضحيتين. لا شيء في هذه المجموعة أقوى منه.', en: 'Needs 2 tributes. Nothing in this set hits harder.' }),

  kindle: S('normal', { op: 'draw', n: 2 }, { ar: 'ومضة بصيرة', en: 'Kindle Insight' },
    { ar: 'اسحب ورقتين.', en: 'Draw 2 cards.' }),
  shatter: S('normal', { op: 'destroyMonster' }, { ar: 'صاعقة التحطيم', en: 'Shatter Bolt' },
    { ar: 'دمّر وحشاً واحداً للخصم.', en: 'Destroy 1 of your opponent\'s monsters.' }),
  gust: S('normal', { op: 'destroyST' }, { ar: 'ريح التطهير', en: 'Cleansing Gust' },
    { ar: 'دمّر ورقة سحر أو فخ للخصم.', en: 'Destroy 1 of your opponent\'s spell or trap cards.' }),
  mend: S('normal', { op: 'heal', n: 1000 }, { ar: 'نور الشفاء', en: 'Mending Light' },
    { ar: 'تكسب 1000 نقطة حياة.', en: 'Gain 1000 LP.' }),
  recall: S('normal', { op: 'revive' }, { ar: 'طقس العودة', en: 'Recall Rite' },
    { ar: 'استدعِ وحشاً من مقبرتك في وضع الهجوم.', en: 'Summon 1 monster from your graveyard in attack position.' }),
  whet: S('equip', { op: 'equip', atk: 500 }, { ar: 'حجر الشحذ', en: 'Whetstone' },
    { ar: 'جهّز به وحشاً مكشوفاً لك: يكسب 500 هجوم.', en: 'Equip to one of your face-up monsters: it gains 500 ATK.' }),
  scorch: S('normal', { op: 'burn', n: 600 }, { ar: 'لفحة', en: 'Scorch' },
    { ar: 'الخصم يخسر 600 نقطة حياة.', en: 'Your opponent loses 600 LP.' }),

  ward: T('attack', { op: 'negateDestroy' }, { ar: 'درع المرآة', en: 'Mirror Ward' },
    { ar: 'عندما يهاجم وحش الخصم: ألغِ الهجوم ودمّر ذلك الوحش.', en: 'When an opponent\'s monster attacks: cancel the attack and destroy that monster.' }),
  still: T('attack', { op: 'endBattle' }, { ar: 'سكون الريح', en: 'Still Air' },
    { ar: 'عندما يهاجم وحش الخصم: ألغِ الهجوم وأنهِ مرحلة المعركة.', en: 'When an opponent\'s monster attacks: cancel the attack and end the battle phase.' }),
  pit: T('summon', { op: 'destroySummoned' }, { ar: 'ختم الهاوية', en: 'Pitfall Seal' },
    { ar: 'عندما يستدعي الخصم وحشاً هجومه 1500 أو أكثر: دمّره.', en: 'When your opponent summons a monster with 1500 or more ATK: destroy it.' }, 1500)
};

/* The 40-card deck both players use: [card id, copies] */
SD.DECKLIST = [
  ['emberFox', 2], ['graniteSentinel', 2], ['tideDancer', 2], ['galeLancer', 2], ['duskBlade', 2], ['mossTurtle', 2],
  ['lanternWisp', 1], ['scrollKeeper', 2], ['rustMoth', 1], ['mirrorLurker', 2], ['cinderHound', 2],
  ['stormWyvern', 1], ['deepColossus', 1], ['dawnSeraph', 1], ['voidTyrant', 1],
  ['kindle', 2], ['shatter', 2], ['gust', 2], ['mend', 1], ['recall', 1], ['whet', 2], ['scorch', 1],
  ['ward', 2], ['still', 1], ['pit', 2]
];
SD.buildDeck = () => SD.DECKLIST.flatMap(([id, n]) => Array(n).fill(id));

/* Tutorial: the first cards each side draws, in order */
SD.TUTORIAL = {
  you: ['galeLancer', 'mossTurtle', 'kindle', 'ward', 'stormWyvern', 'whet', 'emberFox', 'shatter', 'mirrorLurker', 'tideDancer'],
  opp: ['emberFox', 'graniteSentinel', 'tideDancer', 'duskBlade', 'mossTurtle', 'cinderHound', 'galeLancer', 'lanternWisp']
};
})();
