// تست عملکرد addSymbol برای بررسی رفع مشکلات
// این فایل برای تست عملکرد addSymbol استفاده می‌شود

// بارگذاری JSON utilities
try {
    var extensionPath = $.getenv("EXTENSION_PATH") || "C:/Users/pardach/AppData/Roaming/Adobe/CEP/extensions/new-illustrator-extension";
    $.evalFile(extensionPath + "/host/init-json.jsx");
} catch (e) {
    // Fallback JSON implementation
    var JSON = {
        stringify: function(obj) {
            try {
                if (obj === null) return "null";
                if (typeof obj === "string") return '"' + obj.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
                if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
                if (obj instanceof Array) {
                    var items = [];
                    for (var i = 0; i < obj.length; i++) {
                        items.push(JSON.stringify(obj[i]));
                    }
                    return "[" + items.join(",") + "]";
                }
                if (typeof obj === "object") {
                    var pairs = [];
                    for (var key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            pairs.push('"' + key + '":' + JSON.stringify(obj[key]));
                        }
                    }
                    return "{" + pairs.join(",") + "}";
                }
                return '"' + obj.toString().replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
            } catch (e) {
                return '{"error":"stringify failed"}';
            }
        }
    };
    $.global.JSON = JSON;
}

function testAddSymbolFunction() {
    try {
        // بررسی وجود سند
        if (app.documents.length === 0) {
            return JSON.stringify({
                success: false,
                error: "هیچ سندی باز نیست"
            });
        }

        var doc = app.activeDocument;
        var sel = doc.selection;

        // بررسی انتخاب
        if (sel.length === 0) {
            return JSON.stringify({
                success: false,
                error: "هیچ آیتمی انتخاب نشده است"
            });
        }

        // بررسی نام‌های موجود
        var existingNames = [];
        for (var i = 0; i < doc.symbols.length; i++) {
            existingNames.push(doc.symbols[i].name);
        }

        // تولید کد تست
        var testCode = "TEST001";
        var counter = 1;
        while (existingNames.indexOf(testCode) !== -1 && counter < 1000) {
            testCode = "TEST" + ("000" + counter).slice(-3);
            counter++;
        }

        if (counter >= 1000) {
            return JSON.stringify({
                success: false,
                error: "نمی‌توان کد منحصر به فرد تولید کرد"
            });
        }

        // تست ایجاد Symbol
        var symbol;
        try {
            symbol = doc.symbols.add(sel[0]);
            symbol.name = testCode;
        } catch (e) {
            return JSON.stringify({
                success: false,
                error: "خطا در ایجاد Symbol: " + e.message
            });
        }

        // حذف Symbol تست
        try {
            symbol.remove();
        } catch (e) {
            // Continue
        }

        return JSON.stringify({
            success: true,
            message: "تست addSymbol موفق",
            testCode: testCode,
            existingSymbolsCount: doc.symbols.length,
            timestamp: new Date().toString()
        });

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.message,
            line: e.line,
            timestamp: new Date().toString()
        });
    }
}

// اجرای تست
testAddSymbolFunction();
