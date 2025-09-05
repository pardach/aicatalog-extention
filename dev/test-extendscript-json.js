// تست سریع JSON در ExtendScript
// این فایل برای تست عملکرد stringify function است

function testStringify() {
    // تابع stringify که در ExtendScript استفاده می‌شود
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

    // تست stringify
    var testObj = {
        success: true,
        message: "تست موفق",
        data: {
            version: "1.0",
            items: ["item1", "item2"]
        }
    };

    var result = stringify(testObj);
    console.log('Stringify result:', result);

    // تست parse
    try {
        var parsed = JSON.parse(result);
        console.log('Parse successful:', parsed);
    } catch (e) {
        console.error('Parse failed:', e.message);
    }
}

// اجرای تست
testStringify();
