# قائمة تنظيف المستودع — جاهزة للرفع اليدوي

## الملفات المطلوب حذفها من جذر المستودع

احذف الملفات التالية تماماً (لا تنقلها إلى مجلد آخر):

### fix
- fix-dashboard.ts
- fix-db.ts
- fix-imports.ts
- fix-inventory.ts
- fix-nav.ts
- fix-repo.ts
- fix-routes.ts
- fix-settings.ts
- fix-sync.ts
- fix-transfers.ts
- fix-widget.ts
- fix_db.ts

### patch
- patch-applayout.ts
- patch-dashboard.ts
- patch_app.ts
- patch_dash2.ts
- patch_dash3.ts
- patch_layout.ts
- patch_layout2.ts
- patch_layout3.ts
- patch_layout_icon.ts
- patch_layout_logout.ts
- patch_manifest.ts
- patch_metadata.ts
- patch_nav.tsx
- patch_reports.ts
- patch_reports_frag.ts
- patch_reports_header.ts
- patch_settings.ts
- patch_tsconfig.ts
- patch_wh_dialog.ts
- patch_workbox.ts

### append / update / test
- append-inventory-repo.ts
- append-routes.ts
- update-app-tsx.ts
- update-dashboard.ts
- update-dexie.ts
- update-layout.ts
- update_dash.ts
- update_material_issue_repo.ts
- update_material_return_repo.ts
- update_purchase_repo.ts
- update_repo.ts
- update_transfer_repo.ts
- update_vite.ts
- test-db-2.ts
- test-db.ts
- test-dexie.ts
- test_script.ts

## الملفات المطلوب استبدالها / إضافتها

استبدل الملفات التالية بالنسخ الموجودة في هذا المجلد (`artifacts/`):

| الملف في المستودع | الملف الجاهز هنا |
|-------------------|------------------|
| package.json      | package.json     |
| metadata.json     | metadata.json    |
| (جديد) README.md  | README.md        |

## خطوات الرفع اليدوي المقترحة

1. احذف كل الملفات المذكورة أعلاه من جذر المستودع.
2. استبدل `package.json` و `metadata.json`.
3. أضف `README.md` في الجذر.
4. اعمل commit برسالة مثل:
   ```
   chore: clean temporary fix/patch scripts + rename package to jamal + add README
   ```
5. ادفع إلى `main`.

## الخطوة التالية بعد التنظيف

بعد رفع هذا التنظيف، ننتقل إلى:
1. توليد migration جديدة نظيفة من `src/db/schema.ts`.
2. إكمال Phase 5 (استبدال المواد + التوفية).
