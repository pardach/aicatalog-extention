// Initialize JSON utilities for ExtendScript
// این فایل برای مقداردهی اولیه JSON در ExtendScript استفاده می‌شود

// تابع JSON.stringify برای ExtendScript
function JSONStringify(obj) {
    try {
        if (obj === null) {
            return "null";
        }
        
        if (obj === undefined) {
            return "undefined";
        }
        
        if (typeof obj === "string") {
            return '"' + obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
        }
        
        if (typeof obj === "number") {
            return obj.toString();
        }
        
        if (typeof obj === "boolean") {
            return obj.toString();
        }
        
        if (obj instanceof Array) {
            var result = "[";
            for (var i = 0; i < obj.length; i++) {
                if (i > 0) result += ",";
                result += JSONStringify(obj[i]);
            }
            result += "]";
            return result;
        }
        
        if (typeof obj === "object") {
            var result = "{";
            var first = true;
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (!first) result += ",";
                    result += '"' + key + '":' + JSONStringify(obj[key]);
                    first = false;
                }
            }
            result += "}";
            return result;
        }
        
        return '"' + obj.toString() + '"';
        
    } catch (e) {
        $.writeln("JSONStringify Error: " + e.message);
        return '{"error":"JSONStringify failed"}';
    }
}

// ایجاد شئ JSON برای ExtendScript
var JSON = {
    stringify: JSONStringify
};

// Export برای استفاده در سایر فایل‌ها
$.global.JSON = JSON;

$.writeln("JSON utilities initialized successfully");
