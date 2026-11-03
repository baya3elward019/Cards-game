# مبارزة الأختام · Sigil Duel

لعبة أوراق مبارزة على المتصفح بأوراق ورسومات أصلية: لعب مع صديق بروم وكود، وضع تعليمي بمدرّب، مبارزة ضد الكمبيوتر، ومكتبة أوراق. عربي وإنجليزي.

A browser card-duel game with original cards and art: private two-player rooms, a coached tutorial, a duel against the computer, and a card library. Arabic and English.

## التشغيل · Run

للعب الفردي فقط: افتح `index.html` في المتصفح. لا يوجد build.
Offline solo play: open `index.html` in a browser. No build step.

### اللعب مع صديق · Multiplayer

ثبّت Node.js 22 أو أحدث، ثم من مجلد اللعبة:

```sh
npm ci
npm start
```

افتح `http://localhost:3000`، واضغط **العب مع صاحبك**، واختار المجموعة ثم **إنشاء روم**. ابعت الكود أو رابط الدعوة لصاحبك. هو يفتح نفس السيرفر، يختار مجموعته ويضغط **دخول الروم**. رابط الدعوة يملأ الكود تلقائياً. تبدأ المباراة عند دخول اللاعب الثاني، والبادئ بالقرعة.

للتجربة على نفس الجهاز افتح تبويبين مستقلين. على نفس شبكة Wi-Fi استخدم عنوان الجهاز المحلي بدل `localhost` في الجهازين، مثل `http://192.168.1.10:3000` (استبدله بعنوان جهازك الفعلي). رابط `localhost` لا يصلح لصاحبك على جهاز آخر.

For multiplayer, run the Node server and open its URL. Choose **Play with a friend**, select a deck, then create or join a room. Invite links prefill the six-character code. Both players must use the same server. `localhost` only works on the server's own computer.

السيرفر يراجع كل حركة، ويخفي يد الخصم والكروت المقلوبة وترتيب المجموعات. يمكن الرجوع لنفس المباراة في نفس التبويب بعد تحديث الصفحة أو انقطاع الاتصال خلال 60 ثانية. مهلة اختيارات الفخاخ والأهداف والتضحيات دقيقتان؛ تجاوز المهلة خسارة. الغرف مؤقتة في الذاكرة: إعادة تشغيل السيرفر تمسحها، وتنتهي بحد أقصى بعد 4 ساعات. زر «مبارزة جديدة» بعد النهاية يرجعك لإنشاء/دخول روم جديدة.

The server owns the rules and hidden information. Refresh/reconnect in the same tab within 60 seconds to resume. Pending card choices time out after two minutes and forfeit the duel. Rooms are in memory, expire after at most four hours, and do not survive server restarts. Run a single server instance (no multi-instance scaling without shared room storage/routing).

### نشر اللعب الجماعي · Hosting multiplayer

انشر المشروع كخدمة Node أو Docker تدعم WebSocket، بأمر تثبيت `npm ci` وتشغيل `npm start`. السيرفر يستخدم متغير `PORT` الذي توفره الاستضافة (الافتراضي 3000)، ويقدم الواجهة واتصال `/ws` معاً. فعّل HTTPS على الاستضافة؛ الواجهة تستخدم WSS تلقائياً. شارك رابط الاستضافة مع صاحبك. ملف `Dockerfile` جاهز لمنصة تدعم الحاويات.

Deploy as a Node or Docker web service supporting WebSockets. Install: `npm ci`; start: `npm start`; listen port: `PORT` (default 3000). Serve the frontend and `/ws` on the same origin; use HTTPS/WSS in production. No database or API keys are needed. A public server has **not** been provisioned by adding these files.

**GitHub Pages يشغّل اللعب الفردي فقط؛ لا يشغّل سيرفر الرومات.**

### الإضافة الجديدة · Eclipse Wardens

12 ورقة جديدة بنفس تنسيق الأوراق القديمة: 6 وحوش برسومات SVG متحركة، 3 سحر، 3 أفخاخ. مجموعة **حراس الكسوف** تضم 40 ورقة ومتاحة في اللعب الفردي والجماعي. «ستار الملاذ» يلغي الهجوم ويشفي 500، و«شرك الجاذبية» يلغي الهجوم ويحوّل المهاجم للدفاع. إجمالي المجموعات: 6.

### الاختبارات · Tests

```sh
npm test
```

Tests use two real WebSocket clients against an ephemeral local server: room admission, private views, turn/ownership validation, trap decisions, reconnection, deck integrity, and new trap effects.

## الرفع على GitHub Pages · Deploy

1. أنشئ مستودعاً جديداً وارفع كل الملفات كما هي (`index.html` في الجذر).
2. Settings → Pages → Source: **Deploy from a branch** → `main` / `(root)` → Save.
3. بعد دقيقة تعمل اللعبة على `https://<username>.github.io/<repo>/`.

## الملفات · Files

| File | ماذا فيه |
|---|---|
| `js/cards.js` | كل الأوراق والمجموعات الست (`SD.DECKS`). أضف أو عدّل الأوراق هنا |
| `server.js` | سيرفر الرومات، مراجعة الحركات وإخفاء معلومات الخصم |
| `js/online-text.js` | نصوص اللعب الجماعي بالعربي والإنجليزي |
| `js/i18n.js` | كل نصوص الواجهة بالعربي والإنجليزي |
| `js/engine.js` | القواعد: المراحل، الاستدعاء، المعركة، السحر والفخاخ |
| `js/ai.js` | الخصم الآلي (سهل / عادي) |
| `js/ui.js` | الشاشات، الساحة، المدرّب |
| `js/art.js` | رسم الأختام تلقائياً من اسم الورقة |
| `css/style.css` | التصميم والألوان (المتغيرات في أول الملف) |

### إضافة ورقة · Add a card

في `js/cards.js` أضف سطراً داخل `SD.CARDS` ثم أضف المعرّف إلى إحدى المجموعات في `SD.DECKS` (كل مجموعة 40 ورقة):

```js
frostOwl: M(4, 1600, 1200, 'water', { ar: 'بومة الصقيع', en: 'Frost Owl' },
  { ar: 'وصف الورقة.', en: 'Card text.' }),
```

التأثيرات المتاحة (`op`): `draw`, `heal`, `burn`, `burnPer`, `destroyMonster`, `destroyST`, `revive`, `equip`, `weaken`, `weakenAll`, `shrink`, `gainAtk`, `buffAll`, `bounce`, `toDef`, `cycle`, `discardOpp`, `wipeMon`, `wipeST`, `aura`.

قدرات الوحوش المستمرة (`on: 'cont'`): `pierce`, `direct`, `twice`, `guard`, `aura`, `taunt`, `immune`, `lifesteal`, `rage`, `scale`.

الساحات: ألوان كل ساحة وجسيمات خلفيتها في `css/style.css` تحت `body[data-arena=...]`.

لرسم وحش جديد أضف رسمته في `js/art.js` داخل `SD.MONSTER_ART` بنفس معرّف الورقة؛ من غير رسمة تظهر الورقة بختم.
