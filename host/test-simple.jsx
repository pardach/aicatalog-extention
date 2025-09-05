// تست ساده ExtendScript برای بررسی رفع مشکلات
// این فایل برای تست عملکرد ExtendScript استفاده می‌شود

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

function testSimpleExtendScript() {
    try {
        // تست دسترسی به app
        var appVersion = app.version;
        var appLocale = app.locale;
        var documentsCount = app.documents.length;

        var result = {
            success: true,
            message: "تست ساده ExtendScript موفق",
            appVersion: appVersion,
            appLocale: appLocale,
            documentsCount: documentsCount,
            timestamp: new Date().toString()
        };

        // تست دسترسی به سند فعال
        if (app.documents.length > 0) {
            var doc = app.activeDocument;
            result.activeDocument = {
                name: doc.name,
                width: doc.width,
                height: doc.height,
                layersCount: doc.layers.length,
                selectionCount: doc.selection ? doc.selection.length : 0,
                symbolsCount: doc.symbols.length
            };
        } else {
            result.activeDocument = null;
        }

        return JSON.stringify(result);

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
testSimpleExtendScript();
