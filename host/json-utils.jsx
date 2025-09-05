// JSON utilities for ExtendScript
// پیاده‌سازی توابع JSON برای ExtendScript

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

// تابع JSON.parse برای ExtendScript
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
            return str.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
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

// ایجاد شئ JSON برای ExtendScript
var JSON = {
    stringify: JSONStringify,
    parse: JSONParse
};

// Export برای استفاده در سایر فایل‌ها
$.global.JSON = JSON;
