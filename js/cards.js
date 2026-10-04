/* Card database — add or edit cards here.
   kind: monster | spell | trap
   Monsters: lvl (1-4 no tribute, 5-6 one tribute, 7+ two), atk, def, attr, optional fx
     fx.on: summon | flip | destroyed (by battle) | kill (destroys a monster by battle) | cont (always on)
     fx.on also: hit (deals direct damage) | end (end of your turn)
     cont abilities: pierce, direct, twice, guard, aura:<atk>, taunt, immune, lifesteal, rage:<atk>, scale:<atk per monster in your graveyard>
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

  magmaBoar: M(4, 1800, 1200, 'fire', { ar: 'خنزير الحمم', en: 'Magma Boar' },
    { ar: 'اختراق: إن هاجم وحشاً في الدفاع وهجومه أعلى، الخصم يخسر الفرق.', en: 'Piercing: when it attacks a defense monster with lower DEF, your opponent loses the difference.' }, { on: 'cont', pierce: true }),
  ashPhoenix: M(6, 2500, 1800, 'fire', { ar: 'عنقاء الرماد', en: 'Ashwing Phoenix' },
    { ar: 'يحتاج تضحية واحدة. عند تدميرها في معركة: تعود إلى يدك.', en: 'Needs 1 tribute. When destroyed by battle: it returns to your hand.' }, { on: 'destroyed', op: 'return' }),
  coralArcher: M(3, 1400, 1400, 'water', { ar: 'رامية المرجان', en: 'Coral Archer' },
    { ar: 'تستطيع مهاجمة نقاط حياة الخصم مباشرة حتى لو عنده وحوش.', en: 'Can attack your opponent\'s life points directly even if they control monsters.' }, { on: 'cont', direct: true }),
  frostSerpent: M(4, 1800, 1300, 'water', { ar: 'أفعى الصقيع', en: 'Frost Serpent' },
    { ar: 'عند استدعائها مكشوفة: وحش مكشوف للخصم يخسر 500 هجوم نهائياً.', en: 'When summoned face-up: 1 face-up opponent monster permanently loses 500 ATK.' }, { on: 'summon', op: 'weaken', n: 500 }),
  tidalLeviathan: M(7, 2800, 2400, 'water', { ar: 'لوياثان المدّ', en: 'Tidal Leviathan' },
    { ar: 'يحتاج تضحيتين. عند استدعائه: أعد وحشاً للخصم إلى يده.', en: 'Needs 2 tributes. When summoned: return 1 opponent monster to their hand.' }, { on: 'summon', op: 'bounce' }),
  thornBear: M(4, 1800, 1500, 'earth', { ar: 'دب الأشواك', en: 'Thorn Bear' },
    { ar: 'كلما دمّر وحشاً في معركة: يكسب 300 هجوم نهائياً.', en: 'Each time it destroys a monster by battle: it permanently gains 300 ATK.' }, { on: 'kill', op: 'gainAtk', n: 300 }),
  crystalBeetle: M(3, 1000, 2100, 'earth', { ar: 'خنفساء البلّور', en: 'Crystal Beetle' },
    { ar: 'مرة في كل دور: لا تُدمَّر في المعركة.', en: 'Once per turn: it is not destroyed by battle.' }, { on: 'cont', guard: true }),
  twinTalon: M(4, 1500, 1000, 'wind', { ar: 'صقر المخلبين', en: 'Twin Talon' },
    { ar: 'يستطيع الهجوم مرتين في مرحلة المعركة.', en: 'Can attack twice each battle phase.' }, { on: 'cont', twice: true }),
  zephyrSprite: M(2, 700, 900, 'wind', { ar: 'جنّية النسيم', en: 'Zephyr Sprite' },
    { ar: 'عند قلبها مكشوفة: أعد وحشاً للخصم إلى يده.', en: 'When flipped face-up: return 1 opponent monster to their hand.' }, { on: 'flip', op: 'bounce' }),
  sunPriest: M(4, 1500, 1600, 'light', { ar: 'كاهن الشمس', en: 'Sun Priest' },
    { ar: 'وحوشك الأخرى تكسب 200 هجوم ما دام مكشوفاً على الساحة.', en: 'Your other monsters gain 200 ATK while this card is face-up on the field.' }, { on: 'cont', aura: 200 }),
  starUnicorn: M(5, 2200, 1800, 'light', { ar: 'حصان النجوم', en: 'Star Unicorn' },
    { ar: 'يحتاج تضحية واحدة. كلما دمّر وحشاً في معركة: تكسب 800 نقطة.', en: 'Needs 1 tribute. Each time it destroys a monster by battle: gain 800 LP.' }, { on: 'kill', op: 'heal', n: 800 }),
  graveRook: M(3, 1300, 1100, 'dark', { ar: 'غراب القبور', en: 'Grave Rook' },
    { ar: 'عند تدميره في معركة: اسحب ورقة.', en: 'When destroyed by battle: draw 1 card.' }, { on: 'destroyed', op: 'draw', n: 1 }),
  nightStalker: M(4, 1600, 800, 'dark', { ar: 'متعقّب الليل', en: 'Night Stalker' },
    { ar: 'عند استدعائه مكشوفاً: الخصم يتخلص من ورقة عشوائية من يده.', en: 'When summoned face-up: your opponent discards 1 random card.' }, { on: 'summon', op: 'discardOpp' }),
  plagueLord: M(6, 2500, 2000, 'dark', { ar: 'سيّد الوباء', en: 'Plague Lord' },
    { ar: 'يحتاج تضحية واحدة. عند استدعائه: كل وحوش الخصم المكشوفة تخسر 300 هجوم نهائياً.', en: 'Needs 1 tribute. When summoned: all face-up opponent monsters permanently lose 300 ATK.' }, { on: 'summon', op: 'weakenAll', n: 300 }),

  lavaTitan: M(7, 2900, 1800, 'fire', { ar: 'جبّار الحمم', en: 'Lava Titan' },
    { ar: 'يحتاج تضحيتين. في نهاية كل دور لك: الخصم يخسر 300 نقطة.', en: 'Needs 2 tributes. At the end of each of your turns: your opponent loses 300 LP.' }, { on: 'end', op: 'burn', n: 300 }),
  salamander: M(3, 1300, 900, 'fire', { ar: 'سمندل الجمر', en: 'Cinder Salamander' },
    { ar: 'عندما يضرب نقاط حياة الخصم مباشرة: اسحب ورقة.', en: 'When it hits your opponent\'s life points directly: draw 1 card.' }, { on: 'hit', op: 'draw', n: 1 }),
  pearlGuardian: M(4, 1200, 2200, 'water', { ar: 'حارسة اللؤلؤ', en: 'Pearl Guardian' },
    { ar: 'استفزاز: ما دامت مكشوفة، وحوش الخصم لا تهاجم غيرها.', en: 'Taunt: while face-up, your opponent\'s monsters can only attack this card.' }, { on: 'cont', taunt: true }),
  mistJelly: M(2, 500, 1600, 'water', { ar: 'قنديل الضباب', en: 'Mist Jelly' },
    { ar: 'عند قلبه مكشوفاً: اسحب ورقتين.', en: 'When flipped face-up: draw 2 cards.' }, { on: 'flip', op: 'draw', n: 2 }),
  hiveQueen: M(5, 2000, 2000, 'earth', { ar: 'ملكة الخلية', en: 'Hive Queen' },
    { ar: 'يحتاج تضحية واحدة. عند استدعائها: استدعِ نحلة جندية (800/800).', en: 'Needs 1 tribute. When summoned: summon a Hive Drone (800/800).' }, { on: 'summon', op: 'token', id: 'drone' }),
  drone: M(1, 800, 800, 'earth', { ar: 'نحلة جندية', en: 'Hive Drone' },
    { ar: 'تستدعيها ملكة الخلية. تصلح للتضحية.', en: 'Summoned by the Hive Queen. Good tribute material.' }),
  boulderRam: M(4, 1700, 1400, 'earth', { ar: 'كبش الصخور', en: 'Boulder Ram' },
    { ar: 'غضب: يكسب 400 هجوم ما دامت نقاط حياتك أقل من الخصم.', en: 'Rage: gains 400 ATK while your life points are lower than your opponent\'s.' }, { on: 'cont', rage: 400 }),
  cloudDjinn: M(4, 1600, 1200, 'wind', { ar: 'مارد الغيم', en: 'Cloud Djinn' },
    { ar: 'لا تدمّره تأثيرات السحر والفخاخ والوحوش. المعركة فقط تدمّره.', en: 'Cannot be destroyed by card effects. Only battle destroys it.' }, { on: 'cont', immune: true }),
  dawnPaladin: M(4, 1700, 1500, 'light', { ar: 'فارس الفجر', en: 'Dawn Paladin' },
    { ar: 'في نهاية كل دور لك: تكسب 300 نقطة حياة.', en: 'At the end of each of your turns: gain 300 LP.' }, { on: 'end', op: 'heal', n: 300 }),
  boneCollector: M(4, 1200, 1200, 'dark', { ar: 'جامع العظام', en: 'Bone Collector' },
    { ar: 'يكسب 200 هجوم عن كل وحش في مقبرتك.', en: 'Gains 200 ATK for each monster in your graveyard.' }, { on: 'cont', scale: 200 }),
  bloodBat: M(4, 1600, 1000, 'dark', { ar: 'خفّاش الدم', en: 'Blood Bat' },
    { ar: 'امتصاص: كل ضرر معركة يسبّبه للخصم تكسبه أنت نقاط حياة.', en: 'Lifesteal: you gain LP equal to the battle damage it deals to your opponent.' }, { on: 'cont', lifesteal: true }),

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

  rally: S('normal', { op: 'buffAll', n: 500 }, { ar: 'نداء الحشد', en: 'Rally Cry' },
    { ar: 'كل وحوشك المكشوفة تكسب 500 هجوم حتى نهاية الدور.', en: 'All your face-up monsters gain 500 ATK until the end of the turn.' }),
  cataclysm: S('normal', { op: 'wipeMon' }, { ar: 'الطوفان', en: 'Cataclysm' },
    { ar: 'دمّر كل الوحوش على الساحة، وحوشك ووحوش الخصم.', en: 'Destroy every monster on the field, yours included.' }),
  stormSweep: S('normal', { op: 'wipeST' }, { ar: 'كنس العاصفة', en: 'Storm Sweep' },
    { ar: 'دمّر كل أوراق السحر والفخ الأخرى على الساحة.', en: 'Destroy every other spell and trap on the field.' }),
  frostBind: S('normal', { op: 'toDef' }, { ar: 'قيد الجليد', en: 'Frost Bind' },
    { ar: 'حوّل وحشاً للخصم في وضع الهجوم إلى وضع الدفاع.', en: 'Switch 1 attack-position opponent monster to defense.' }),
  shrinkHex: S('normal', { op: 'shrink' }, { ar: 'لعنة التقزيم', en: 'Shrink Hex' },
    { ar: 'وحش مكشوف للخصم يخسر نصف هجومه حتى نهاية الدور.', en: '1 face-up opponent monster loses half its ATK until the end of the turn.' }),
  exchange: S('normal', { op: 'cycle' }, { ar: 'مقايضة', en: 'Fair Exchange' },
    { ar: 'تخلص من ورقة من يدك، ثم اسحب ورقتين.', en: 'Discard 1 card, then draw 2.' }),
  emberRain: S('normal', { op: 'burnPer', n: 300 }, { ar: 'مطر الجمر', en: 'Ember Rain' },
    { ar: 'الخصم يخسر 300 نقطة عن كل وحش يتحكم به.', en: 'Your opponent loses 300 LP for each monster they control.' }),
  undertow: S('normal', { op: 'bounce' }, { ar: 'التيار الساحب', en: 'Undertow' },
    { ar: 'أعد وحشاً للخصم إلى يده.', en: 'Return 1 opponent monster to their hand.' }),
  warBanner: S('cont', { op: 'aura', atk: 200 }, { ar: 'راية الحرب', en: 'War Banner' },
    { ar: 'سحر مستمر: يبقى على الساحة، وكل وحوشك تكسب 200 هجوم.', en: 'Continuous spell: stays on the field. All your monsters gain 200 ATK.' }),

  fieldFire: S('field', { op: 'field', attr: 'fire' }, { ar: 'ساحة: المسبك المنصهر', en: 'Arena: Molten Forge' },
    { ar: 'ساحة: كل وحوش النار عند اللاعبَين تكسب 300 هجوم. تستبدل أي ساحة أخرى.', en: 'Arena: every Fire monster on both sides gains 300 ATK. Replaces any other arena.' }),
  fieldWater: S('field', { op: 'field', attr: 'water' }, { ar: 'ساحة: الشعاب الغارقة', en: 'Arena: Sunken Reef' },
    { ar: 'ساحة: كل وحوش الماء عند اللاعبَين تكسب 300 هجوم. تستبدل أي ساحة أخرى.', en: 'Arena: every Water monster on both sides gains 300 ATK. Replaces any other arena.' }),
  fieldEarth: S('field', { op: 'field', attr: 'earth' }, { ar: 'ساحة: الغابة العتيقة', en: 'Arena: Ancient Grove' },
    { ar: 'ساحة: كل وحوش الأرض عند اللاعبَين تكسب 300 هجوم. تستبدل أي ساحة أخرى.', en: 'Arena: every Earth monster on both sides gains 300 ATK. Replaces any other arena.' }),
  fieldWind: S('field', { op: 'field', attr: 'wind' }, { ar: 'ساحة: قمة العواصف', en: 'Arena: Storm Peak' },
    { ar: 'ساحة: كل وحوش الريح عند اللاعبَين تكسب 300 هجوم. تستبدل أي ساحة أخرى.', en: 'Arena: every Wind monster on both sides gains 300 ATK. Replaces any other arena.' }),
  fieldLight: S('field', { op: 'field', attr: 'light' }, { ar: 'ساحة: معبد الفجر', en: 'Arena: Dawn Temple' },
    { ar: 'ساحة: كل وحوش النور عند اللاعبَين تكسب 300 هجوم. تستبدل أي ساحة أخرى.', en: 'Arena: every Light monster on both sides gains 300 ATK. Replaces any other arena.' }),
  fieldDark: S('field', { op: 'field', attr: 'dark' }, { ar: 'ساحة: صدع الفراغ', en: 'Arena: Void Rift' },
    { ar: 'ساحة: كل وحوش الظلام عند اللاعبَين تكسب 300 هجوم. تستبدل أي ساحة أخرى.', en: 'Arena: every Dark monster on both sides gains 300 ATK. Replaces any other arena.' }),

  ward: T('attack', { op: 'negateDestroy' }, { ar: 'درع المرآة', en: 'Mirror Ward' },
    { ar: 'عندما يهاجم وحش الخصم: ألغِ الهجوم ودمّر ذلك الوحش.', en: 'When an opponent\'s monster attacks: cancel the attack and destroy that monster.' }),
  still: T('attack', { op: 'endBattle' }, { ar: 'سكون الريح', en: 'Still Air' },
    { ar: 'عندما يهاجم وحش الخصم: ألغِ الهجوم وأنهِ مرحلة المعركة.', en: 'When an opponent\'s monster attacks: cancel the attack and end the battle phase.' }),
  pit: T('summon', { op: 'destroySummoned' }, { ar: 'ختم الهاوية', en: 'Pitfall Seal' },
    { ar: 'عندما يستدعي الخصم وحشاً هجومه 1500 أو أكثر: دمّره.', en: 'When your opponent summons a monster with 1500 or more ATK: destroy it.' }, 1500),
  thornWall: T('attack', { op: 'weakenAttacker', n: 800 }, { ar: 'جدار الشوك', en: 'Thorn Wall' },
    { ar: 'عندما يهاجم وحش الخصم: يخسر 800 هجوم نهائياً ثم تستمر المعركة.', en: 'When an opponent\'s monster attacks: it permanently loses 800 ATK, then the battle continues.' }),
  reflectPrism: T('attack', { op: 'reflect' }, { ar: 'موشور الارتداد', en: 'Reflect Prism' },
    { ar: 'عندما يهاجم وحش الخصم: ألغِ الهجوم والخصم يخسر نصف هجوم ذلك الوحش.', en: 'When an opponent\'s monster attacks: cancel the attack and your opponent loses half that monster\'s ATK.' }),
  updraft: T('summon', { op: 'bounceSummoned' }, { ar: 'شرك التيار الصاعد', en: 'Updraft Snare' },
    { ar: 'عندما يستدعي الخصم وحشاً هجومه 1000 أو أكثر: أعده إلى يده.', en: 'When your opponent summons a monster with 1000 or more ATK: return it to their hand.' }, 1000),
  counterSeal: T('spell', { op: 'negateSpell' }, { ar: 'ختم الإبطال', en: 'Counter Seal' },
    { ar: 'عندما يفعّل الخصم ورقة سحر: أبطلها ودمّرها.', en: 'When your opponent activates a spell: cancel it and destroy it.' })
};

/* Decks: 40 cards each, written as [card id, copies]. "starter" is also the tutorial deck. */
SD.DECKS = {
  starter: { name: { ar: 'المتوازنة', en: 'Balanced' }, list: [
    ['emberFox', 2], ['graniteSentinel', 2], ['tideDancer', 2], ['galeLancer', 2], ['duskBlade', 2], ['mossTurtle', 2],
    ['lanternWisp', 1], ['scrollKeeper', 2], ['rustMoth', 1], ['mirrorLurker', 2], ['cinderHound', 2],
    ['stormWyvern', 1], ['deepColossus', 1], ['dawnSeraph', 1], ['voidTyrant', 1],
    ['kindle', 2], ['shatter', 2], ['gust', 2], ['mend', 1], ['recall', 1], ['whet', 2], ['scorch', 1],
    ['ward', 2], ['still', 1], ['pit', 2]] },
  ember: { name: { ar: 'لهب وعاصفة', en: 'Flame & Gale' }, list: [
    ['emberFox', 2], ['cinderHound', 2], ['magmaBoar', 2], ['galeLancer', 2], ['twinTalon', 2], ['salamander', 2], ['zephyrSprite', 2],
    ['thornBear', 1], ['cloudDjinn', 1], ['stormWyvern', 2], ['ashPhoenix', 2], ['lavaTitan', 1],
    ['kindle', 2], ['scorch', 2], ['emberRain', 1], ['rally', 2], ['shatter', 1], ['gust', 1], ['whet', 2], ['recall', 1],
    ['ward', 2], ['thornWall', 2], ['pit', 1], ['counterSeal', 1], ['fieldFire', 1]] },
  tide: { name: { ar: 'أعماق وصخر', en: 'Deep & Stone' }, list: [
    ['tideDancer', 2], ['coralArcher', 2], ['frostSerpent', 2], ['graniteSentinel', 2], ['pearlGuardian', 2], ['thornBear', 2], ['boulderRam', 1],
    ['mistJelly', 1], ['scrollKeeper', 1], ['deepColossus', 2], ['tidalLeviathan', 2], ['starUnicorn', 1], ['hiveQueen', 1],
    ['kindle', 2], ['undertow', 2], ['frostBind', 2], ['mend', 1], ['cataclysm', 1], ['warBanner', 1], ['shatter', 2], ['fieldWater', 1],
    ['still', 2], ['reflectPrism', 2], ['updraft', 2], ['ward', 1]] },
  dusk: { name: { ar: 'نور وظلام', en: 'Light & Shadow' }, list: [
    ['duskBlade', 2], ['graveRook', 2], ['nightStalker', 1], ['mirrorLurker', 2], ['sunPriest', 2], ['scrollKeeper', 2], ['dawnPaladin', 2],
    ['boneCollector', 1], ['bloodBat', 2], ['starUnicorn', 2], ['plagueLord', 1], ['dawnSeraph', 1], ['voidTyrant', 1],
    ['kindle', 1], ['exchange', 2], ['shrinkHex', 2], ['scorch', 1], ['stormSweep', 1], ['recall', 2], ['shatter', 1], ['mend', 1], ['warBanner', 1],
    ['counterSeal', 2], ['pit', 2], ['ward', 2], ['fieldDark', 1]] },
  wild: { name: { ar: 'غابة وسماء', en: 'Grove & Sky' }, list: [
    ['thornBear', 2], ['boulderRam', 2], ['crystalBeetle', 1], ['mossTurtle', 1], ['twinTalon', 2], ['cloudDjinn', 2], ['galeLancer', 2],
    ['sunPriest', 1], ['dawnPaladin', 1], ['scrollKeeper', 1], ['zephyrSprite', 1], ['hiveQueen', 2], ['stormWyvern', 1], ['starUnicorn', 1], ['dawnSeraph', 1],
    ['fieldEarth', 1], ['fieldWind', 1], ['fieldLight', 1], ['kindle', 2], ['rally', 1], ['whet', 2], ['shatter', 2], ['gust', 1], ['mend', 1],
    ['ward', 2], ['updraft', 2], ['thornWall', 1], ['reflectPrism', 1], ['pit', 1]] }
};
SD.buildDeck = key => SD.DECKS[key || 'starter'].list.flatMap(([id, n]) => Array(n).fill(id));

/* Tutorial: the first cards each side draws, in order */
SD.TUTORIAL = {
  you: ['galeLancer', 'mossTurtle', 'kindle', 'ward', 'stormWyvern', 'whet', 'emberFox', 'shatter', 'mirrorLurker', 'tideDancer'],
  opp: ['emberFox', 'graniteSentinel', 'tideDancer', 'duskBlade', 'mossTurtle', 'cinderHound', 'galeLancer', 'lanternWisp']
};
})();
