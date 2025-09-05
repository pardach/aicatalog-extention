// ExtendScript Debug Helper
// این فایل را در ExtendScript Toolkit یا Illustrator اجرا کنید

#target illustrator

// ========================================
// ExtendScript Debug & Development Tools
// ========================================

// تنظیمات debugging
$.level = 2; // 0 = Off, 1 = Error, 2 = Warning, 3 = Info
$.strict = true;

// تابع اصلی debug
function debugCEPConnection() {
    try {
        var result = "";
        result += "=== CEP Debug Information ===\n\n";

        // بررسی اتصال CEP
        result += "CEP Available: " + (typeof BridgeTalk !== 'undefined') + "\n";

        // اطلاعات BridgeTalk
        if (typeof BridgeTalk !== 'undefined') {
            result += "BridgeTalk Version: " + BridgeTalk.version + "\n";
            result += "Application: " + BridgeTalk.appName + "\n";
            result += "Version: " + BridgeTalk.appVersion + "\n";
        }

        // اطلاعات Illustrator
        result += "\nIllustrator Info:\n";
        result += "Version: " + app.version + "\n";
        result += "Locale: " + app.locale + "\n";
        result += "Documents: " + app.documents.length + "\n";

        // اطلاعات سیستم
        result += "\nSystem Info:\n";
        result += "OS: " + $.os + "\n";
        result += "Platform: " + $.platform + "\n";

        return result;

    } catch (error) {
        return "Error in debugCEPConnection: " + error.message + "\n" + error.line;
    }
}

// تابع تست Symbols
function debugSymbols() {
    try {
        var result = "=== Symbols Debug ===\n\n";

        if (app.documents.length === 0) {
            return "No documents open!";
        }

        var doc = app.activeDocument;
        result += "Document: " + doc.name + "\n";
        result += "Total Symbols: " + doc.symbols.length + "\n\n";

        for (var i = 0; i < doc.symbols.length; i++) {
            var symbol = doc.symbols[i];
            result += "Symbol " + (i + 1) + ":\n";
            result += "  Name: " + symbol.name + "\n";

            if (symbol.note) {
                try {
                    var data = eval('(' + symbol.note + ')');
                    result += "  Code: " + (data.code || 'N/A') + "\n";
                    result += "  Type: " + (data.type || 'N/A') + "\n";
                    result += "  Family: " + (data.family_codes ? data.family_codes.join(', ') : 'N/A') + "\n";
                } catch (e) {
                    result += "  Note Error: " + e.message + "\n";
                }
            } else {
                result += "  No Note Data\n";
            }
            result += "\n";
        }

        return result;

    } catch (error) {
        return "Error in debugSymbols: " + error.message;
    }
}

// تابع تست خانواده‌ها
function debugFamilies() {
    try {
        var result = "=== Families Debug ===\n\n";

        if (app.documents.length === 0) {
            return "No documents open!";
        }

        var doc = app.activeDocument;
        var families = {};

        for (var i = 0; i < doc.symbols.length; i++) {
            var symbol = doc.symbols[i];

            if (symbol.note) {
                try {
                    var data = eval('(' + symbol.note + ')');
                    if (data.type === 'گل') {
                        families[data.code] = {
                            name: data.code,
                            members: []
                        };
                    }
                } catch (e) {}
            }
        }

        // شمارش اعضای خانواده
        for (var i = 0; i < doc.symbols.length; i++) {
            var symbol = doc.symbols[i];

            if (symbol.note) {
                try {
                    var data = eval('(' + symbol.note + ')');
                    if (data.family_codes) {
                        for (var j = 0; j < data.family_codes.length; j++) {
                            var familyCode = data.family_codes[j];
                            if (families[familyCode]) {
                                families[familyCode].members.push(data.code);
                            }
                        }
                    }
                } catch (e) {}
            }
        }

        result += "Found " + Object.keys(families).length + " families:\n\n";

        for (var familyCode in families) {
            var family = families[familyCode];
            result += "Family: " + family.name + "\n";
            result += "Members: " + family.members.length + "\n";
            result += "Member Codes: " + family.members.join(', ') + "\n\n";
        }

        return result;

    } catch (error) {
        return "Error in debugFamilies: " + error.message;
    }
}

// تابع تست عملکرد
function performanceTest() {
    try {
        var result = "=== Performance Test ===\n\n";
        var startTime = new Date().getTime();

        // تست خواندن Symbols
        var readStart = new Date().getTime();
        var symbolCount = app.activeDocument.symbols.length;
        var readTime = new Date().getTime() - readStart;

        result += "Symbol Read Time: " + readTime + "ms\n";
        result += "Symbol Count: " + symbolCount + "\n";

        // تست پردازش داده‌ها
        var processStart = new Date().getTime();
        var processedCount = 0;

        for (var i = 0; i < app.activeDocument.symbols.length; i++) {
            var symbol = app.activeDocument.symbols[i];
            if (symbol.note) {
                try {
                    var data = eval('(' + symbol.note + ')');
                    processedCount++;
                } catch (e) {}
            }
        }

        var processTime = new Date().getTime() - processStart;
        result += "Data Processing Time: " + processTime + "ms\n";
        result += "Processed Items: " + processedCount + "\n";

        var totalTime = new Date().getTime() - startTime;
        result += "Total Test Time: " + totalTime + "ms\n";

        return result;

    } catch (error) {
        return "Error in performanceTest: " + error.message;
    }
}

// اجرای تست‌ها
function runAllTests() {
    var results = "";

    results += debugCEPConnection() + "\n\n";
    results += debugSymbols() + "\n\n";
    results += debugFamilies() + "\n\n";
    results += performanceTest() + "\n\n";

    results += "=== Test Complete ===";

    return results;
}

// اجرای خودکار
if (typeof $ !== 'undefined' && $.writeln) {
    $.writeln(runAllTests());
} else {
    alert(runAllTests());
}
