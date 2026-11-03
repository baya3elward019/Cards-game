# مبارزة الأختام · Sigil Duel

لعبة أوراق أصلية بالعربي والإنجليزي: مبارزة مع صاحبك بالكود، لعب ضد الكمبيوتر، تدريب، و6 مجموعات من بينها «حراس الكسوف» بوحوش وسحر وأفخاخ جديدة.

## العب من اللينك

افتح https://baya3elward019.github.io/Cards-game/ من جهازك أو موبايلك. **لا تحتاج تثبيت Node أو تشغيل سيرفر محلي.**

1. اضغط **العب مع صاحبك** واختار مجموعة الكروت.
2. اضغط **إنشاء روم**، وانتظر ظهور الكود.
3. ابعت رابط الدعوة أو الكود المكوّن من 10 حروف وأرقام لصاحبك.
4. صاحبك يفتح اللينك، يختار مجموعته ويضغط **دخول الروم**. رابط الدعوة يملأ الكود تلقائياً.
5. المباراة تبدأ تلقائياً عند دخول اللاعب الثاني، والبادئ بالقرعة.

**صاحب الروم لازم يسيب الصفحة مفتوحة طول المباراة.** إغلاق صفحته أو تحديثها ينهي الروم. الضيف يقدر يحدث صفحته ويرجع بنفس التبويب خلال دقيقة، طالما صاحب الروم موجود. حافظوا على الصفحة نشطة؛ بعض الموبايلات توقف الاتصال عند قفل الشاشة أو تعليق المتصفح.

## النشر على GitHub Pages

Settings → Pages → Deploy from a branch → **main / (root)** → Save.

الواجهة والرومات تعمل من الموقع الثابت نفسه، من غير build أو مفاتيح API أو خدمة Node خاصة. مكتبة MQTT مرفقة في المستودع، فلا يلزم تحميلها من CDN أثناء اللعب.

## كيف يعمل الاتصال؟

متصفح صاحب الروم يشغّل محرك القواعد، ويراجع الأدوار والحركات واختيارات الأفخاخ والتضحيات والأهداف. يرسل لكل لاعب العرض الخاص به، ويخفي يد الخصم والكروت المقلوبة وترتيب المجموعات عن واجهة الضيف. خدمات MQTT العامة من EMQX وHiveMQ وMosquitto تنقل الرسائل؛ الاتصال يتم بالخدمات الثلاث لتجاوز تعطل إحداها، والرسائل المكررة لا تكرر الحركة.

بيانات المباراة مشفرة بـ AES-GCM قبل إرسالها، بمفتاح مشتق من كود عشوائي من 10 خانات. شارك الكود مع صاحبك فقط: من يعرفه يملك مفتاح الروم. صاحب الروم يدير الحالة الكاملة في متصفحه، لذا هذا الوضع مناسب للعب الودي وليس للتحكيم المحايد في المسابقات. الخدمات العامة قد تتعطل أو تفرض حدوداً؛ لا يوجد ضمان توافر لها.

مهلة اختيار هدف أو تضحية أو تفعيل فخ دقيقتان، وبعدها يخسر اللاعب المتأخر. إذا انقطع الضيف ينتظره صاحب الروم حتى دقيقة. لا تُحفظ المباراة على سيرفر، ولا يوجد انتقال تلقائي للاستضافة إلى الضيف عند خروج صاحب الروم.

## English

Open the GitHub Pages link, choose **Play with a friend**, select a deck, create a room, and share its code or invite link. **No local server, installation, account, or API key is required.**

The creator's browser runs the shared rules engine. Public MQTT brokers relay encrypted per-player views and commands. Keep the host page open; refreshing or closing it ends the room. The guest can refresh and resume in the same tab within 60 seconds. Card choices time out after two minutes. Broker availability is external; this is a friendly host-trusted game, not a neutral tournament server. Anyone with the invite code has the room key.

## التطوير والاختبارات · Development

للعب الفردي بدون اتصال، افتح index.html مباشرة. لاختبار التعديلات محلياً فقط، يمكن استخدام أي سيرفر ملفات ثابتة أو:

```sh
npm ci
npm start
npm test
```

افتح http://localhost:3000 للتطوير. الرومات حتى في المعاينة المحلية تتصل بخدمات MQTT العامة، وليس بمسار /ws. السيرفر القديم وDockerfile موجودان كأدوات تطوير؛ وجودهما ليس شرطاً لتشغيل اللعبة المنشورة.

Tests cover encrypted browser-relay transport with duplicate delivery, private views, two-seat admission, guest resume, turn and trap validation, and the original server engine. Vendored MQTT.js 5.15.1 is under MIT; see MQTT-LICENSE.md. To update the bundle, update the npm dependency and copy node_modules/mqtt/dist/mqtt.min.js to js/mqtt.min.js, keeping its license.

## الملفات · Files

| File | الوظيفة |
|---|---|
| js/cards.js | الأوراق والمجموعات الست، كل مجموعة 40 ورقة |
| js/art.js | رسومات الوحوش والأختام |
| js/engine.js | محرك القواعد المشترك |
| js/host-room.js | إدارة المباراة واختيارات اللاعبين داخل متصفح صاحب الروم |
| js/room-network.js | التشفير والاتصال والرومات وإعادة إرسال الرسائل |
| js/mqtt.min.js | مكتبة MQTT.js المرفقة |
| js/ui.js | الواجهة والساحة والتدريب |
| js/online-text.js | نصوص الرومات بالعربي والإنجليزي |
| css/style.css | التصميم |

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
