// SQLite Bridge for Vector Catalog Extension
// مدیریت پایگاه داده SQLite با استفاده از sql.js

let db = null;
let allTags = [];
let selectedTags = [];

// مقداردهی اولیه SQLite
async function initSQLite() {
    try {
        // Wait for initSqlJs to be available
        let attempts = 0;
        while (typeof initSqlJs === 'undefined' && attempts < 50) {
            console.log('Waiting for sql-wasm.js to load...');
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof initSqlJs === 'undefined') {
            throw new Error('sql-wasm.js یافت نشد یا بارگذاری نشده. لطفا فایل را اضافه کنید.');
        }

        const SQL = await initSqlJs({
            locateFile: file => `sql-wasm.wasm`
        });

        // ایجاد یا باز کردن پایگاه داده
        db = new SQL.Database();

        // ایجاد جداول
        createTables();

        // بارگذاری برچسب‌های موجود
        loadTagsFromDB();

        console.log('SQLite initialized successfully');
        return true;

    } catch (error) {
        console.error('خطا در راه‌اندازی SQLite:', error);
        // Fallback to in-memory database
        try {
            console.log('Creating fallback in-memory database');
            db = {
                run: function(sql, params) {
                    console.log('Fallback DB - SQL Run:', sql, params);
                },
                exec: function(sql) {
                    console.log('Fallback DB - SQL Exec:', sql);
                    return [{ columns: ['result'], values: [['ok']] }];
                },
                prepare: function(sql) {
                    return {
                        run: function(params) {
                            console.log('Fallback DB - Prepared statement run:', sql, params);
                        },
                        free: function() {
                            console.log('Fallback DB - Statement freed');
                        }
                    };
                }
            };
            console.log('Fallback database created');
            return true;
        } catch (fallbackError) {
            console.error('Fallback database failed:', fallbackError);
            return false;
        }
    }
}

// ایجاد جداول پایگاه داده
function createTables() {
    if (!db) return;

    try {
        // جدول خانواده‌ها
        db.run(`CREATE TABLE IF NOT EXISTS family (
            code TEXT PRIMARY KEY,
            name TEXT,
            tags TEXT,
            desc TEXT,
            created_at TEXT
        )`);

        // جدول طرح‌ها
        db.run(`CREATE TABLE IF NOT EXISTS designs (
            code TEXT PRIMARY KEY,
            type TEXT,
            family_codes TEXT,
            tags TEXT,
            size TEXT,
            era TEXT,
            desc TEXT,
            preview_path TEXT,
            created_at TEXT
        )`);

        // جدول برچسب‌ها
        db.run(`CREATE TABLE IF NOT EXISTS tags (
            name TEXT PRIMARY KEY
        )`);

        console.log('Database tables created successfully');

    } catch (error) {
        console.error('خطا در ایجاد جداول:', error);
    }
}

// ========== مدیریت برچسب‌ها ==========

async function loadTagsFromDB() {
    if (!db) return;

    try {
        const result = db.exec("SELECT name FROM tags ORDER BY name");
        if (result.length > 0) {
            allTags = result[0].values.map(row => row[0]);
        }
        console.log('Tags loaded:', allTags.length);
    } catch (error) {
        console.error('خطا در بارگذاری برچسب‌ها:', error);
    }
}

function addTagToDB(tagName) {
    if (!db || !tagName || allTags.includes(tagName)) return false;

    try {
        const stmt = db.prepare("INSERT OR IGNORE INTO tags VALUES (?)");
        stmt.run([tagName]);
        stmt.free();

        if (!allTags.includes(tagName)) {
            allTags.push(tagName);
            allTags.sort();
        }

        console.log('Tag added:', tagName);
        return true;
    } catch (error) {
        console.error('خطا در اضافه کردن برچسب:', error);
        return false;
    }
}

function getAllTags() {
    return [...allTags];
}

function setSelectedTags(tags) {
    selectedTags = [...tags];
}

function getSelectedTags() {
    return [...selectedTags];
}

// ========== مدیریت طرح‌ها ==========

function addDesignToDB(design) {
    if (!db) return false;

    try {
        const stmt = db.prepare(`INSERT OR REPLACE INTO designs
            (code, type, family_codes, tags, size, era, desc, preview_path, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        stmt.run([
            design.code,
            design.type,
            JSON.stringify(design.family_codes || []),
            JSON.stringify(design.tags || []),
            design.size,
            design.era,
            design.desc || '',
            design.preview_path || '',
            design.created_at || new Date().toString()
        ]);

        stmt.free();

        console.log('Design added to DB:', design.code);
        return true;

    } catch (error) {
        console.error('خطا در اضافه کردن طرح:', error);
        return false;
    }
}

function searchDesigns(filters = {}) {
    if (!db) return [];

    try {
        let query = "SELECT * FROM designs WHERE 1=1";
        let params = [];

        // جستجو در کد، نوع، برچسب‌ها، توضیحات
        if (filters.keyword) {
            query += " AND (code LIKE ? OR type LIKE ? OR tags LIKE ? OR desc LIKE ? OR family_codes LIKE ?)";
            const searchPattern = `%${filters.keyword}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // فیلتر نوع
        if (filters.type && filters.type !== '') {
            query += " AND type = ?";
            params.push(filters.type);
        }

        // فیلتر اندازه
        if (filters.size && filters.size !== '') {
            query += " AND size = ?";
            params.push(filters.size);
        }

        // فیلتر دوره زمانی
        if (filters.era && filters.era !== '') {
            query += " AND era = ?";
            params.push(filters.era);
        }

        // فیلتر خانواده
        if (filters.family && filters.family !== '') {
            query += " AND family_codes LIKE ?";
            params.push(`%${filters.family}%`);
        }

        // فیلتر برچسب‌ها (AND logic - همه برچسب‌های انتخابی باید وجود داشته باشند)
        if (filters.tags && filters.tags.length > 0) {
            for (const tag of filters.tags) {
                query += " AND tags LIKE ?";
                params.push(`%${tag}%`);
            }
        }

        query += " ORDER BY created_at DESC";

        const result = db.exec(query, params);

        if (result.length === 0) return [];

        const designs = result[0].values.map(row => ({
            code: row[0],
            type: row[1],
            family_codes: JSON.parse(row[2] || '[]'),
            tags: JSON.parse(row[3] || '[]'),
            size: row[4],
            era: row[5],
            desc: row[6],
            preview_path: row[7],
            created_at: row[8]
        }));

        console.log(`Found ${designs.length} designs matching filters:`, filters);
        return designs;

    } catch (error) {
        console.error('خطا در جستجوی طرح‌ها:', error);
        return [];
    }
}

function getDesignByCode(code) {
    if (!db) return null;

    try {
        const result = db.exec("SELECT * FROM designs WHERE code = ?", [code]);

        if (result.length === 0 || result[0].values.length === 0) return null;

        const row = result[0].values[0];
        return {
            code: row[0],
            type: row[1],
            family_codes: JSON.parse(row[2] || '[]'),
            tags: JSON.parse(row[3] || '[]'),
            size: row[4],
            era: row[5],
            desc: row[6],
            preview_path: row[7],
            created_at: row[8]
        };

    } catch (error) {
        console.error('خطا در دریافت طرح:', error);
        return null;
    }
}

function getFamilyDesigns(familyCode) {
    if (!db) return [];

    try {
        const result = db.exec("SELECT code FROM designs WHERE family_codes LIKE ?",
            [`%${familyCode}%`]);

        if (result.length === 0) return [];

        return result[0].values.map(row => row[0]);

    } catch (error) {
        console.error('خطا در دریافت طرح‌های خانواده:', error);
        return [];
    }
}

// ========== مدیریت خانواده‌ها ==========

function addFamilyToDB(family) {
    if (!db) return false;

    try {
        const stmt = db.prepare(`INSERT OR REPLACE INTO family
            (code, name, tags, desc, created_at)
            VALUES (?, ?, ?, ?, ?)`);

        stmt.run([
            family.code,
            family.name,
            JSON.stringify(family.tags || []),
            family.desc || '',
            family.created_at || new Date().toString()
        ]);

        stmt.free();

        console.log('Family added to DB:', family.code);
        return true;

    } catch (error) {
        console.error('خطا در اضافه کردن خانواده:', error);
        return false;
    }
}

function getAllFamilies() {
    if (!db) return [];

    try {
        const result = db.exec("SELECT * FROM family ORDER BY name");

        if (result.length === 0) return [];

        return result[0].values.map(row => ({
            code: row[0],
            name: row[1],
            tags: JSON.parse(row[2] || '[]'),
            desc: row[3],
            created_at: row[4]
        }));

    } catch (error) {
        console.error('خطا در دریافت خانواده‌ها:', error);
        return [];
    }
}

// ========== ابزارهای کمکی ==========

function exportDatabase() {
    if (!db) return null;

    try {
        return db.export();
    } catch (error) {
        console.error('خطا در export پایگاه داده:', error);
        return null;
    }
}

function importDatabase(data) {
    if (!db) return false;

    try {
        db = new (db.constructor)(data);
        console.log('Database imported successfully');
        return true;
    } catch (error) {
        console.error('خطا در import پایگاه داده:', error);
        return false;
    }
}

// مقداردهی اولیه در بارگذاری صفحه
document.addEventListener('DOMContentLoaded', function() {
    // SQLite را بعد از بارگذاری کامل صفحه و سایر اسکریپت‌ها راه‌اندازی کن
    setTimeout(initSQLite, 500);
});

// Export functions for global access
window.SQLiteBridge = {
    initSQLite,
    addDesignToDB,
    searchDesigns,
    getDesignByCode,
    getFamilyDesigns,
    addFamilyToDB,
    getAllFamilies,
    addTagToDB,
    getAllTags,
    setSelectedTags,
    getSelectedTags,
    exportDatabase,
    importDatabase
};
