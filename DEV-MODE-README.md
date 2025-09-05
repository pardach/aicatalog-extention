# 🔧 Development Mode - راه‌اندازی کامل

## ✅ وضعیت فعلی: Development Mode فعال است!

اکستنشن به صورت پیش‌فرض در حالت توسعه تنظیم شده و نیازی به فعال‌سازی دستی نیست.

## 🌐 آدرس‌های دسترسی مستقیم

### 🚀 دسترسی سریع به همه ابزارها:
```
http://localhost:8206/dev-access.html
```

### آدرس‌های مهم:
- **اکستنشن لوکال:** `http://localhost:8206/index.html`
- **کنسول CEP (Chrome):** `http://localhost:9222`
- **اکستنشن CEP:** `cep://com.yourcompany.newextension.panel/`
- **Debug Panel:** `http://localhost:8206/debug-local.html`

## ⚙️ تنظیمات اعمال شده

### ✅ CEF Command Line (در manifest.xml):
```xml
<CEFCommandLine>
  <Parameter>--enable-nodejs</Parameter>
  <Parameter>--enable-logging</Parameter>
  <Parameter>--log-level=0</Parameter>
  <Parameter>--enable-dev-tools</Parameter>
  <Parameter>--remote-debugging-port=9222</Parameter>
  <Parameter>--user-data-dir=./cef-user-data</Parameter>
</CEFCommandLine>
```

### ✅ Registry Settings (خودکار):
```cmd
# Development Mode
HKCU\Software\Adobe\CSXS.11\PlayerDebugMode = 1

# Logging
HKCU\Software\Adobe\CSXS.11\LogLevel = 0
```

## 🛠️ نحوه استفاده از ابزارها

### ۱. Chrome DevTools Console
1. اکستنشن را باز کنید: `http://localhost:8206/index.html`
2. در Chrome به آدرس `http://localhost:9222` بروید
3. تب Console را باز کنید
4. می‌توانید JavaScript و ExtendScript را debug کنید

### ۲. ExtendScript Console
1. Illustrator را باز کنید
2. از منوی `Window → Utilities → ExtendScript Toolkit` استفاده کنید
3. یا از `File → Scripts → Other Script` در Illustrator

### ۳. Debug Panel داخلی
1. در اکستنشن دکمه 🐛 را کلیک کنید
2. پنل debug در پایین سمت راست باز می‌شود
3. تمام logها به صورت real-time نمایش داده می‌شوند

## 📊 ویژگی‌های Development Mode

### 🎯 Debugging Features:
- ✅ Chrome DevTools Integration
- ✅ ExtendScript Debugging
- ✅ Real-time Logging
- ✅ Error Tracking
- ✅ Performance Monitoring
- ✅ Memory Usage Tracking

### 🔧 Development Tools:
- ✅ Hot Reload (با refresh صفحه)
- ✅ Console Access
- ✅ Network Inspection
- ✅ Source Maps
- ✅ Breakpoints

## 🚀 راه‌اندازی سریع

### گام ۱: اجرای سرور
```cmd
start-debug-server.bat
```

### گام ۲: دسترسی سریع
```
http://localhost:8206/dev-access.html
```

### گام ۳: باز کردن ابزارها
- Chrome DevTools: `http://localhost:9222`
- Extension: `http://localhost:8206/index.html`

## 🐛 عیب‌یابی

### اگر Chrome DevTools باز نمی‌شود:
1. مطمئن شوید اکستنشن باز است
2. پورت ۹۲۲۲ توسط برنامه دیگری استفاده نشده
3. Illustrator را restart کنید

### اگر Console کار نمی‌کند:
1. Developer Mode فعال است
2. فایل `.debug` در جای درست قرار دارد
3. Registry settings اعمال شده‌اند

### اگر Extension بارگذاری نمی‌شود:
1. سرور لوکال در حال اجراست
2. پورت ۸۲۰۶ آزاد است
3. Firewall مسدود نکرده

## 📞 پشتیبانی

برای مشکلات development mode:
1. فایل `dev-access.html` را باز کنید
2. وضعیت اتصال‌ها را بررسی کنید
3. Debug Panel را فعال کنید
4. اطلاعات را برای توسعه‌دهنده ارسال کنید

---

## 🎉 نتیجه

حالا می‌توانید بدون هیچ تنظیمات اضافی از طریق مرورگر کروم به:
- ✅ کنسول CEP دسترسی پیدا کنید
- ✅ ExtendScript را debug کنید
- ✅ عملکرد را مانیتور کنید
- ✅ خطاها را پیگیری کنید

همه چیز به صورت خودکار تنظیم شده! 🚀
