# مبارزة الأختام · Sigil Duel

لعبة أوراق مبارزة على المتصفح بأوراق ورسومات أصلية: وضع تعليمي بمدرّب، مبارزة ضد الكمبيوتر، ومكتبة أوراق. عربي وإنجليزي.

A browser card-duel game with original cards and art: a coached tutorial, a duel against the computer, and a card library. Arabic and English.

## التشغيل · Run

افتح `index.html` في المتصفح. لا يوجد build ولا تثبيت.
Open `index.html` in a browser. No build step, nothing to install.

## الرفع على GitHub Pages · Deploy

1. أنشئ مستودعاً جديداً وارفع كل الملفات كما هي (`index.html` في الجذر).
2. Settings → Pages → Source: **Deploy from a branch** → `main` / `(root)` → Save.
3. بعد دقيقة تعمل اللعبة على `https://<username>.github.io/<repo>/`.

## الملفات · Files

| File | ماذا فيه |
|---|---|
| `js/cards.js` | كل الأوراق (52 ورقة) والمجموعات الأربع (`SD.DECKS`). أضف أو عدّل الأوراق هنا |
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

قدرات الوحوش المستمرة (`on: 'cont'`): `pierce`, `direct`, `twice`, `guard`, `aura`.

لرسم وحش جديد أضف رسمته في `js/art.js` داخل `SD.MONSTER_ART` بنفس معرّف الورقة؛ من غير رسمة تظهر الورقة بختم.
