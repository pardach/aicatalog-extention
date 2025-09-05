// ExtendScript for Adobe Illustrator - Vector Catalog Extension
// این فایل برای ارتباط بین پنل HTML و Illustrator استفاده می‌شود

// ========== UTILITY FUNCTIONS ==========

function parseJSON(str) {
    try {
        if (!str || typeof str !== 'string') {
            return null;
        }

        // پاکسازی رشته
        str = str.trim();

        if (str === '') {
            return null;
        }

        // استفاده از eval برای JSON parsing (ExtendScript)
        var result = eval('(' + str + ')');

        // بررسی اینکه نتیجه object معتبر است
        if (typeof result === 'object' && result !== null) {
            return result;
        }

        return null;
    } catch (e) {
        $.writeln('ParseJSON Error: ' + e.message + ' for string: ' + str.substring(0, 100));
        return null;
    }
}

function generateCode(type, existingCodes) {
    var typeMap = {
        'گل': 'G',
        'بنک': 'B',
        'درزی': 'D',
        'تک': 'T',
        'کپ گل': 'K'
    };

    var prefix = typeMap[type] || 'X';
    var maxNumber = 0;

    for (var i = 0; i < existingCodes.length; i++) {
        if (existingCodes[i].type === type) {
            var code = existingCodes[i].code;
            if (code && code.length > 1) {
                var num = parseInt(code.substring(1));
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        }
    }

    var nextNumber = maxNumber + 1;
    return prefix + ("000" + nextNumber).slice(-3);
}

// تابع اندازه‌گیری اتوماتیک آیتم انتخاب شده
function calculateItemSize(item) {
    try {
        var bounds = item.visibleBounds; // [left, top, right, bottom]

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

        // تعیین اندازه بر اساس مساحت (پیکسل مربع)
        var size;
        if (area < 10000) {
            size = 'کوچک';
        } else if (area < 50000) {
            size = 'متوسط';
        } else {
            size = 'بزرگ';
        }

        return {
            width: Math.round(width * 100) / 100, // گرد به دو رقم اعشار
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

// ========== SYMBOL MANAGEMENT ==========

function getAllSymbolsData() {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            throw new Error('هیچ سندی باز نیست');
        }

        var designs = [];
        var families = [];
        var processedSymbols = 0;
        var invalidSymbols = 0;

        // خواندن اطلاعات از Symbols
        for (var i = 0; i < doc.symbols.length; i++) {
            try {
                var symbol = doc.symbols[i];
                var note = symbol.note;

                if (note && note.trim() !== '') {
                    var data = parseJSON(note);
                    if (data && data.code && typeof data.code === 'string') {
                        // Validate required fields
                        if (!data.type || !Array.isArray(data.family_codes)) {
                            data.family_codes = data.family_codes || [];
                        }

                        if (!Array.isArray(data.tags)) {
                            data.tags = data.tags || [];
                        }

                        designs.push(data);
                        processedSymbols++;

                        // اگر گل است، خانواده هم اضافه کن
                        if (data.type === 'گل') {
                            families.push({
                                code: data.code,
                                name: data.code + ' - ' + (data.tags.slice(0, 2).join(', ') || 'خانواده')
                            });
                        }
                    } else {
                        invalidSymbols++;
                    }
                }
            } catch (symbolError) {
                invalidSymbols++;
                // Continue processing other symbols
            }
        }

        var result = {
            success: true,
            designs: designs,
            families: families,
            stats: {
                totalSymbols: doc.symbols.length,
                processedSymbols: processedSymbols,
                invalidSymbols: invalidSymbols
            }
        };

        // تست JSON stringify
        var jsonString = JSON.stringify(result);
        return jsonString;

    } catch (e) {
        // اگر JSON.stringify شکست خورد، پاسخ ساده برمی‌گردانیم
        try {
            return '{"success":false,"error":"خطا در دریافت اطلاعات Symbols: ' + e.message + '","line":' + (e.line || 0) + '}';
        } catch (jsonError) {
            // اگر حتی این هم شکست خورد، پاسخ بسیار ساده
            return 'Error: ' + e.message;
        }
    }
}

function batchRegisterDesigns(data) {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            throw new Error('هیچ سندی باز نیست');
        }

        var selectedItems = doc.selection;
        var registeredCount = 0;
        var failedCount = 0;

        if (selectedItems.length === 0) {
            return '{"success":false,"error":"هیچ آیتمی انتخاب نشده است"}';
        }

        // Validate input data
        if (!data || !data.type) {
            throw new Error('نوع طرح مشخص نشده است');
        }

        // دریافت کدهای موجود
        var existingCodes = [];
        for (var i = 0; i < doc.symbols.length; i++) {
            try {
                var symbol = doc.symbols[i];
                if (symbol.note) {
                    var noteData = parseJSON(symbol.note);
                    if (noteData && noteData.code) {
                        existingCodes.push(noteData);
                    }
                }
            } catch (e) {
                // Continue with other symbols
            }
        }

        // ثبت هر آیتم انتخاب شده
        for (var j = 0; j < selectedItems.length; j++) {
            try {
                var item = selectedItems[j];

                // اندازه‌گیری اتوماتیک
                var dimensions = calculateItemSize(item);

                // تولید کد جدید
                var code = generateCode(data.type, existingCodes);

                // ایجاد Symbol
                var symbol = doc.symbols.add(item);
                symbol.name = code;

                // ذخیره اطلاعات در Note
                var symbolData = {
                    code: code,
                    type: data.type,
                    family_codes: data.family_codes || [],
                    tags: data.tags || [],
                    size: dimensions.size, // اندازه اتوماتیک
                    dimensions: {
                        width: dimensions.width,
                        height: dimensions.height,
                        area: dimensions.area
                    },
                    era: data.era || 'جدید',
                    desc: data.desc || '',
                    created: new Date().toString()
                };

                symbol.note = JSON.stringify(symbolData);
                registeredCount++;

                // اضافه کردن به لیست موجود
                existingCodes.push(symbolData);

            } catch (itemError) {
                failedCount++;
                // Continue with other items
            }
        }

        var result = {
            success: true,
            registeredCount: registeredCount,
            failedCount: failedCount,
            totalProcessed: selectedItems.length,
            message: registeredCount + " طرح با موفقیت ثبت شد" +
                    (failedCount > 0 ? " (" + failedCount + " ناموفق)" : "")
        };

        return JSON.stringify(result);

    } catch (e) {
        // پاسخ ساده در صورت خطا
        try {
            return '{"success":false,"error":"خطا در ثبت گروهی: ' + e.message + '","line":' + (e.line || 0) + '}';
        } catch (jsonError) {
            return 'Error: ' + e.message;
        }
    }
}

function placeDesign(data) {
    try {
        var doc = app.activeDocument;
        var symbol = null;

        // یافتن Symbol با کد مشخص
        for (var i = 0; i < doc.symbols.length; i++) {
            if (doc.symbols[i].name === data.code) {
                symbol = doc.symbols[i];
                break;
            }
        }

        if (!symbol) {
            return JSON.stringify({
                success: false,
                error: "نماد یافت نشد: " + data.code
            });
        }

        // قرار دادن روی آرتبورد
        var placedItem = doc.symbolItems.add(symbol);
        placedItem.position = [100, 100]; // موقعیت پیش‌فرض

        return JSON.stringify({
            success: true,
            message: "نماد " + data.code + " روی آرتبورد قرار گرفت"
        });

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.message
        });
    }
}

function placeFamily(data) {
    try {
        var doc = app.activeDocument;
        var placedCount = 0;

        // یافتن همه اعضای خانواده
        for (var i = 0; i < doc.symbols.length; i++) {
            var symbol = doc.symbols[i];
            if (symbol.note) {
                try {
                    var symbolData = parseJSON(symbol.note);
                    if (symbolData && symbolData.family_codes &&
                        symbolData.family_codes.indexOf(data.code) !== -1) {

                        // قرار دادن عضو خانواده
                        var placedItem = doc.symbolItems.add(symbol);
                        placedItem.position = [100 + (placedCount * 150), 100];
                        placedCount++;
                    }
                } catch (e) {}
            }
        }

        return JSON.stringify({
            success: true,
            placedCount: placedCount,
            message: placedCount + " عضو خانواده روی آرتبورد قرار گرفت"
        });

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.message
        });
    }
}

function placeMultipleDesigns(data) {
    try {
        var doc = app.activeDocument;
        var symbol = null;
        var placedCount = 0;

        // یافتن Symbol
        for (var i = 0; i < doc.symbols.length; i++) {
            if (doc.symbols[i].name === data.code) {
                symbol = doc.symbols[i];
                break;
            }
        }

        if (!symbol) {
            return JSON.stringify({
                success: false,
                error: "نماد یافت نشد: " + data.code
            });
        }

        var rows = data.arrange.rows || 1;
        var cols = data.arrange.cols || 1;
        var spacing = 150;

        // قرار دادن در شبکه
        for (var row = 0; row < rows; row++) {
            for (var col = 0; col < cols; col++) {
                var placedItem = doc.symbolItems.add(symbol);
                placedItem.position = [
                    100 + (col * spacing),
                    100 + (row * spacing)
                ];
                placedCount++;
            }
        }

        return JSON.stringify({
            success: true,
            placedCount: placedCount,
            message: placedCount + " کپی در شبکه " + rows + "×" + cols + " قرار گرفت"
        });

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.message
        });
    }
}

function placeMultipleSymbols(data) {
    try {
        var doc = app.activeDocument;
        var codes = data.codes || [data.code];
        var placedCount = 0;
        var spacing = 150;
        var cols = Math.ceil(Math.sqrt(codes.length)); // بهترین چینش مربعی
        var row = 0;
        var col = 0;

        for (var i = 0; i < codes.length; i++) {
            var symbol = null;
            var code = codes[i];

            // یافتن Symbol با کد مشخص
            for (var j = 0; j < doc.symbols.length; j++) {
                if (doc.symbols[j].name === code) {
                    symbol = doc.symbols[j];
                    break;
                }
            }

            if (symbol) {
                // قرار دادن Symbol روی آرتبورد
                var placedItem = doc.symbolItems.add(symbol);
                placedItem.position = [
                    100 + (col * spacing),
                    100 + (row * spacing)
                ];
                placedCount++;

                // Grid Layout
                col++;
                if (col >= cols) {
                    col = 0;
                    row++;
                }
            }
        }

        return JSON.stringify({
            success: true,
            placedCount: placedCount,
            message: placedCount + " نماد روی آرتبورد قرار گرفت"
        });

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.message
        });
    }
}

// تابع بروزرسانی اندازه‌های طرح‌های موجود
function updateExistingDesignSizes() {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            throw new Error('هیچ سندی باز نیست');
        }

        var updatedCount = 0;

        for (var i = 0; i < doc.symbols.length; i++) {
            var symbol = doc.symbols[i];

            if (symbol.note && symbol.note.trim() !== '') {
                try {
                    var data = parseJSON(symbol.note);
                    if (data && data.code && !data.dimensions) {
                        // اندازه‌گیری اتوماتیک برای طرح‌های قدیمی
                        var dimensions = calculateItemSize(symbol);

                        if (dimensions.size !== 'ناشناخته') {
                            data.size = dimensions.size;
                            data.dimensions = {
                                width: dimensions.width,
                                height: dimensions.height,
                                area: dimensions.area
                            };

                            symbol.note = JSON.stringify(data);
                            updatedCount++;
                        }
                    }
                } catch (e) {
                    // Continue with other symbols
                }
            }
        }

        return JSON.stringify({
            success: true,
            updatedCount: updatedCount,
            message: updatedCount + " طرح بروزرسانی شد"
        });

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: 'خطا در بروزرسانی اندازه‌ها: ' + e.message,
            details: {
                line: e.line,
                file: e.fileName
            }
        });
    }
}

function connectDesignsToFamilies(data) {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            throw new Error('هیچ سندی باز نیست');
        }

        var codes = data.codes || [];
        var family_codes = data.family_codes || [];
        var updatedCount = 0;

        for (var i = 0; i < doc.symbols.length; i++) {
            var symbol = doc.symbols[i];

            if (symbol.note && symbol.note.trim() !== '') {
                try {
                    var symbolData = parseJSON(symbol.note);
                    if (symbolData && symbolData.code && codes.indexOf(symbolData.code) !== -1) {
                        // اضافه کردن خانواده‌های جدید به خانواده‌های موجود
                        var currentFamilies = symbolData.family_codes || [];
                        var newFamilies = [];

                        // اضافه کردن خانواده‌های موجود
                        for (var j = 0; j < currentFamilies.length; j++) {
                            if (newFamilies.indexOf(currentFamilies[j]) === -1) {
                                newFamilies.push(currentFamilies[j]);
                            }
                        }

                        // اضافه کردن خانواده‌های جدید
                        for (var k = 0; k < family_codes.length; k++) {
                            if (newFamilies.indexOf(family_codes[k]) === -1) {
                                newFamilies.push(family_codes[k]);
                            }
                        }

                        symbolData.family_codes = newFamilies;
                        symbol.note = JSON.stringify(symbolData);
                        updatedCount++;
                    }
                } catch (e) {
                    // Continue with other symbols
                }
            }
        }

        var result = {
            success: true,
            updatedCount: updatedCount,
            message: updatedCount + " طرح به خانواده‌ها متصل شد"
        };

        return JSON.stringify(result);

    } catch (e) {
        try {
            return '{"success":false,"error":"خطا در اتصال به خانواده‌ها: ' + e.message + '","line":' + (e.line || 0) + '}';
        } catch (jsonError) {
            return 'Error: ' + e.message;
        }
    }
}

function batchUpdateDesigns(data) {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            throw new Error('هیچ سندی باز نیست');
        }

        var codes = data.codes || [];
        var updates = data.updates || {};
        var updatedCount = 0;

        for (var i = 0; i < doc.symbols.length; i++) {
            var symbol = doc.symbols[i];

            if (symbol.note && symbol.note.trim() !== '') {
                try {
                    var symbolData = parseJSON(symbol.note);
                    if (symbolData && symbolData.code && codes.indexOf(symbolData.code) !== -1) {
                        var hasChanges = false;

                        // اعمال بروزرسانی‌ها
                        if (updates.tags && updates.tags.length > 0) {
                            var currentTags = symbolData.tags || [];
                            var newTags = [];

                            // اضافه کردن برچسب‌های موجود
                            for (var j = 0; j < currentTags.length; j++) {
                                if (newTags.indexOf(currentTags[j]) === -1) {
                                    newTags.push(currentTags[j]);
                                }
                            }

                            // اضافه کردن برچسب‌های جدید
                            for (var k = 0; k < updates.tags.length; k++) {
                                if (newTags.indexOf(updates.tags[k]) === -1) {
                                    newTags.push(updates.tags[k]);
                                }
                            }

                            symbolData.tags = newTags;
                            hasChanges = true;
                        }

                        if (updates.family_codes && updates.family_codes.length > 0) {
                            var currentFamilies = symbolData.family_codes || [];
                            var newFamilies = [];

                            // اضافه کردن خانواده‌های موجود
                            for (var j = 0; j < currentFamilies.length; j++) {
                                if (newFamilies.indexOf(currentFamilies[j]) === -1) {
                                    newFamilies.push(currentFamilies[j]);
                                }
                            }

                            // اضافه کردن خانواده‌های جدید
                            for (var k = 0; k < updates.family_codes.length; k++) {
                                if (newFamilies.indexOf(updates.family_codes[k]) === -1) {
                                    newFamilies.push(updates.family_codes[k]);
                                }
                            }

                            symbolData.family_codes = newFamilies;
                            hasChanges = true;
                        }

                        if (updates.size) {
                            symbolData.size = updates.size;
                            hasChanges = true;
                        }

                        if (updates.era) {
                            symbolData.era = updates.era;
                            hasChanges = true;
                        }

                        if (hasChanges) {
                            symbol.note = JSON.stringify(symbolData);
                            updatedCount++;
                        }
                    }
                } catch (e) {
                    // Continue with other symbols
                }
            }
        }

        var result = {
            success: true,
            updatedCount: updatedCount,
            message: updatedCount + " طرح بروزرسانی شد"
        };

        return JSON.stringify(result);

    } catch (e) {
        try {
            return '{"success":false,"error":"خطا در ویرایش گروهی: ' + e.message + '","line":' + (e.line || 0) + '}';
        } catch (jsonError) {
            return 'Error: ' + e.message;
        }
    }
}

function syncNotesWithDatabase() {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            throw new Error('هیچ سندی باز نیست');
        }

        var stats = {
            added: 0,
            updated: 0,
            unchanged: 0,
            errors: 0,
            totalSymbols: doc.symbols.length
        };

        // Get all symbols data from Illustrator
        var illustratorSymbols = [];
        for (var i = 0; i < doc.symbols.length; i++) {
            try {
                var symbol = doc.symbols[i];
                if (symbol.note && symbol.note.trim() !== '') {
                    var symbolData = parseJSON(symbol.note);
                    if (symbolData && symbolData.code) {
                        illustratorSymbols.push(symbolData);
                    }
                }
            } catch (e) {
                stats.errors++;
                // Continue with other symbols
            }
        }

        // Here we would normally compare with SQLite database
        // For now, we'll just update the symbols with latest metadata
        for (var j = 0; j < illustratorSymbols.length; j++) {
            try {
                var symbolData = illustratorSymbols[j];

                // Update symbol with latest data
                // This is a simplified version - in real implementation,
                // you would compare with SQLite data and merge/update accordingly

                // For now, just ensure all required fields are present
                if (!symbolData.family_codes) {
                    symbolData.family_codes = [];
                }
                if (!symbolData.tags) {
                    symbolData.tags = [];
                }
                if (!symbolData.size) {
                    symbolData.size = 'متوسط';
                }
                if (!symbolData.era) {
                    symbolData.era = 'جدید';
                }

                // Update the symbol's note
                var symbol = null;
                for (var k = 0; k < doc.symbols.length; k++) {
                    if (doc.symbols[k].name === symbolData.code) {
                        symbol = doc.symbols[k];
                        break;
                    }
                }

                if (symbol) {
                    symbol.note = JSON.stringify(symbolData);
                    stats.updated++;
                } else {
                    stats.errors++;
                }

            } catch (e) {
                stats.errors++;
            }
        }

        var result = {
            success: true,
            stats: stats,
            message: "همگام‌سازی با موفقیت انجام شد"
        };

        return JSON.stringify(result);

    } catch (e) {
        try {
            return '{"success":false,"error":"خطا در همگام‌سازی: ' + e.message + '","line":' + (e.line || 0) + '}';
        } catch (jsonError) {
            return 'Error: ' + e.message;
        }
    }
}

// ========== LEGACY FUNCTIONS ==========

function getSelectedItems() {
    try {
        var doc = app.activeDocument;
        var selectedItems = doc.selection;

        if (selectedItems.length === 0) {
            return JSON.stringify({
                success: false,
                error: "هیچ آیتمی انتخاب نشده است"
            });
        }

        var items = [];
        for (var i = 0; i < selectedItems.length; i++) {
            var item = selectedItems[i];
            items.push({
                name: item.name || "آیتم " + (i + 1),
                type: item.typename,
                index: i
            });
        }

        return JSON.stringify({
            success: true,
            items: items,
            count: items.length
        });

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.message
        });
    }
}

function getDocumentInfo() {
    try {
        var doc = app.activeDocument;
        return JSON.stringify({
            success: true,
            name: doc.name,
            width: doc.width,
            height: doc.height,
            colorSpace: doc.documentColorSpace
        });
    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.message
        });
    }
}

function showAlert(message) {
    try {
        alert(message);
        return JSON.stringify({ success: true });
    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.message
        });
    }
}

// ========== MAIN DISPATCHER ==========

function executeFunction(functionName, params) {
    try {
        var result;

        switch (functionName) {
            case 'getSelectedItems':
                result = getSelectedItems();
                break;
            case 'getDocumentInfo':
                result = getDocumentInfo();
                break;
            case 'showAlert':
                result = showAlert(params || "پیام تست");
                break;
            case 'getAllSymbolsData':
                result = getAllSymbolsData();
                break;
            case 'batchRegisterDesigns':
                result = batchRegisterDesigns(parseJSON(params));
                break;
            case 'placeDesign':
                result = placeDesign(parseJSON(params));
                break;
            case 'placeFamily':
                result = placeFamily(parseJSON(params));
                break;
            case 'placeMultipleDesigns':
                result = placeMultipleDesigns(parseJSON(params));
                break;
            case 'placeMultipleSymbols':
                result = placeMultipleSymbols(parseJSON(params));
                break;
            case 'updateExistingDesignSizes':
                result = updateExistingDesignSizes();
                break;
            case 'connectDesignsToFamilies':
                result = connectDesignsToFamilies(parseJSON(params));
                break;
            case 'batchUpdateDesigns':
                result = batchUpdateDesigns(parseJSON(params));
                break;
            case 'syncNotesWithDatabase':
                result = syncNotesWithDatabase();
                break;
            default:
                result = JSON.stringify({
                    success: false,
                    error: "تابع یافت نشد: " + functionName
                });
        }

        // اطمینان از اینکه نتیجه JSON معتبر است
        if (typeof result === 'string' && (result.trim().startsWith('{') || result.trim().startsWith('['))) {
            // تست JSON parsing
            try {
                JSON.parse(result);
                return result;
            } catch (jsonError) {
                $.writeln('JSON Error in executeFunction: ' + jsonError.message);
                return '{"success":false,"error":"خطای JSON در تابع ' + functionName + '"}';
            }
        } else {
            // اگر نتیجه رشته نیست یا JSON نیست
            $.writeln('Invalid result type in executeFunction: ' + typeof result);
            return '{"success":false,"error":"نتیجه نامعتبر از تابع ' + functionName + '"}';
        }

    } catch (e) {
        $.writeln('Error in executeFunction: ' + e.message);
        try {
            return '{"success":false,"error":"خطا در اجرای تابع: ' + e.message + '"}';
        } catch (jsonError) {
            return 'Error: ' + e.message;
        }
    }
}
