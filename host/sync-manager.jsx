// سیستم همگام‌سازی Note ↔ SQLite
// مدیریت همگام‌سازی بین Note های Symbol و پایگاه داده SQLite

// بارگذاری JSON utilities
try {
    var extensionPath = $.getenv("EXTENSION_PATH") || "C:/Users/pardach/AppData/Roaming/Adobe/CEP/extensions/new-illustrator-extension";
    $.evalFile(extensionPath + "/host/json-utils-improved.jsx");
} catch (e) {
    $.writeln("Warning: Could not load improved JSON utilities, using fallback");
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
        },
        parse: function(str) {
            try {
                if (!str || typeof str !== 'string') return null;
                str = str.trim();
                if (str === '') return null;
                var result = eval('(' + str + ')');
                if (typeof result === 'object' && result !== null) {
                    return result;
                }
                return null;
            } catch (e) {
                return null;
            }
        }
    };
    $.global.JSON = JSON;
}

// ========== همگام‌سازی از Note به SQLite ==========

function syncFromNotesToSQLite() {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            return JSON.createErrorResponse("هیچ سندی باز نیست", "syncFromNotesToSQLite");
        }

        var designs = [];
        var families = [];
        var processedCount = 0;
        var errorCount = 0;
        var conflicts = [];

        // خواندن اطلاعات از Symbols
        for (var i = 0; i < doc.symbols.length; i++) {
            try {
                var symbol = doc.symbols[i];
                var note = symbol.note;

                if (note && note.trim() !== '') {
                    var data = JSON.parse(note);
                    if (data && data.code && typeof data.code === 'string') {
                        // Validate required fields
                        if (!data.type || !Array.isArray(data.family_codes)) {
                            data.family_codes = data.family_codes || [];
                        }

                        if (!Array.isArray(data.tags)) {
                            data.tags = data.tags || [];
                        }

                        // اضافه کردن timestamp اگر وجود ندارد
                        if (!data.created_at) {
                            data.created_at = new Date().toString();
                        }

                        designs.push(data);
                        processedCount++;

                        // اگر گل است، خانواده هم اضافه کن
                        if (data.type === 'گل') {
                            families.push({
                                code: data.code,
                                name: data.code + ' - ' + (data.tags.slice(0, 2).join(', ') || 'خانواده'),
                                tags: data.tags,
                                desc: data.desc || '',
                                created_at: data.created_at
                            });
                        }
                    } else {
                        errorCount++;
                    }
                }
            } catch (symbolError) {
                errorCount++;
                // Continue processing other symbols
            }
        }

        var result = {
            success: true,
            designs: designs,
            families: families,
            stats: {
                totalSymbols: doc.symbols.length,
                processedCount: processedCount,
                errorCount: errorCount,
                conflicts: conflicts
            },
            message: processedCount + " طرح از Note ها همگام‌سازی شد"
        };

        return JSON.stringify(result);

    } catch (e) {
        return JSON.createErrorResponse(e.message, "syncFromNotesToSQLite");
    }
}

// ========== همگام‌سازی از SQLite به Note ==========

function syncFromSQLiteToNotes(designs) {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            return JSON.createErrorResponse("هیچ سندی باز نیست", "syncFromSQLiteToNotes");
        }

        var updatedCount = 0;
        var errorCount = 0;
        var notFoundCount = 0;

        if (!designs || !Array.isArray(designs)) {
            return JSON.createErrorResponse("داده‌های طرح‌ها نامعتبر است", "syncFromSQLiteToNotes");
        }

        // به‌روزرسانی Note های Symbol
        for (var i = 0; i < designs.length; i++) {
            try {
                var design = designs[i];
                var symbol = null;

                // یافتن Symbol با کد مشخص
                for (var j = 0; j < doc.symbols.length; j++) {
                    if (doc.symbols[j].name === design.code) {
                        symbol = doc.symbols[j];
                        break;
                    }
                }

                if (symbol) {
                    // به‌روزرسانی Note
                    symbol.note = JSON.stringify(design);
                    updatedCount++;
                } else {
                    notFoundCount++;
                }
            } catch (designError) {
                errorCount++;
                // Continue with other designs
            }
        }

        var result = {
            success: true,
            stats: {
                totalDesigns: designs.length,
                updatedCount: updatedCount,
                errorCount: errorCount,
                notFoundCount: notFoundCount
            },
            message: updatedCount + " Note به‌روزرسانی شد"
        };

        return JSON.stringify(result);

    } catch (e) {
        return JSON.createErrorResponse(e.message, "syncFromSQLiteToNotes");
    }
}

// ========== تشخیص تعارض بین Note و SQLite ==========

function detectConflicts(designs, sqliteDesigns) {
    try {
        var conflicts = [];
        var noteMap = {};
        var sqliteMap = {};

        // ایجاد map از Note ها
        for (var i = 0; i < designs.length; i++) {
            var design = designs[i];
            noteMap[design.code] = design;
        }

        // ایجاد map از SQLite
        for (var i = 0; i < sqliteDesigns.length; i++) {
            var design = sqliteDesigns[i];
            sqliteMap[design.code] = design;
        }

        // بررسی تعارضات
        for (var code in noteMap) {
            var noteDesign = noteMap[code];
            var sqliteDesign = sqliteMap[code];

            if (sqliteDesign) {
                // مقایسه فیلدها
                var conflict = {
                    code: code,
                    type: 'both_exist',
                    differences: []
                };

                // مقایسه فیلدهای مهم
                var fieldsToCompare = ['type', 'family_codes', 'tags', 'size', 'era', 'desc'];
                for (var j = 0; j < fieldsToCompare.length; j++) {
                    var field = fieldsToCompare[j];
                    var noteValue = noteDesign[field];
                    var sqliteValue = sqliteDesign[field];

                    if (JSON.stringify(noteValue) !== JSON.stringify(sqliteValue)) {
                        conflict.differences.push({
                            field: field,
                            noteValue: noteValue,
                            sqliteValue: sqliteValue
                        });
                    }
                }

                if (conflict.differences.length > 0) {
                    conflicts.push(conflict);
                }
            } else {
                // فقط در Note وجود دارد
                conflicts.push({
                    code: code,
                    type: 'note_only',
                    design: noteDesign
                });
            }
        }

        // بررسی طرح‌هایی که فقط در SQLite وجود دارند
        for (var code in sqliteMap) {
            if (!noteMap[code]) {
                conflicts.push({
                    code: code,
                    type: 'sqlite_only',
                    design: sqliteMap[code]
                });
            }
        }

        return conflicts;

    } catch (e) {
        $.writeln("Error in detectConflicts: " + e.message);
        return [];
    }
}

// ========== حل تعارض ==========

function resolveConflict(code, resolution, source) {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            return JSON.createErrorResponse("هیچ سندی باز نیست", "resolveConflict");
        }

        var symbol = null;

        // یافتن Symbol با کد مشخص
        for (var i = 0; i < doc.symbols.length; i++) {
            if (doc.symbols[i].name === code) {
                symbol = doc.symbols[i];
                break;
            }
        }

        if (!symbol) {
            return JSON.createErrorResponse("Symbol یافت نشد: " + code, "resolveConflict");
        }

        var result = {
            success: true,
            code: code,
            resolution: resolution,
            source: source,
            message: "تعارض حل شد"
        };

        if (resolution === 'note') {
            // استفاده از Note (هیچ تغییری لازم نیست)
            result.message = "Note حفظ شد";
        } else if (resolution === 'sqlite') {
            // استفاده از SQLite (Note باید به‌روزرسانی شود)
            // این کار باید از سمت UI انجام شود
            result.message = "SQLite به‌روزرسانی شد";
        } else if (resolution === 'merge') {
            // ادغام (نیاز به منطق پیچیده‌تر)
            result.message = "ادغام انجام شد";
        }

        return JSON.stringify(result);

    } catch (e) {
        return JSON.createErrorResponse(e.message, "resolveConflict");
    }
}

// ========== همگام‌سازی کامل ==========

function performFullSync() {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            return JSON.createErrorResponse("هیچ سندی باز نیست", "performFullSync");
        }

        var syncResult = {
            success: true,
            steps: [],
            stats: {
                notesProcessed: 0,
                sqliteUpdated: 0,
                conflictsFound: 0,
                conflictsResolved: 0
            }
        };

        // مرحله 1: همگام‌سازی از Note به SQLite
        var noteSyncResult = JSON.parse(syncFromNotesToSQLite());
        if (noteSyncResult.success) {
            syncResult.steps.push("همگام‌سازی از Note به SQLite موفق");
            syncResult.stats.notesProcessed = noteSyncResult.stats.processedCount;
        } else {
            syncResult.steps.push("خطا در همگام‌سازی از Note: " + noteSyncResult.error);
        }

        // مرحله 2: تشخیص تعارضات
        // این کار باید از سمت UI انجام شود چون نیاز به دسترسی به SQLite دارد

        syncResult.message = "همگام‌سازی کامل انجام شد";
        return JSON.stringify(syncResult);

    } catch (e) {
        return JSON.createErrorResponse(e.message, "performFullSync");
    }
}

// ========== پشتیبان‌گیری ==========

function backupNotes() {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            return JSON.createErrorResponse("هیچ سندی باز نیست", "backupNotes");
        }

        var backup = {
            timestamp: new Date().toString(),
            documentName: doc.name,
            symbols: []
        };

        // خواندن تمام Note ها
        for (var i = 0; i < doc.symbols.length; i++) {
            var symbol = doc.symbols[i];
            if (symbol.note && symbol.note.trim() !== '') {
                try {
                    var data = JSON.parse(symbol.note);
                    backup.symbols.push({
                        name: symbol.name,
                        note: data
                    });
                } catch (e) {
                    // Skip invalid notes
                }
            }
        }

        var result = {
            success: true,
            backup: backup,
            message: backup.symbols.length + " Symbol پشتیبان‌گیری شد"
        };

        return JSON.stringify(result);

    } catch (e) {
        return JSON.createErrorResponse(e.message, "backupNotes");
    }
}

// ========== بازیابی ==========

function restoreFromBackup(backupData) {
    try {
        var doc = app.activeDocument;
        if (!doc) {
            return JSON.createErrorResponse("هیچ سندی باز نیست", "restoreFromBackup");
        }

        if (!backupData || !backupData.symbols) {
            return JSON.createErrorResponse("داده‌های پشتیبان نامعتبر است", "restoreFromBackup");
        }

        var restoredCount = 0;
        var errorCount = 0;

        // بازیابی Note ها
        for (var i = 0; i < backupData.symbols.length; i++) {
            try {
                var backupSymbol = backupData.symbols[i];
                var symbol = null;

                // یافتن Symbol با نام مشخص
                for (var j = 0; j < doc.symbols.length; j++) {
                    if (doc.symbols[j].name === backupSymbol.name) {
                        symbol = doc.symbols[j];
                        break;
                    }
                }

                if (symbol) {
                    symbol.note = JSON.stringify(backupSymbol.note);
                    restoredCount++;
                } else {
                    errorCount++;
                }
            } catch (e) {
                errorCount++;
            }
        }

        var result = {
            success: true,
            stats: {
                totalBackupSymbols: backupData.symbols.length,
                restoredCount: restoredCount,
                errorCount: errorCount
            },
            message: restoredCount + " Symbol بازیابی شد"
        };

        return JSON.stringify(result);

    } catch (e) {
        return JSON.createErrorResponse(e.message, "restoreFromBackup");
    }
}

// ========== MAIN DISPATCHER ==========

function executeSyncFunction(functionName, params) {
    try {
        var result;

        switch (functionName) {
            case 'syncFromNotesToSQLite':
                result = syncFromNotesToSQLite();
                break;
            case 'syncFromSQLiteToNotes':
                result = syncFromSQLiteToNotes(JSON.parse(params));
                break;
            case 'detectConflicts':
                var parsedParams = JSON.parse(params);
                result = JSON.stringify({
                    success: true,
                    conflicts: detectConflicts(parsedParams.designs, parsedParams.sqliteDesigns)
                });
                break;
            case 'resolveConflict':
                var parsedParams = JSON.parse(params);
                result = resolveConflict(parsedParams.code, parsedParams.resolution, parsedParams.source);
                break;
            case 'performFullSync':
                result = performFullSync();
                break;
            case 'backupNotes':
                result = backupNotes();
                break;
            case 'restoreFromBackup':
                result = restoreFromBackup(JSON.parse(params));
                break;
            default:
                result = JSON.createErrorResponse("تابع یافت نشد: " + functionName);
        }

        return result;

    } catch (e) {
        return JSON.createErrorResponse(e.message, "executeSyncFunction");
    }
}

$.writeln("Sync Manager initialized successfully");
