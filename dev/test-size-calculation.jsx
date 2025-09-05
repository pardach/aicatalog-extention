// Test Size Calculation Script
// این فایل را در ExtendScript Toolkit اجرا کنید

#target illustrator

// ========== تست اندازه‌گیری اتوماتیک ==========

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

function testSizeCalculation() {
    try {
        var doc = app.activeDocument;
        var selectedItems = doc.selection;

        if (selectedItems.length === 0) {
            alert("هیچ آیتمی انتخاب نشده است!");
            return;
        }

        var results = [];

        for (var i = 0; i < selectedItems.length; i++) {
            var item = selectedItems[i];
            var dimensions = calculateItemSize(item);

            results.push({
                item: 'آیتم ' + (i + 1),
                type: item.typename,
                dimensions: dimensions
            });
        }

        // نمایش نتایج
        var message = "=== نتایج اندازه‌گیری ===\n\n";

        for (var j = 0; j < results.length; j++) {
            var result = results[j];
            message += result.item + " (" + result.type + "):\n";
            message += "  اندازه: " + result.dimensions.size + "\n";
            message += "  ابعاد: " + result.dimensions.width + " × " + result.dimensions.height + " px\n";
            message += "  مساحت: " + result.dimensions.area + " px²\n\n";
        }

        alert(message);

    } catch (e) {
        alert("خطا در تست اندازه‌گیری: " + e.message);
    }
}

// اجرای تست
testSizeCalculation();
