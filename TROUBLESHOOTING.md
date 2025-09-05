# راهنمای عیب‌یابی (Troubleshooting Guide)

## مشکلات رایج و راه حل‌ها

### 1. خطای `Cannot read properties of undefined (reading 'addEventListener')`

**علت:** CSInterface یافت نشد یا DOM آماده نیست.

**راه حل:**
- مطمئن شوید که در محیط CEP هستید
- اگر در مرورگر تست می‌کنید، Mock CSInterface فعال می‌شود
- بررسی کنید که `CSInterface.js` load شده باشد

**تست:**
```javascript
// در Console اجرا کنید
console.log('CSInterface:', typeof CSInterface);
console.log('DOM Ready:', document.readyState);
```

### 2. خطای `Unexpected token E in JSON at position 0`

**علت:** پاسخ ExtendScript JSON معتبر نیست.

**راه حل:**
- ExtendScript ممکن است خطا داده باشد
- بررسی کنید که Illustrator باز باشد
- فایل‌های ExtendScript را چک کنید

**تست:**
```javascript
// تست ExtendScript
csInterface.evalScript('getAllSymbolsData()', (result) => {
    console.log('Result:', result);
    console.log('First char:', result.charAt(0));
});
```

### 3. خطای `VectorCatalogExtension is not defined`

**علت:** فایل `app.js` load نشده.

**راه حل:**
- بررسی کنید که `<script src="js/app.js"></script>` در HTML وجود داشته باشد
- مطمئن شوید که سرور اجرا شده باشد
- Cache مرورگر را پاک کنید

### 4. خطای `Cannot set properties of null`

**علت:** DOM element یافت نشد.

**راه حل:**
- مطمئن شوید که HTML کامل load شده
- از `DOMContentLoaded` استفاده کنید
- بررسی کنید که IDهای HTML درست باشند

## ابزارهای تست

### فایل‌های تست موجود:
- `test-initialization.js` - تست راه‌اندازی
- `test-extendscript.jsx` - تست ExtendScript
- `test-size-calculation.jsx` - تست اندازه‌گیری
- `test-complete-system.js` - تست کامل سیستم

### نحوه اجرای تست‌ها:
1. فایل تست را در Console مرورگر load کنید
2. یا در ExtendScript Toolkit اجرا کنید
3. نتایج را بررسی کنید

## Debug Mode

### فعال‌سازی Debug Panel:
1. دکمه `🐛` را در toolbar کلیک کنید
2. یا در Console اجرا کنید:
```javascript
extension.toggleDebugPanel();
```

### مشاهده Logs:
- همه عملیات در Console log می‌شوند
- Debug Panel آخرین logها را نمایش می‌دهد
- Performance metrics در `extension.performance` ذخیره می‌شود

## محیط توسعه (Development)

### اجرای بدون CEP:
- اکستنشن به صورت خودکار Mock CSInterface ایجاد می‌کند
- تمام توابع به جز ExtendScript کار می‌کنند
- برای تست UI مناسب است

### اجرای با CEP:
1. Illustrator را باز کنید
2. Extension را از منو Window > Extensions انتخاب کنید
3. یا از مسیر مستقیم: `cep://com.yourcompany.newextension.panel/`

## مشکلات پیشرفته

### پاک کردن داده‌ها:
```javascript
// پاک کردن همه Symbols
csInterface.evalScript('app.activeDocument.symbols.removeAll()');
```

### ریست تنظیمات:
```javascript
// پاک کردن localStorage
localStorage.clear();
```

### Force Reload:
```javascript
// Force reload extension
location.reload(true);
```

## تماس با پشتیبانی

اگر مشکل حل نشد:
1. Debug Panel را فعال کنید
2. Screenshot از Console بگیرید
3. اطلاعات سیستم را ارسال کنید:
   - نسخه Illustrator
   - سیستم عامل
   - مرورگر (اگر استفاده می‌شود)
   - پیام‌های خطا کامل

## بروزرسانی‌ها

### v1.0.0
- ✅ رفع مشکلات initialization
- ✅ بهبود error handling
- ✅ اضافه کردن Mock CSInterface
- ✅ تست‌های جامع
