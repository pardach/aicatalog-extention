// ExtendScript برای ثبت Symbol جدید با JSON در Note
// این فایل توسط UI فراخوانی می‌شود

// بارگذاری JSON utilities
try {
    var extensionPath = $.getenv("EXTENSION_PATH") || "C:/Users/pardach/AppData/Roaming/Adobe/CEP/extensions/new-illustrator-extension";
    $.evalFile(extensionPath + "/host/init-json.jsx");
} catch (e) {
    $.writeln("Warning: Could not load JSON utilities, using fallback");
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

// addSymbol.jsx started - بدون $.writeln برای جلوگیری از اختلال در JSON

// تابع جایگزین برای JSON.stringify در ExtendScript
function stringify(obj) {
    try {
        if (obj === null) return "null";
        if (typeof obj === "string") return '"' + obj.replace(/"/g, '\\"') + '"';
        if (typeof obj === "number" || typeof obj === "boolean") return String(obj);

        if (Array.isArray(obj)) {
            var items = [];
            for (var i = 0; i < obj.length; i++) {
                items.push(stringify(obj[i]));
            }
            return "[" + items.join(",") + "]";
        }

        if (typeof obj === "object") {
            var pairs = [];
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    pairs.push('"' + key + '":' + stringify(obj[key]));
                }
            }
            return "{" + pairs.join(",") + "}";
        }

        return '"' + String(obj) + '"';
    } catch (e) {
        return '{"error":"Failed to stringify object"}';
    }
}

function addSymbol(){
    try {
        if(app.documents.length === 0) {
            return JSON.stringify({
                success: false,
                error: "هیچ سندی باز نیست"
            });
        }

        var doc = app.activeDocument;
        var sel = doc.selection;

        if(sel.length === 0) {
            return JSON.stringify({
                success: false,
                error: "هیچ آیتمی انتخاب نشده است"
            });
        }

        // تولید کد یکتا - بررسی تمام نام‌های Symbol موجود
        var existingCodes = [];
        var existingNames = [];
        
        // بررسی تمام Symbol های موجود در سند
        for (var i = 0; i < doc.symbols.length; i++) {
            var symbol = doc.symbols[i];
            existingNames.push(symbol.name);
            
            // همچنین کدهای موجود در note را نیز بررسی کن
            if (symbol.note) {
                try {
                    var noteData = parseJSON(symbol.note);
                    if (noteData && noteData.code) {
                        existingCodes.push(noteData.code);
                    }
                } catch (e) {
                    // Continue
                }
            }
        }

        // تابع کمکی برای بررسی وجود کد یا نام
        function codeExists(code, codes, names) {
            // بررسی در کدهای موجود
            for (var i = 0; i < codes.length; i++) {
                if (codes[i] === code) {
                    return true;
                }
            }
            // بررسی در نام‌های موجود
            for (var i = 0; i < names.length; i++) {
                if (names[i] === code) {
                    return true;
                }
            }
            return false;
        }

        var code;
        var counter = 1;
        do {
            code = "G" + ("000" + counter).slice(-3);
            counter++;
        } while (codeExists(code, existingCodes, existingNames) && counter < 1000);

        if (counter >= 1000) {
            return JSON.stringify({
                success: false,
                error: "تعداد طرح‌های گل بیش از حد مجاز است"
            });
        }

        // ایجاد Symbol
        var symbol;
        try {
            // روش 1: ایجاد Symbol بدون نام و سپس تغییر نام (ایمن‌تر)
            symbol = doc.symbols.add(sel[0]);
            
            // تلاش برای تنظیم نام
            try {
                symbol.name = code;
            } catch (nameError) {
                // اگر نام تداخل داشت، از نام موقت استفاده کن
                var tempName = "temp_" + code + "_" + new Date().getTime();
                symbol.name = tempName;
                
                // تلاش مجدد برای تغییر نام
                try {
                    symbol.name = code;
                } catch (e2) {
                    // اگر باز هم تداخل داشت، از نام موقت استفاده کن
                    symbol.name = tempName;
                }
            }
        } catch (e1) {
            return JSON.stringify({
                success: false,
                error: "خطا در ایجاد Symbol: " + e1.message
            });
        }

        // محاسبه اندازه اتوماتیک
        var dimensions = calculateItemSize(sel[0]);

        // داده‌های کامل طرح
        var designData = {
            code: code,
            type: "گل",
            family_codes: [code],
            tags: [], // برچسب‌ها بعداً از UI اضافه می‌شوند
            size: dimensions.size,
            dimensions: {
                width: dimensions.width,
                height: dimensions.height,
                area: dimensions.area
            },
            era: "جدید",
            desc: "",
            preview_path: "previews/" + code + ".png",
            created_at: new Date().toString()
        };

        // ذخیره JSON کامل در Note
        symbol.note = JSON.stringify(designData);

        // ایجاد فولدر previews اگر وجود ندارد
        var previewsFolder = new Folder("~/Desktop/previews");
        if (!previewsFolder.exists) {
            previewsFolder.create();
        }

        // خروجی PNG برای پیش‌نمایش
        try {
            var file = new File(previewsFolder + "/" + code + ".png");
            var options = new ExportOptionsPNG24();
            options.transparency = true;
            options.artBoardClipping = false;
            options.horizontalScale = 100;
            options.verticalScale = 100;

            // تنظیم اندازه خروجی
            var exportRect = sel[0].visibleBounds;
            options.verticalScale = Math.min(100, 200 / (exportRect[2] - exportRect[0]) * 100);
            options.horizontalScale = options.verticalScale;

            doc.selection = sel;
            doc.exportFile(file, ExportType.PNG24, options);

            designData.preview_path = file.fsName;

        } catch (exportError) {
            // خطا در خروجی PNG - ادامه بدون پیش‌نمایش
        }

        // بازگشت داده‌ها برای ذخیره در SQLite
        return JSON.stringify({
            success: true,
            design: designData,
            message: "نماد " + code + " با موفقیت ثبت شد"
        });

    } catch (e) {
        // $.writeln("خطا در addSymbol: " + e.message); // کامنت شده برای جلوگیری از اختلال در JSON
        return JSON.stringify({
            success: false,
            error: "خطا در ثبت نماد: " + e.message,
            line: e.line
        });
    }
}

// تابع کمکی برای محاسبه اندازه
function calculateItemSize(item) {
    try {
        var bounds = item.visibleBounds;

        if (!bounds || bounds.length < 4) {
            return {
                width: 0,
                height: 0,
                area: 0,
                size: 'ناشناخته'
            };
        }

        var width = Math.abs(bounds[2] - bounds[0]);
        var height = Math.abs(bounds[1] - bounds[3]);
        var area = width * height;

        var size;
        if (area < 10000) {
            size = 'کوچک';
        } else if (area < 50000) {
            size = 'متوسط';
        } else {
            size = 'بزرگ';
        }

        return {
            width: Math.round(width * 100) / 100,
            height: Math.round(height * 100) / 100,
            area: Math.round(area * 100) / 100,
            size: size
        };

    } catch (e) {
        return {
            width: 0,
            height: 0,
            area: 0,
            size: 'ناشناخته',
            error: e.message
        };
    }
}

// تابع کمکی برای parse JSON
function parseJSON(str) {
    try {
        if (!str || typeof str !== 'string') {
            return null;
        }

        str = str.trim();

        if (str === '') {
            return null;
        }

        var result = eval('(' + str + ')');

        if (typeof result === 'object' && result !== null) {
            return result;
        }

        return null;
    } catch (e) {
        $.writeln('ParseJSON Error: ' + e.message + ' for string: ' + str.substring(0, 100));
        return null;
    }
}

// اجرای تابع و بازگشت نتیجه
addSymbol();
