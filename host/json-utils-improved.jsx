// JSON utilities بهبود یافته برای ExtendScript
// پیاده‌سازی امن و قابل اعتماد توابع JSON برای ExtendScript

// تابع JSON.stringify بهبود یافته برای ExtendScript
function JSONStringify(obj) {
    try {
        if (obj === null) {
            return "null";
        }
        
        if (obj === undefined) {
            return "undefined";
        }
        
        if (typeof obj === "string") {
            // Escape special characters properly
            var escaped = obj
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/\t/g, '\\t');
            return '"' + escaped + '"';
        }
        
        if (typeof obj === "number") {
            if (isNaN(obj)) return "null";
            if (!isFinite(obj)) return "null";
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
        
        return '"' + String(obj) + '"';
        
    } catch (e) {
        $.writeln("JSONStringify Error: " + e.message);
        return '{"error":"JSONStringify failed","message":"' + e.message + '"}';
    }
}

// تابع JSON.parse بهبود یافته برای ExtendScript
function JSONParse(str) {
    try {
        if (!str || typeof str !== "string") {
            return null;
        }
        
        str = str.trim();
        
        if (str === "null") return null;
        if (str === "true") return true;
        if (str === "false") return false;
        if (str === "undefined") return undefined;
        
        // Parse numbers
        if (/^-?\d+\.?\d*$/.test(str)) {
            return parseFloat(str);
        }
        
        // Parse strings
        if (str.charAt(0) === '"' && str.charAt(str.length - 1) === '"') {
            return str.slice(1, -1)
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\')
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\t/g, '\t');
        }
        
        // Parse arrays
        if (str.charAt(0) === '[' && str.charAt(str.length - 1) === ']') {
            var content = str.slice(1, -1).trim();
            if (content === "") return [];
            
            var result = [];
            var depth = 0;
            var current = "";
            var inString = false;
            var escapeNext = false;
            
            for (var i = 0; i < content.length; i++) {
                var char = content.charAt(i);
                
                if (escapeNext) {
                    current += char;
                    escapeNext = false;
                    continue;
                }
                
                if (char === '\\') {
                    escapeNext = true;
                    current += char;
                    continue;
                }
                
                if (char === '"') {
                    inString = !inString;
                    current += char;
                    continue;
                }
                
                if (!inString) {
                    if (char === '[' || char === '{') {
                        depth++;
                        current += char;
                    } else if (char === ']' || char === '}') {
                        depth--;
                        current += char;
                    } else if (char === ',' && depth === 0) {
                        result.push(JSONParse(current.trim()));
                        current = "";
                        continue;
                    }
                }
                
                current += char;
            }
            
            if (current.trim() !== "") {
                result.push(JSONParse(current.trim()));
            }
            
            return result;
        }
        
        // Parse objects
        if (str.charAt(0) === '{' && str.charAt(str.length - 1) === '}') {
            var content = str.slice(1, -1).trim();
            if (content === "") return {};
            
            var result = {};
            var depth = 0;
            var current = "";
            var inString = false;
            var escapeNext = false;
            var key = "";
            var value = "";
            var expectingColon = false;
            
            for (var i = 0; i < content.length; i++) {
                var char = content.charAt(i);
                
                if (escapeNext) {
                    current += char;
                    escapeNext = false;
                    continue;
                }
                
                if (char === '\\') {
                    escapeNext = true;
                    current += char;
                    continue;
                }
                
                if (char === '"') {
                    inString = !inString;
                    current += char;
                    continue;
                }
                
                if (!inString) {
                    if (char === '[' || char === '{') {
                        depth++;
                        current += char;
                    } else if (char === ']' || char === '}') {
                        depth--;
                        current += char;
                    } else if (char === ':' && depth === 0 && !expectingColon) {
                        key = current.trim();
                        current = "";
                        expectingColon = true;
                        continue;
                    } else if (char === ',' && depth === 0 && expectingColon) {
                        value = current.trim();
                        result[JSONParse(key)] = JSONParse(value);
                        current = "";
                        expectingColon = false;
                        continue;
                    }
                }
                
                current += char;
            }
            
            if (current.trim() !== "" && expectingColon) {
                value = current.trim();
                result[JSONParse(key)] = JSONParse(value);
            }
            
            return result;
        }
        
        return null;
        
    } catch (e) {
        $.writeln("JSONParse Error: " + e.message);
        return null;
    }
}

// تابع امن برای parse JSON که از eval استفاده نمی‌کند
function safeJSONParse(str) {
    try {
        return JSONParse(str);
    } catch (e) {
        $.writeln("Safe JSON Parse Error: " + e.message);
        return null;
    }
}

// تابع اعتبارسنجی JSON
function isValidJSON(str) {
    try {
        if (!str || typeof str !== "string") return false;
        
        var trimmed = str.trim();
        if (trimmed === "") return false;
        
        // بررسی ساختار اولیه
        if ((trimmed.charAt(0) === '{' && trimmed.charAt(trimmed.length - 1) === '}') ||
            (trimmed.charAt(0) === '[' && trimmed.charAt(trimmed.length - 1) === ']')) {
            
            // تلاش برای parse
            var result = JSONParse(trimmed);
            return result !== null;
        }
        
        return false;
    } catch (e) {
        return false;
    }
}

// تابع کمکی برای ایجاد JSON response استاندارد
function createJSONResponse(success, data, error) {
    var response = {
        success: success,
        timestamp: new Date().toString()
    };
    
    if (success) {
        if (data) {
            response.data = data;
        }
        response.message = "عملیات موفق";
    } else {
        response.error = error || "خطای ناشناخته";
        response.message = "عملیات ناموفق";
    }
    
    return JSONStringify(response);
}

// تابع کمکی برای ایجاد JSON response برای طرح‌ها
function createDesignResponse(design, message) {
    return createJSONResponse(true, {
        design: design,
        message: message || "طرح با موفقیت پردازش شد"
    });
}

// تابع کمکی برای ایجاد JSON response برای خطا
function createErrorResponse(error, context) {
    return createJSONResponse(false, null, context ? context + ": " + error : error);
}

// ایجاد شئ JSON برای ExtendScript
var JSON = {
    stringify: JSONStringify,
    parse: JSONParse,
    safeParse: safeJSONParse,
    isValid: isValidJSON,
    createResponse: createJSONResponse,
    createDesignResponse: createDesignResponse,
    createErrorResponse: createErrorResponse
};

// Export برای استفاده در سایر فایل‌ها
$.global.JSON = JSON;

// تست عملکرد JSON
function testJSONFunctions() {
    try {
        var testObj = {
            success: true,
            message: "تست موفق",
            data: {
                version: "1.0",
                items: ["item1", "item2"],
                nested: {
                    value: 123,
                    flag: true
                }
            }
        };
        
        var jsonString = JSON.stringify(testObj);
        $.writeln("JSON Stringify Test: " + jsonString);
        
        var parsedObj = JSON.parse(jsonString);
        $.writeln("JSON Parse Test: " + (parsedObj ? "Success" : "Failed"));
        
        var isValid = JSON.isValid(jsonString);
        $.writeln("JSON Validation Test: " + (isValid ? "Valid" : "Invalid"));
        
        return true;
    } catch (e) {
        $.writeln("JSON Test Error: " + e.message);
        return false;
    }
}

$.writeln("JSON utilities improved initialized successfully");
