// SQLite Bridge بهبود یافته برای Vector Catalog Extension
// مدیریت پایگاه داده SQLite با استفاده از sql.js

let db = null;
let allTags = [];
let selectedTags = [];

// مقداردهی اولیه SQLite بهبود یافته
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
            console.warn('initSqlJs not found, using fallback SQL implementation');
            db = createFallbackSQL();
            createTables();
            loadTagsFromDB();
            console.log('Fallback SQLite initialized successfully');
            return true;
        }

        // تلاش برای بارگذاری WASM واقعی
        try {
            const SQL = await initSqlJs({
                locateFile: file => {
                    console.log('Loading WASM file:', file);
                    return `./${file}`;
                }
            });

            // ایجاد یا باز کردن پایگاه داده
            db = new SQL.Database();
            console.log('SQLite WASM loaded successfully');

        } catch (wasmError) {
            console.warn('WASM loading failed, using fallback:', wasmError.message);
            // Fallback to in-memory database
            db = createFallbackSQL();
            console.log('Using fallback SQL implementation');
        }

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
            db = createFallbackSQL();
            console.log('Fallback database created');
            return true;
        } catch (fallbackError) {
            console.error('Fallback database failed:', fallbackError);
            return false;
        }
    }
}

// ایجاد Fallback SQL بهبود یافته
function createFallbackSQL() {
    const memoryDB = {
        designs: [],
        families: [],
        tags: new Set(),
        run: function(sql, params) {
            console.log('Fallback SQL Run:', sql, params);
            return this;
        },
        exec: function(sql) {
            console.log('Fallback SQL Exec:', sql);
            
            // پیاده‌سازی ساده برای SELECT
            if (sql.includes('SELECT * FROM designs')) {
                return [{
                    columns: ['code', 'type', 'family_codes', 'tags', 'size', 'era', 'desc', 'preview_path', 'created_at'],
                    values: this.designs.map(design => [
                        design.code,
                        design.type,
                        JSON.stringify(design.family_codes || []),
                        JSON.stringify(design.tags || []),
                        design.size,
                        design.era,
                        design.desc || '',
                        design.preview_path || '',
                        design.created_at || new Date().toString()
                    ])
                }];
            }
            
            if (sql.includes('SELECT * FROM family')) {
                return [{
                    columns: ['code', 'name', 'tags', 'desc', 'created_at'],
                    values: this.families.map(family => [
                        family.code,
                        family.name,
                        JSON.stringify(family.tags || []),
                        family.desc || '',
                        family.created_at || new Date().toString()
                    ])
                }];
            }
            
            if (sql.includes('SELECT name FROM tags')) {
                return [{
                    columns: ['name'],
                    values: Array.from(this.tags).map(tag => [tag])
                }];
            }
            
            return [{ columns: ['result'], values: [['ok']] }];
        },
        prepare: function(sql) {
            const stmt = {
                sql: sql,
                db: this,
                run: function(params) {
                    console.log('Fallback Prepared statement run:', sql, params);
                    
                    // پیاده‌سازی ساده برای INSERT
                    if (sql.includes('INSERT OR REPLACE INTO designs')) {
                        const design = {
                            code: params[0],
                            type: params[1],
                            family_codes: JSON.parse(params[2] || '[]'),
                            tags: JSON.parse(params[3] || '[]'),
                            size: params[4],
                            era: params[5],
                            desc: params[6],
                            preview_path: params[7],
                            created_at: params[8]
                        };
                        
                        // حذف اگر وجود دارد
                        this.db.designs = this.db.designs.filter(d => d.code !== design.code);
                        // اضافه کردن
                        this.db.designs.push(design);
                    }
                    
                    if (sql.includes('INSERT OR REPLACE INTO family')) {
                        const family = {
                            code: params[0],
                            name: params[1],
                            tags: JSON.parse(params[2] || '[]'),
                            desc: params[3],
                            created_at: params[4]
                        };
                        
                        // حذف اگر وجود دارد
                        this.db.families = this.db.families.filter(f => f.code !== family.code);
                        // اضافه کردن
                        this.db.families.push(family);
                    }
                    
                    if (sql.includes('INSERT OR IGNORE INTO tags')) {
                        this.db.tags.add(params[0]);
                    }
                },
                free: function() {
                    console.log('Fallback Statement freed');
                }
            };
            return stmt;
        },
        export: function() {
            return new Uint8Array(0); // Empty array
        }
    };
    
    return memoryDB;
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

function updateDesignFamilies(code, familyCodes) {
    if (!db) return false;

    try {
        const stmt = db.prepare("UPDATE designs SET family_codes = ? WHERE code = ?");
        stmt.run([JSON.stringify(familyCodes), code]);
        stmt.free();

        console.log('Design families updated:', code, familyCodes);
        return true;

    } catch (error) {
        console.error('خطا در بروزرسانی خانواده‌های طرح:', error);
        return false;
    }
}

function updateDesignBatch(code, updates) {
    if (!db) return false;

    try {
        let setClause = [];
        let values = [];

        if (updates.tags) {
            setClause.push("tags = ?");
            values.push(JSON.stringify(updates.tags));
        }

        if (updates.family_codes) {
            setClause.push("family_codes = ?");
            values.push(JSON.stringify(updates.family_codes));
        }

        if (updates.size) {
            setClause.push("size = ?");
            values.push(updates.size);
        }

        if (updates.era) {
            setClause.push("era = ?");
            values.push(updates.era);
        }

        if (setClause.length === 0) return false;

        values.push(code);

        const stmt = db.prepare(`UPDATE designs SET ${setClause.join(", ")} WHERE code = ?`);
        stmt.run(values);
        stmt.free();

        console.log('Design batch updated:', code, updates);
        return true;

    } catch (error) {
        console.error('خطا در بروزرسانی گروهی طرح:', error);
        return false;
    }
}

// ========== مدیریت برچسب‌ها ==========

function mergeTags(sourceTag, targetTag) {
    if (!db) return false;

    try {
        // Get all designs that have the source tag
        const designsWithSourceTag = db.exec("SELECT code, tags FROM designs WHERE tags LIKE ?",
            [`%${sourceTag}%`]);

        if (designsWithSourceTag.length > 0) {
            const stmt = db.prepare("UPDATE designs SET tags = ? WHERE code = ?");

            designsWithSourceTag[0].values.forEach(row => {
                const code = row[0];
                const tagsStr = row[1];
                let tags = JSON.parse(tagsStr || '[]');

                // Replace source tag with target tag
                tags = tags.map(tag => tag === sourceTag ? targetTag : tag);

                // Remove duplicates
                tags = [...new Set(tags)];

                stmt.run([JSON.stringify(tags), code]);
            });

            stmt.free();
        }

        // Remove source tag from tags table if exists
        const deleteStmt = db.prepare("DELETE FROM tags WHERE name = ?");
        deleteStmt.run([sourceTag]);
        deleteStmt.free();

        console.log('Tags merged:', sourceTag, '->', targetTag);
        return true;

    } catch (error) {
        console.error('خطا در ادغام برچسب‌ها:', error);
        return false;
    }
}

function deleteTag(tagName) {
    if (!db) return false;

    try {
        // Remove tag from all designs
        const designsWithTag = db.exec("SELECT code, tags FROM designs WHERE tags LIKE ?",
            [`%${tagName}%`]);

        if (designsWithTag.length > 0) {
            const stmt = db.prepare("UPDATE designs SET tags = ? WHERE code = ?");

            designsWithTag[0].values.forEach(row => {
                const code = row[0];
                const tagsStr = row[1];
                let tags = JSON.parse(tagsStr || '[]');

                // Remove the tag
                tags = tags.filter(tag => tag !== tagName);

                stmt.run([JSON.stringify(tags), code]);
            });

            stmt.free();
        }

        // Remove tag from tags table
        const deleteStmt = db.prepare("DELETE FROM tags WHERE name = ?");
        deleteStmt.run([tagName]);
        deleteStmt.free();

        console.log('Tag deleted:', tagName);
        return true;

    } catch (error) {
        console.error('خطا در حذف برچسب:', error);
        return false;
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

// ========== همگام‌سازی Note ↔ SQLite ==========

function syncFromExtendScript(designs, families) {
    if (!db) return false;

    try {
        // همگام‌سازی طرح‌ها
        designs.forEach(design => {
            addDesignToDB(design);
        });

        // همگام‌سازی خانواده‌ها
        families.forEach(family => {
            addFamilyToDB(family);
        });

        console.log(`Synced ${designs.length} designs and ${families.length} families from ExtendScript`);
        return true;

    } catch (error) {
        console.error('خطا در همگام‌سازی از ExtendScript:', error);
        return false;
    }
}

function getSyncStatus() {
    if (!db) return { designs: 0, families: 0, tags: 0 };

    try {
        const designsResult = db.exec("SELECT COUNT(*) FROM designs");
        const familiesResult = db.exec("SELECT COUNT(*) FROM family");
        const tagsResult = db.exec("SELECT COUNT(*) FROM tags");

        return {
            designs: designsResult[0]?.values[0][0] || 0,
            families: familiesResult[0]?.values[0][0] || 0,
            tags: tagsResult[0]?.values[0][0] || 0
        };

    } catch (error) {
        console.error('خطا در دریافت وضعیت همگام‌سازی:', error);
        return { designs: 0, families: 0, tags: 0 };
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
    importDatabase,
    syncFromExtendScript,
    getSyncStatus
};
