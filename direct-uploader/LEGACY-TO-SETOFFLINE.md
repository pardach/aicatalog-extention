# اتصال کاتالوگ قدیمی Illustrator به Setoffline

## وضعیت و شاخه‌ها

- Old Illustrator extension: `pardach/aicatalog-extention` (main).
- New bulk direct uploader: `feature/direct-pardach-uploader-mvp`, PR #1.
- This incremental integration: `feature/setoffline-catalog-bridge` (base = bulk uploader branch).
- Pardach server API changes: `pardach/pardach` PR #105.
- Setoffline Desktop manifest metadata preservation: `pardach/setoffline`, `feature/illustrator-catalog-family-links`.

**Do not merge integration before the direct-uploader base branch and backend API are tested.**
The new addon still uploads into **Pardach's authenticated catalog**; Setoffline obtains
it with its existing offline sync. This is NOT a direct upload into a running Desktop
instance or a separate Setoffline-only server.

## چه چیزهایی از افزونه قبلی استفاده شده است؟

Legacy `host/script.jsx` و `host/addSymbol.jsx` یک طرح را به Symbol تبدیل
می‌کنند و متادیتای آن را در `Symbol.note` نگه می‌دارند. جستجو و مدیریت گروهی
در `client/js/app.js` و `sqliteBridge-fixed.js` انجام می‌شود.

افزونه جدید مستقیم **Symbol.note** یا `GroupItem.note` را *فقط برای خواندن*
دریافت می‌کند؛ سپس با `direct-uploader/client/legacy-adapter.js`
از `JSON.parse` و یک فهرست مجاز از فیلدها برای تبدیل اطلاعات استفاده می‌کند.

نکته امنیتی: `host/script.jsx` قدیمی در `parseJSON` از `eval` استفاده می‌کند؛
این قسمت برای آپلود یا ورودی سرور استفاده نشده است. کپی SQLite هم انجام
نمی‌شود، چون ممکن است فقط وضعیت موقت پنل باشد؛ Note به‌عنوان منبع قابل
انتقال در داخل سند Illustrator خوانده می‌شود.

| قدیمی Symbol Note | سایت پرداچ / Setoffline |
| --- | --- |
| `code` | `code` |
| `type` از جمله گل، کپ گل، رکب، بنک | `design_kind` |
| `family_codes` چندگانه | `family_key` اصلی + `family_codes` چندگانه |
| `tags` | `content_tags` و برچسب‌های کاتالوگ |
| `desc` | `description` |
| `era` | `metadata.era` |
| `created_at / created` | `metadata.legacy_created_at` |
| `dimensions` قدیمی | **ابعاد جدید** از `visibleBounds` و SVG اصلی محاسبه می‌شود |
| `preview_path` محلی | منتقل نمی‌شود؛ Preview سرور تولید می‌شود |

بنا به طراحی، برچسب‌های اصلی و نسبت خانواده‌ها نگهداری می‌شوند، اما
محتوای Note هیچ‌وقت `eval` نمی‌شود. حتی وجود کلید نامعتبر در Note
باعث اجرای دستور یا تغییر کد افزونه نمی‌شود.

## نحوه کار برای کاربر

1. یک یا چند Symbol (یا Group حاوی Symbol) را **روی بوم Illustrator**
   انتخاب کنید. همچنین می‌توانید خانواده‌های چندگروهی را انتخاب کنید.
2. در پنل **کاتالوگ** قدیمی، «☁️ ارسال به Setoffline» را بزنید.
3. در پنل جدید به سایت پرداچ وارد شوید، حالت هوشمند/اعضا/گروه‌ها/یک‌طرح
   را انتخاب و ساختار را بررسی کنید.
4. اطلاعات Noteهای معتبر قدیمی از قبل در ردیف‌ها پر می‌شوند.
5. نام، نوع، خانواده‌های دیگر و برچسب‌ها را اصلاح یا گروهی اعمال کنید.
6. «ارسال» را بزنید: فایل SVG موقت به‌طور خودکار ساخته و با TLS و
   بررسی SHA-256 به سرور منتقل می‌شود.
7. در Setoffline همگام‌سازی کاتالوگ سایت را اجرا کنید.

برای نصب هر دو پنل در ویندوز:
`install-setoffline-bridge.bat` (از ریشهٔ همین مخزن).
نیازی به حذف پوشه قبلی یا اجرای نصب‌کننده قدیمی با دسترسی Administrator نیست.
برای توسعه، CEP ممکن است تنظیم مخصوص افزونه امضانشده نیاز داشته باشد؛
برای توزیع رسمی باید امضا شود.

## چندخانواده‌ای و محدودیت‌های فعلی

- سرور با PR #105 `family_codes` را به روابط واقعی چند خانواده ثبت می‌کند.
  `family_key` برای سازگاری، خانوادهٔ اصلی است.
- Manifest سایت `family_keys` کامل را ارسال می‌کند؛ Desktop در PR کوچک
  خودش این لیست را در متادیتای Asset با نام `family_codes` نگه می‌دارد.
- UI فعلی Setoffline **فقط یک خانواده اصلی برای چیدمان خانواده محور** دارد.
  روابط ثانویه حفظ می‌شوند ولی هنوز فیلتر/چیدمان چندخانواده‌ای جداگانه ندارند.
- Symbolهای بدون نمونه روی artboard هنوز مستقیم ارسال نمی‌شوند؛ قبل از
  ارسال باید instance آنها را انتخاب کرد. این تصمیم برای جلوگیری از
  دستکاری خودکار سند Illustrator است.
- حفظ کامل فایل AI، brushهای زنده، افکت‌ها، Symbolهای قابل ویرایش و
  pixel-perfect بودن SVG برای همه نسخه‌های Illustrator هنوز تست نشده است.
- یک SVG کاملاً یکسان در سرور با SHA-256 یک رکورد است؛ برای اتصال
  همان محتوا به چند خانواده از `family_codes` استفاده می‌شود.
- این نسخه به API جدید سرور وابسته است و پیش از استقرار آن وارد حساب نمی‌شود.

## آزمون‌های اضافه‌شده

```sh
node direct-uploader/tests/selection-hierarchy.cjs
node direct-uploader/tests/legacy-adapter.cjs
node direct-uploader/tests/legacy-symbol-bridge.cjs
```

در Backend:
```sh
python manage.py makemigrations --check --dry-run
python manage.py test apps.designs.tests apps.designs.tests_direct_uploader
```

در Setoffline:
```sh
python -m unittest tests.test_site_catalog_sync_v122
```

مهم: تست‌های منطقی داخل محیط JavaScript شبیه‌سازی شده‌اند؛
تست واقعی Adobe Illustrator، سرور عملیاتی و Django/Setoffline CI هنوز باید اجرا شود.
