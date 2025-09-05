# راهنمای Debug و عیب‌یابی

## 🚀 راه‌اندازی Debug

### ۱. سرور لوکال (روش سریع)
```bash
# اجرای سرور لوکال
./start-debug-server.bat

# یا با Python
python -m http.server 8206

# یا با Node.js
npx http-server -p 8206
```

### ۲. آدرس‌های دسترسی
- **صفحه Debug:** `http://localhost:8206/debug-local.html`
- **اکستنشن لوکال:** `http://localhost:8206/index.html`
- **اکستنشن CEP:** `cep://com.yourcompany.newextension.panel/`
- **Chrome DevTools (کنسول CEP):** `http://localhost:9222`

### ۳. فعال‌سازی Debug Panel
- روی دکمه 🐛 در toolbar کلیک کنید
- پنل debug در پایین سمت راست نمایش داده می‌شود
- تمام logها به صورت real-time نمایش داده می‌شوند

### ۴. اجرای تست‌ها
- روی دکمه 🧪 کلیک کنید
- تست‌های زیر اجرا می‌شوند:
  - تست اتصال CSInterface
  - تست اعتبار سنجی داده‌ها
  - تست عملکرد (Performance Metrics)

## 📊 مانیتورینگ عملکرد

### Performance Monitoring
- هر عملیات زمان اجرای خود را اندازه‌گیری می‌کند
- خطاها به صورت خودکار log می‌شوند
- مصرف حافظه تخمین زده می‌شود

### Error Handling
- خطاها به صورت user-friendly نمایش داده می‌شوند
- جزئیات کامل در console ذخیره می‌شود
- امکان recovery از خطاها وجود دارد

## 🔍 ابزارهای Debug

### Debug Panel
- نمایش ۱۰ log آخر
- دسته‌بندی بر اساس نوع (info, warn, error, success)
- timestamp دقیق با فرمت فارسی

### Error Notifications
- نمایش popup برای خطاهای کاربر
- auto-hide پس از ۵ ثانیه
- امکان dismiss کردن دستی

### Console Logs
- تمام logها در console مرورگر
- دسته‌بندی مناسب با رنگ
- اطلاعات اضافی در objectها

## 🧪 تست‌های موجود

### ۱. CSInterface Connection Test
- بررسی اتصال به Illustrator
- تست دریافت Host Environment
- تأیید صحت راه‌اندازی

### ۲. Data Validation Test
- تست اعتبار سنجی داده‌های طرح‌ها
- بررسی فیلدهای required
- پاکسازی داده‌های نامعتبر

### ۳. Performance Metrics Test
- اندازه‌گیری تعداد logها
- محاسبه uptime
- تخمین مصرف حافظه

## 🚨 خطاهای رایج و راه‌حل‌ها

### "پاسخ خالی از ExtendScript"
- Illustrator را restart کنید
- Debug mode را فعال کنید
- ExtendScript Debugger را باز کنید

### "هیچ آیتمی انتخاب نشده"
- ابتدا در Illustrator آیتم‌ها را انتخاب کنید
- مطمئن شوید Illustrator فعال است

### "خطا در پردازش JSON"
- داده‌های ذخیره شده ممکن است خراب باشند
- کاتالوگ را refresh کنید

## 📈 بهینه‌سازی عملکرد

### نکات سرعت
- از فیلترها برای محدود کردن نمایش استفاده کنید
- تعداد طرح‌ها را کمتر از ۱۰۰۰ نگه دارید
- Illustrator را هر چند وقت یک بار restart کنید

### نکات حافظه
- logها به طور خودکار پاک می‌شوند (بعد از ۱۰۰ ورودی)
- عملیات‌های قدیمی پاک می‌شوند (بعد از ۳۰ ثانیه)
- از memory leak جلوگیری شده است

## 🔧 تنظیمات پیشرفته

### تغییر سطح Logging
```javascript
// در console
extension.log('پیام تست', 'debug');
```

### مشاهده Performance Data
```javascript
// در console
console.log(extension.performance);
```

### پاک کردن تمام Logها
```javascript
// در console
extension.logs = [];
extension.updateDebugPanel();
```

## 📞 پشتیبانی

اگر با مشکل مواجه شدید:
1. Debug Panel را فعال کنید
2. خطاها را در console بررسی کنید
3. تست‌ها را اجرا کنید
4. اطلاعات را برای توسعه‌دهنده ارسال کنید
