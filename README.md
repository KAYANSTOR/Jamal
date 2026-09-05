# جمال (Jamal) — نظام إدارة المخزون Offline-first

نظام مخزون متكامل متعدد المخازن يعمل محلياً أولاً (Local-First / PWA) مع مزامنة سحابية اختيارية.

## الميزات الرئيسية

- **Offline-First**: كل العمليات اليومية تتم على قاعدة البيانات المحلية (Dexie / IndexedDB).
- **مزامنة سحابية**: رفع العمليات عبر Outbox + مزامنة ثنائية الاتجاه.
- **متعدد المخازن والمنظمات**: عزل كامل حسب `organization_id`.
- **حركات المخزون append-only**: كل تغيير رصيد يمر عبر `stock_movements` فقط.
- **عمليات المواد**: صرف، مرتجع، استبدال، توفية (Phase 5).
- **نسخ احتياطي محلي رسمي**: عبر File System Access API (قيد التنفيذ).

## التقنيات

| الطبقة | التقنية |
|--------|---------|
| Frontend | React 19 + TypeScript + Vite + Tailwind |
| Local DB | Dexie (IndexedDB) |
| Cloud DB | PostgreSQL + Drizzle ORM |
| Auth | Firebase |
| PWA | vite-plugin-pwa |
| PDF | jsPDF + html2canvas |

## التشغيل المحلي

```bash
# تثبيت الاعتماديات
npm install
# أو
bun install

# تشغيل السيرفر + الواجهة (وضع التطوير)
npm run dev

# بناء الإنتاج
npm run build
npm start
```

### متغيرات البيئة

انسخ `.env.example` إلى `.env` واملأ القيم المطلوبة (Firebase + PostgreSQL).

## هيكل المجلدات

```
src/
├── components/     # مكونات الواجهة
├── context/        # AuthContext وغيرها
├── db/             # schema.ts + drizzle config
├── lib/            # db.ts, repositories, settings, sync
├── pages/          # صفحات التطبيق
├── middleware/     # auth middleware للسيرفر
└── ...
drizzle/            # migrations
docs/               # قرارات معمارية ومتطلبات
server.ts           # Express backend
```

## قواعد التطوير المهمة

1. **لا سكربتات مؤقتة** (`fix_*`, `patch_*`, `update_*`) في الجذر.
2. كل تغيير رصيد مخزون يجب أن يكون:
   - append-only في `stock_movements`
   - داخل transaction ذرية
   - idempotent (لا تكرار عند إعادة المزامنة)
3. لا تعدل `stock_balances` مباشرة من الواجهة.
4. كل عملية Offline تمر عبر Outbox + `syncEngine`.

## المرحلة الحالية (حسب خارطة الطريق)

- [x] تنظيف المستودع من السكربتات المؤقتة
- [x] إنشاء migration كاملة من `schema.ts` (`drizzle/0001_broad_frank_castle.sql`)
- [ ] إكمال Phase 5 (استبدال + توفية)
- [ ] نظام النسخ الاحتياطي المحلي الرسمي
- [ ] تحسينات التنبيهات والتقارير والـ offline UX
- [ ] اختبارات أساسية وتحسينات إضافية في README

## الترخيص

خاص — جميع الحقوق محفوظة.
