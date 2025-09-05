# راهنمای تست اکستنشن Vector Catalog

## فایل‌های تست

### ۱. تست‌های کلاینت
- **`test-fixes.html`**: صفحه تست جامع برای بررسی رفع مشکلات
- **`test-connection.html`**: تست اتصال سرور لوکال
- **`client/js/test-connection.js`**: کلاس تست اتصال Illustrator

### ۲. تست‌های ExtendScript
- **`host/test-simple.jsx`**: تست ساده ExtendScript
- **`host/test-addsymbol.jsx`**: تست عملکرد addSymbol
- **`host/test-connection.jsx`**: تست اتصال پایه

## نحوه اجرای تست‌ها

### ۱. تست‌های کلاینت
```bash
# باز کردن فایل تست در مرورگر
open test-fixes.html
```

### ۲. تست‌های ExtendScript
```javascript
// در کنسول مرورگر
window.connectionTest = new IllustratorConnectionTest();
```

## مشکلات رفع شده

### ✅ ۱. مشکل تداخل نام Symbol
- **مشکل**: `خطا در ایجاد Symbol: the name is in use`
- **علت**: بررسی ناکافی نام‌های موجود
- **راه‌حل**: بررسی تمام نام‌های Symbol موجود در سند

### ✅ ۲. خطاهای تجزیه JSON
- **مشکل**: `خطا در تجزیه پاسخ`
- **علت**: استفاده از `$.writeln` در ExtendScript
- **راه‌حل**: حذف `$.writeln` و بهبود JSON handling

### ✅ ۳. مشکل بارگذاری sql-wasm.js
- **مشکل**: `sql-wasm.js یافت نشد یا بارگذاری نشده`
- **علت**: fallback SQL implementation
- **راه‌حل**: بهبود fallback و مدیریت خطا

## نتایج مورد انتظار

### تست SQLite
- ✅ راه‌اندازی موفق
- ✅ عملیات CRUD کار می‌کند
- ✅ جستجو و فیلتر کار می‌کند

### تست ExtendScript
- ✅ اتصال به Illustrator موفق
- ✅ دسترسی به app و documents
- ✅ اجرای اسکریپت‌ها موفق

### تست addSymbol
- ✅ تولید کد منحصر به فرد
- ✅ ایجاد Symbol موفق
- ✅ ذخیره metadata موفق

## عیب‌یابی

### اگر تست‌ها ناموفق بودند:

1. **بررسی کنسول مرورگر** برای خطاهای JavaScript
2. **بررسی ExtendScript Console** در Illustrator
3. **بررسی فایل‌های log** در پوشه extension
4. **تست مجدد** بعد از restart Illustrator

### خطاهای رایج:

- **`CSInterface موجود نیست`**: محیط CEP فعال نیست
- **`هیچ سندی باز نیست`**: سند Illustrator باز کنید
- **`پاسخ خالی`**: مشکل در ExtendScript execution

## پشتیبانی

برای گزارش مشکلات یا سوالات:
1. لاگ‌های کنسول را کپی کنید
2. مراحل تولید خطا را شرح دهید
3. نسخه Illustrator و سیستم عامل را ذکر کنید
