// Settings Manager برای Vector Catalog Extension
// مدیریت تنظیمات، پشتیبان‌گیری و همگام‌سازی

class SettingsManager {
    constructor() {
        this.settings = {
            // تنظیمات پایگاه داده
            database: {
                autoSync: true,
                syncInterval: 30000, // 30 ثانیه
                backupInterval: 3600000, // 1 ساعت
                maxBackups: 10
            },
            
            // تنظیمات پیش‌نمایش
            preview: {
                enabled: true,
                quality: 'medium', // low, medium, high
                size: 200, // پیکسل
                format: 'png',
                path: '~/Desktop/previews'
            },
            
            // تنظیمات کدگذاری
            coding: {
                autoGenerate: true,
                prefixFormat: 'G####', // G0001, B0001, etc.
                startNumber: 1,
                padding: 3
            },
            
            // تنظیمات Arrange
            arrange: {
                defaultSpacing: 150,
                defaultRows: 2,
                defaultCols: 3,
                rememberLast: true
            },
            
            // تنظیمات UI
            ui: {
                theme: 'auto', // auto, light, dark
                language: 'fa',
                showDebug: false,
                compactMode: false
            },
            
            // تنظیمات همگام‌سازی
            sync: {
                autoSyncOnStart: true,
                conflictResolution: 'ask', // ask, note, sqlite, merge
                backupBeforeSync: true
            }
        };
        
        this.loadSettings();
    }
    
    // بارگذاری تنظیمات از localStorage
    loadSettings() {
        try {
            const saved = localStorage.getItem('vectorCatalogSettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.settings = { ...this.settings, ...parsed };
            }
        } catch (error) {
            console.error('خطا در بارگذاری تنظیمات:', error);
        }
    }
    
    // ذخیره تنظیمات در localStorage
    saveSettings() {
        try {
            localStorage.setItem('vectorCatalogSettings', JSON.stringify(this.settings));
            return true;
        } catch (error) {
            console.error('خطا در ذخیره تنظیمات:', error);
            return false;
        }
    }
    
    // دریافت تنظیمات
    getSetting(path) {
        const keys = path.split('.');
        let value = this.settings;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return null;
            }
        }
        
        return value;
    }
    
    // تنظیم مقدار
    setSetting(path, value) {
        const keys = path.split('.');
        let current = this.settings;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
        this.saveSettings();
    }
    
    // بازنشانی تنظیمات به حالت پیش‌فرض
    resetSettings() {
        this.settings = {
            database: {
                autoSync: true,
                syncInterval: 30000,
                backupInterval: 3600000,
                maxBackups: 10
            },
            preview: {
                enabled: true,
                quality: 'medium',
                size: 200,
                format: 'png',
                path: '~/Desktop/previews'
            },
            coding: {
                autoGenerate: true,
                prefixFormat: 'G####',
                startNumber: 1,
                padding: 3
            },
            arrange: {
                defaultSpacing: 150,
                defaultRows: 2,
                defaultCols: 3,
                rememberLast: true
            },
            ui: {
                theme: 'auto',
                language: 'fa',
                showDebug: false,
                compactMode: false
            },
            sync: {
                autoSyncOnStart: true,
                conflictResolution: 'ask',
                backupBeforeSync: true
            }
        };
        
        this.saveSettings();
    }
    
    // ========== مدیریت پشتیبان‌گیری ==========
    
    async createBackup() {
        try {
            if (!window.SQLiteBridge) {
                throw new Error('SQLite Bridge در دسترس نیست');
            }
            
            const backup = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                settings: { ...this.settings },
                database: null,
                notes: null
            };
            
            // پشتیبان‌گیری از پایگاه داده
            try {
                backup.database = window.SQLiteBridge.exportDatabase();
            } catch (e) {
                console.warn('خطا در پشتیبان‌گیری پایگاه داده:', e);
            }
            
            // پشتیبان‌گیری از Note ها
            try {
                if (window.extension && window.extension.csInterface) {
                    const script = 'backupNotes()';
                    await new Promise((resolve, reject) => {
                        window.extension.csInterface.evalScript(script, (result) => {
                            try {
                                const response = JSON.parse(result);
                                if (response.success) {
                                    backup.notes = response.backup;
                                    resolve();
                                } else {
                                    reject(new Error(response.error));
                                }
                            } catch (e) {
                                reject(e);
                            }
                        });
                    });
                }
            } catch (e) {
                console.warn('خطا در پشتیبان‌گیری Note ها:', e);
            }
            
            // ذخیره پشتیبان
            const backupKey = `backup_${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify(backup));
            
            // حذف پشتیبان‌های قدیمی
            this.cleanupOldBackups();
            
            return {
                success: true,
                backupKey: backupKey,
                timestamp: backup.timestamp,
                message: 'پشتیبان‌گیری با موفقیت انجام شد'
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // بازیابی از پشتیبان
    async restoreFromBackup(backupKey) {
        try {
            const backupData = localStorage.getItem(backupKey);
            if (!backupData) {
                throw new Error('پشتیبان یافت نشد');
            }
            
            const backup = JSON.parse(backupData);
            
            // بازیابی تنظیمات
            if (backup.settings) {
                this.settings = { ...this.settings, ...backup.settings };
                this.saveSettings();
            }
            
            // بازیابی پایگاه داده
            if (backup.database && window.SQLiteBridge) {
                try {
                    window.SQLiteBridge.importDatabase(backup.database);
                } catch (e) {
                    console.warn('خطا در بازیابی پایگاه داده:', e);
                }
            }
            
            // بازیابی Note ها
            if (backup.notes && window.extension && window.extension.csInterface) {
                const script = `restoreFromBackup(${JSON.stringify(backup.notes)})`;
                await new Promise((resolve, reject) => {
                    window.extension.csInterface.evalScript(script, (result) => {
                        try {
                            const response = JSON.parse(result);
                            if (response.success) {
                                resolve();
                            } else {
                                reject(new Error(response.error));
                            }
                        } catch (e) {
                            reject(e);
                        }
                    });
                });
            }
            
            return {
                success: true,
                message: 'بازیابی با موفقیت انجام شد'
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // دریافت لیست پشتیبان‌ها
    getBackupList() {
        const backups = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('backup_')) {
                try {
                    const backupData = JSON.parse(localStorage.getItem(key));
                    backups.push({
                        key: key,
                        timestamp: backupData.timestamp,
                        version: backupData.version || '1.0'
                    });
                } catch (e) {
                    // Skip invalid backups
                }
            }
        }
        
        return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    // حذف پشتیبان‌های قدیمی
    cleanupOldBackups() {
        const maxBackups = this.getSetting('database.maxBackups') || 10;
        const backups = this.getBackupList();
        
        if (backups.length > maxBackups) {
            const toDelete = backups.slice(maxBackups);
            toDelete.forEach(backup => {
                localStorage.removeItem(backup.key);
            });
        }
    }
    
    // ========== مدیریت همگام‌سازی ==========
    
    async performSync() {
        try {
            if (!window.extension || !window.extension.csInterface) {
                throw new Error('Extension در دسترس نیست');
            }
            
            const results = {
                success: true,
                steps: [],
                conflicts: []
            };
            
            // مرحله 1: همگام‌سازی از Note به SQLite
            const noteSyncScript = 'syncFromNotesToSQLite()';
            const noteSyncResult = await new Promise((resolve, reject) => {
                window.extension.csInterface.evalScript(noteSyncScript, (result) => {
                    try {
                        resolve(JSON.parse(result));
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            
            if (noteSyncResult.success) {
                results.steps.push('همگام‌سازی از Note به SQLite موفق');
                
                // ذخیره در SQLite
                if (window.SQLiteBridge && noteSyncResult.designs) {
                    noteSyncResult.designs.forEach(design => {
                        window.SQLiteBridge.addDesignToDB(design);
                    });
                    
                    if (noteSyncResult.families) {
                        noteSyncResult.families.forEach(family => {
                            window.SQLiteBridge.addFamilyToDB(family);
                        });
                    }
                }
            } else {
                results.steps.push('خطا در همگام‌سازی از Note: ' + noteSyncResult.error);
            }
            
            // مرحله 2: تشخیص تعارضات
            if (window.SQLiteBridge) {
                const sqliteDesigns = window.SQLiteBridge.searchDesigns({});
                const conflicts = this.detectConflicts(noteSyncResult.designs || [], sqliteDesigns);
                results.conflicts = conflicts;
                
                if (conflicts.length > 0) {
                    results.steps.push(`${conflicts.length} تعارض یافت شد`);
                }
            }
            
            return results;
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // تشخیص تعارضات
    detectConflicts(noteDesigns, sqliteDesigns) {
        const conflicts = [];
        const noteMap = {};
        const sqliteMap = {};
        
        // ایجاد map از Note ها
        noteDesigns.forEach(design => {
            noteMap[design.code] = design;
        });
        
        // ایجاد map از SQLite
        sqliteDesigns.forEach(design => {
            sqliteMap[design.code] = design;
        });
        
        // بررسی تعارضات
        Object.keys(noteMap).forEach(code => {
            const noteDesign = noteMap[code];
            const sqliteDesign = sqliteMap[code];
            
            if (sqliteDesign) {
                const differences = [];
                const fieldsToCompare = ['type', 'family_codes', 'tags', 'size', 'era', 'desc'];
                
                fieldsToCompare.forEach(field => {
                    if (JSON.stringify(noteDesign[field]) !== JSON.stringify(sqliteDesign[field])) {
                        differences.push({
                            field: field,
                            noteValue: noteDesign[field],
                            sqliteValue: sqliteDesign[field]
                        });
                    }
                });
                
                if (differences.length > 0) {
                    conflicts.push({
                        code: code,
                        type: 'conflict',
                        differences: differences
                    });
                }
            } else {
                conflicts.push({
                    code: code,
                    type: 'note_only',
                    design: noteDesign
                });
            }
        });
        
        // بررسی طرح‌هایی که فقط در SQLite وجود دارند
        Object.keys(sqliteMap).forEach(code => {
            if (!noteMap[code]) {
                conflicts.push({
                    code: code,
                    type: 'sqlite_only',
                    design: sqliteMap[code]
                });
            }
        });
        
        return conflicts;
    }
    
    // ========== Export/Import ==========
    
    exportSettings() {
        return {
            settings: this.settings,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
    }
    
    importSettings(data) {
        try {
            if (data.settings) {
                this.settings = { ...this.settings, ...data.settings };
                this.saveSettings();
                return { success: true, message: 'تنظیمات با موفقیت وارد شد' };
            } else {
                return { success: false, error: 'فرمت داده نامعتبر است' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // ========== ابزارهای کمکی ==========
    
    // دریافت آمار سیستم
    getSystemStats() {
        const stats = {
            settings: Object.keys(this.settings).length,
            backups: this.getBackupList().length,
            localStorage: {
                used: 0,
                available: 0
            }
        };
        
        // محاسبه استفاده از localStorage
        try {
            let used = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('vectorCatalog')) {
                    used += localStorage.getItem(key).length;
                }
            }
            stats.localStorage.used = used;
            stats.localStorage.available = 5 * 1024 * 1024 - used; // 5MB limit
        } catch (e) {
            // Ignore errors
        }
        
        return stats;
    }
    
    // پاک کردن داده‌های قدیمی
    cleanup() {
        try {
            // حذف پشتیبان‌های قدیمی
            this.cleanupOldBackups();
            
            // حذف داده‌های موقت
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('temp_')) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
            
            return {
                success: true,
                message: `${keysToRemove.length} فایل موقت حذف شد`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export برای دسترسی جهانی
window.SettingsManager = SettingsManager;
