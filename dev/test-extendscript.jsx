// Test ExtendScript Functions
// این فایل را در ExtendScript Toolkit یا Illustrator اجرا کنید

#target illustrator

// ========== تست توابع ExtendScript ==========

function testBasicFunctions() {
    try {
        $.writeln("=== شروع تست ExtendScript ===");

        // تست وجود توابع
        if (typeof getAllSymbolsData === 'function') {
            $.writeln("✅ تابع getAllSymbolsData موجود است");
        } else {
            $.writeln("❌ تابع getAllSymbolsData یافت نشد");
        }

        if (typeof batchRegisterDesigns === 'function') {
            $.writeln("✅ تابع batchRegisterDesigns موجود است");
        } else {
            $.writeln("❌ تابع batchRegisterDesigns یافت نشد");
        }

        // تست سند فعال
        if (app.documents.length > 0) {
            var doc = app.activeDocument;
            $.writeln("✅ سند فعال: " + doc.name);
            $.writeln("تعداد Symbols: " + doc.symbols.length);
        } else {
            $.writeln("⚠️ هیچ سندی باز نیست");
        }

        // تست JSON
        try {
            var testObject = { test: "value", number: 123 };
            var jsonString = JSON.stringify(testObject);
            $.writeln("✅ JSON.stringify کار می‌کند: " + jsonString);

            var parsedObject = JSON.parse(jsonString);
            $.writeln("✅ JSON.parse کار می‌کند: " + parsedObject.test);
        } catch (jsonError) {
            $.writeln("❌ خطا در JSON: " + jsonError.message);
        }

        $.writeln("=== پایان تست ExtendScript ===");

    } catch (e) {
        $.writeln("❌ خطا در تست: " + e.message);
    }
}

// اجرای تست
testBasicFunctions();
