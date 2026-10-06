# إدارة المؤسسة — Jamal
> تطبيق ويب لإدارة المخزون متعدد المخازن بواجهة عربية، وتخزين محلي عبر Offline-First مع مزامنة اختيارية إلى خادم PostgreSQL.

## 📖 نظرة عامة

- نقطة تشغيل الواجهة هي `src/main.tsx`، ويُحمّل التطبيق `src/App.tsx` داخل `StrictMode`.
- الواجهة عربية من اليمين إلى اليسار (`RTL`) كما يثبت `index.html`.
- الاسم الظاهر في التطبيق هو «إدارة المؤسسة»، والنسخة المعلنة في `package.json` هي `1.0.0`.
- التطبيق يتطلب تسجيل دخول Google عبر Firebase قبل عرض المسارات المحمية في `src/App.tsx` و`src/pages/Login.tsx`.
- تُقرأ العمليات اليومية من قاعدة Dexie المحلية المسماة `StockLedgerDB` في `src/lib/db.ts`.
- عند توفر الاتصال ورمز المصادقة، يدفع محرك المزامنة العمليات المحلية إلى `/api/sync` ثم يجلب لقطة من `/api/pull`؛ التنفيذ في `src/lib/db.ts`.
- لا يحدد المستودع جمهوراً أو قطاعاً تجارياً بعينه؛ **غير موثّق في المستودع**.

## 🎯 المشكلة والحل

- يعرض التنفيذ شاشات للمنتجات، المخازن، المشتريات، الصرف الداخلي، المرتجعات، التحويلات، الجرد، والتقارير؛ المسارات معرفة في `src/App.tsx`.
- يعالج العمل دون اتصال بكتابة البيانات إلى IndexedDB عبر Dexie، ثم يحتفظ بالعمليات غير المرسلة في `outbox`؛ التعريف والتنفيذ في `src/lib/db.ts`.
- يعالج تبادل البيانات بين الأجهزة بخطوتي push ثم pull، مع إعادة المحاولة والتعامل مع حالات `FAILED` و`CONFLICT`؛ `src/lib/db.ts`.
- يتحقق الخادم من هوية Firebase ويقيّد بيانات المستخدم بالمنظمة المرتبطة به؛ `src/middleware/auth.ts` و`server.ts`.
- تفاصيل المشكلة التجارية أو مؤشرات الأداء المستهدفة **غير موثّق في المستودع**.

## ✨ الميزات الرئيسية

- ✅ تسجيل الدخول والخروج باستخدام Google Popup عبر Firebase؛ `src/pages/Login.tsx` و`src/context/AuthContext.tsx`.
- ✅ حماية واجهة التطبيق قبل عرض المسارات، مع إعادة التوجيه للمسار الرئيسي عند المسار غير المعروف؛ `src/App.tsx`.
- ✅ إدارة المخازن وإضافة المخزن وتعديله وعرض إحصاءات الكميات والنواقص؛ `src/pages/Warehouses.tsx` و`src/components/warehouses/`.
- ✅ إدارة الأصناف والتصنيفات والأنواع والوحدات، مع البحث وتصفية التصنيف وحساب الكميات؛ `src/pages/Products.tsx` و`src/pages/setup/`.
- ✅ دعم `SKU` و`barcode` وخصائص النوع في النموذج المحلي؛ `src/lib/db.ts` و`src/db/schema.ts`.
- ✅ إنشاء أوامر الشراء وربطها بالمورد والمخزن، ثم تسجيل الاستلام الجزئي أو الكامل؛ `src/pages/Purchases.tsx` و`src/lib/repositories.ts`.
- ✅ إدارة الموردين وبيانات الهاتف والبريد الإلكتروني، مع العرض والتعديل؛ `src/pages/Suppliers.tsx` و`src/components/suppliers/`.
- ✅ إدارة الأقسام وبياناتها الوصفية؛ `src/pages/Departments.tsx` و`src/pages/setup/Departments.tsx`.
- ✅ إنشاء سند صرف داخلي، ثم إلغاؤه أو توفيته بعد معالجة الكميات؛ `src/pages/MaterialIssues.tsx` و`src/lib/repositories.ts`.
- ✅ تسجيل مرتجعات المواد وتجميع حركات الإرجاع حسب السند والتاريخ؛ `src/pages/MaterialReturns.tsx` و`src/components/material-returns/`.
- ✅ تسجيل الاستبدال المرتبط بسند الصرف؛ `src/lib/repositories.ts` و`server.ts`.
- ✅ إنشاء تحويل مخزني كمسودة، وإرساله واستلامه أو إلغاؤه مع إعادة الحركة؛ `src/pages/StockTransfers.tsx` و`src/lib/repositories.ts`.
- ✅ إدخال الأرصدة الافتتاحية وترحيل فروقات الجرد إلى حركات `ADJUSTMENT_IN` أو `ADJUSTMENT_OUT`؛ `src/pages/OpeningBalances.tsx` و`src/pages/PhysicalInventory.tsx`.
- ✅ عرض أرصدة المخزون والحركات التفصيلية مع البحث والتصفية والطباعة وتصدير PDF؛ `src/pages/Reports.tsx` و`src/lib/pdfExport.ts`.
- ✅ إظهار تنبيهات نقص المخزون عند تفعيلها وضبط معامل حد الطلب؛ `src/components/layout/AppLayout.tsx` و`src/pages/Settings.tsx` و`src/lib/settings.ts`.
- ✅ دعم تثبيت التطبيق كـ PWA وتحديث service worker تلقائياً؛ `vite.config.ts` و`src/components/PWAInstallButton.tsx`.
- ✅ عرض حالة الاتصال وحالات الانتظار والفشل والتعارض وإتاحة المزامنة اليدوية؛ `src/components/SyncIndicator.tsx` و`src/components/ConnectionStatusBar.tsx`.
- ✅ تسجيل العمليات في `audit_logs` ومنع تكرار عملية المزامنة عبر `sync_operations`; `src/db/schema.ts` و`server.ts`.

## 🛠️ التقنيات

| المجال | التقنية | دليلها |
|---|---|---|
| واجهة المستخدم | React 19 | `package.json` و`src/main.tsx` |
| اللغة | TypeScript | ملفات `src/**/*.ts` و`src/**/*.tsx` و`tsconfig.json` |
| أدوات البناء | Vite | `package.json` و`vite.config.ts` |
| التصميم | Tailwind CSS 4 عبر Vite plugin | `package.json` و`vite.config.ts` و`src/index.css` |
| التوجيه | React Router | `package.json` و`src/App.tsx` |
| قاعدة البيانات المحلية | Dexie على IndexedDB | `package.json` و`src/lib/db.ts` |
| قاعدة البيانات السحابية | PostgreSQL عبر `pg` | `package.json` و`src/db/index.ts` |
| ORM والهجرات | Drizzle ORM وDrizzle Kit | `package.json` و`src/db/drizzle.config.ts` و`drizzle/` |
| الخادم | Express | `package.json` و`server.ts` |
| المصادقة | Firebase Authentication وFirebase Admin | `package.json` و`src/lib/firebase.ts` و`src/middleware/auth.ts` |
| التخزين المحلي المتفاعل | `dexie-react-hooks` | `package.json` وصفحات `src/pages/` |
| PWA | `vite-plugin-pwa` وWorkbox | `package.json` و`vite.config.ts` |
| الرسوم | Recharts | `package.json` و`src/pages/Dashboard.tsx` |
| PDF | jsPDF وhtml2canvas | `package.json` و`src/lib/pdfExport.ts` و`src/pages/Reports.tsx` |
| الحسابات العشرية | decimal.js | `package.json` و`server.ts` و`src/lib/repositories.ts` |
| الأيقونات والحركة | lucide-react وmotion | `package.json` وملفات `src/components/` |

## 🏗️ هيكل المشروع

```text
.
├── package.json                 # الاعتماديات وscripts
├── package-lock.json            # قفل اعتماديات npm
├── bun.lock                     # قفل اعتماديات Bun
├── vite.config.ts               # React وTailwind وPWA
├── tsconfig.json                # إعداد TypeScript
├── index.html                   # القالب العربي RTL
├── server.ts                    # Express وواجهات API
├── src/
│   ├── App.tsx                  # المصادقة والتوجيه
│   ├── main.tsx                 # نقطة دخول React
│   ├── pages/                   # الشاشات التشغيلية والإعدادات
│   ├── components/              # التخطيط والنماذج ومكونات UI
│   ├── context/AuthContext.tsx  # حالة جلسة Firebase
│   ├── db/schema.ts             # مخطط PostgreSQL
│   ├── db/index.ts              # اتصال PostgreSQL/Drizzle
│   ├── lib/db.ts                # Dexie وOutbox وSync Engine
│   ├── lib/repositories.ts      # عمليات المجال المحلية
│   └── middleware/auth.ts       # تحقق Firebase وRBAC
├── drizzle/                     # ملفات SQL المولدة للهجرات
├── public/                      # أيقونات وموارد PWA
├── docs/                        # قرارات معمارية ومتطلبات مستقبلية
└── .env.example                 # أسماء متغيرات المثال فقط
```

## 🚀 التشغيل المحلي

### المتطلبات المثبتة من التهيئة

- Node.js وnpm مطلوبان لتشغيل أوامر `package.json`؛ إصدار محدد **غير موثّق في المستودع**.
- خادم PostgreSQL مطلوب للاتصال الذي ينشئه `src/db/index.ts`.
- إعداد Firebase وبيانات اعتماد قاعدة البيانات مطلوبان بحسب الكود؛ قيمهما **غير موثّقة في المستودع**.

### خطوات وأوامر مثبتة

```bash
npm install
npm run dev
```

- ينفذ `npm run dev` الأمر `tsx server.ts`؛ ينشئ `server.ts` خادماً على المنفذ `3000`.
- في وضع التطوير يركب الخادم Vite middleware؛ التفصيل في `server.ts`.
- لا يوجد script باسم `test` في `package.json`، ولا توجد ملفات اختبارات معرّفة؛ **غير موثّق في المستودع**.

### بناء وتشغيل الإنتاج

```bash
npm run build
npm start
```

- يبني `npm run build` واجهة Vite ثم يجمع `server.ts` إلى `dist/server.cjs` باستخدام esbuild؛ `package.json`.
- يشغل `npm start` الملف `dist/server.cjs`؛ `package.json`.
- للمعاينة فقط يوجد الأمر التالي كما هو معرف:

```bash
npm run preview
```

### أوامر قاعدة البيانات

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
```

- الأوامر الثلاثة تستخدم `src/db/drizzle.config.ts`، ومخرجات الهجرة في `drizzle/`.
- لا يحدد المستودع أمراً مستقلاً لإنشاء قاعدة PostgreSQL أو تشغيل Firebase؛ **غير موثّق في المستودع**.

## 🔐 متغيرات البيئة

يوجد ملف `.env.example` واحد، ولا توجد ملفات `.env.*.example` إضافية. لا تُدرج هنا أي قيم.

| الاسم | الغرض المثبت | مطلوب/اختياري |
|---|---|---|
| `GEMINI_API_KEY` | مطلوب لاستدعاءات Gemini AI، ويذكر المثال أن AI Studio يحقنه وقت التشغيل | مطلوب وفق تعليق `.env.example` |
| `APP_URL` | عنوان استضافة التطبيق للروابط الذاتية وOAuth callbacks وواجهات API، ويذكر المثال أن AI Studio يحقنه | مطلوب وفق تعليق `.env.example` |

- يقرأ `src/db/index.ts` الأسماء `SQL_HOST` و`SQL_USER` و`SQL_PASSWORD` و`SQL_DB_NAME`.
- يقرأ `src/db/drizzle.config.ts` الأسماء `SQL_HOST` و`SQL_DB_NAME` و`SQL_ADMIN_USER` و`SQL_ADMIN_PASSWORD`.
- هذه الأسماء الإضافية غير موجودة في `.env.example`؛ اكتمال إعدادها **غير موثّق في المستودع**.
- يقرأ `vite.config.ts` المتغير `DISABLE_HMR` لتبديل HMR والمراقبة؛ ليس موجوداً في `.env.example`، ووصف قيمته التشغيلية التفصيلي **غير موثّق في المستودع**.

## 📜 الأوامر المتاحة

| الأمر | ما يفعله وفق التعريف/الملفات |
|---|---|
| `npm run dev` | يشغل `tsx server.ts` في وضع التطوير؛ `package.json` |
| `npm run build` | ينفذ `vite build` ثم يجمع الخادم إلى `dist/server.cjs`؛ `package.json` |
| `npm start` | ينفذ `node dist/server.cjs`؛ `package.json` |
| `npm run preview` | ينفذ `vite preview`؛ `package.json` |
| `npm run clean` | يحذف `dist` و`server.js` عبر `rm -rf`؛ `package.json` |
| `npm run lint` | يشغل `tsc --noEmit`؛ `package.json` |
| `npm run db:generate` | ينفذ `drizzle-kit generate --config=src/db/drizzle.config.ts`؛ `package.json` |
| `npm run db:migrate` | ينفذ `drizzle-kit migrate --config=src/db/drizzle.config.ts`؛ `package.json` |
| `npm run db:studio` | ينفذ `drizzle-kit studio --config=src/db/drizzle.config.ts`؛ `package.json` |

- لا توجد scripts للاختبارات أو النشر في `package.json`.

## 🌐 النشر

- إعداد الإنتاج الموجود هو بناء Vite وتجميع الخادم إلى `dist/server.cjs` ثم تشغيله؛ `package.json`.
- في الإنتاج يخدم `server.ts` الملفات الثابتة من `dist`، وفي غير الإنتاج يستخدم Vite middleware؛ `server.ts`.
- الخادم يستمع على `0.0.0.0:3000`؛ `server.ts`.
- لا توجد ملفات `Dockerfile` أو `docker-compose.yml` أو `vercel.json` أو `firebase.json` أو workflows داخل `.github/workflows/`.
- نتيجة البحث عن `vercel.app` و`netlify.app` و`firebaseapp.com` عثرت على نطاق Firebase داخل `firebase-applet-config.json` كإعداد `authDomain`، وليس رابط Demo منشوراً.
- رابط Live أو Demo منشور **غير موثّق في المستودع**.

## 🔒 الأمان

- يتحقق `src/middleware/auth.ts` من Bearer ID token عبر `adminAuth.verifyIdToken`.
- ينشئ الوسيط منظمة افتراضية ومستخدماً عند غيابه، ويرفض الحساب غير النشط؛ `src/middleware/auth.ts`.
- يفحص الخادم الدور `ADMIN` أو `STOREKEEPER` لبعض عمليات المزامنة؛ `server.ts`.
- يطبق الخادم عزل `organizationId` عند القراءة والكتابة والتحقق من الكيانات؛ `src/db/schema.ts` و`server.ts`.
- يستخدم معاملات PostgreSQL وقفل `FOR UPDATE` عند تحديث أرصدة المخزون؛ `server.ts`.
- يمنع الصرف أو الحركات المخفضة عند عدم كفاية الرصيد؛ `server.ts`.
- يسجل تغييرات مختارة في `audit_logs` ويمنع تكرار العملية في `sync_operations`؛ `src/db/schema.ts` و`server.ts`.
- يخزن رمز الجلسة ومعرف الجهاز ووقت آخر مزامنة في `localStorage`؛ `src/context/AuthContext.tsx` و`src/lib/db.ts`.
- لا توجد ملفات `firestore.rules` أو قواعد RLS أو إعداد Middleware إضافي في شجرة المستودع؛ **غير موثّق في المستودع**.
- سياسة كلمات المرور، تدوير الأسرار، واختبارات أمنية مستقلة **غير موثّقة في المستودع**.

## 📄 الترخيص

- لم أعثر على ملف `LICENSE` أو `LICENSE.*` أو `COPYING*` في المستودع.
- نص الترخيص وحقوق النشر **غير موثّق في المستودع**.
