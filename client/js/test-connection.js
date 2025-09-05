// تست اتصال اکستنشن Vector Catalog به Adobe Illustrator
// این فایل برای تست اتصال CEP و ExtendScript طراحی شده است

class IllustratorConnectionTest {
    constructor() {
        this.csInterface = null;
        this.testResults = [];
        this.initialize();
    }

    initialize() {
        // بررسی وجود CSInterface
        if (typeof CSInterface !== 'undefined') {
            this.csInterface = new CSInterface();
            console.log('✅ CSInterface یافت شد');
        } else {
            console.error('❌ CSInterface یافت نشد - محیط CEP یافت نشد');
            return;
        }

        // شروع تست‌ها
        this.runAllTests();
    }

    // تابع کمکی برای ایجاد ExtendScript با stringify
    createExtendScriptWrapper(code) {
        return `
            try {
                // Fallback JSON implementation
                var JSON = {
                    stringify: function(obj) {
                        try {
                            if (obj === null) return "null";
                            if (typeof obj === "string") return '"' + obj.replace(/"/g, '\\\\"').replace(/\n/g, '\\\\n').replace(/\r/g, '\\\\r') + '"';
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
                            return '"' + obj.toString().replace(/\n/g, '\\\\n').replace(/\r/g, '\\\\r') + '"';
                        } catch (e) {
                            return '{"error":"stringify failed"}';
                        }
                    }
                };
                $.global.JSON = JSON;
                
                ${code}
            } catch (e) {
                JSON.stringify({
                    success: false,
                    error: e.message
                });
            }
        `;
    }

    logTestResult(testName, success, message, data = null) {
        const result = {
            test: testName,
            success: success,
            message: message,
            data: data,
            timestamp: new Date().toLocaleString('fa-IR')
        };

        this.testResults.push(result);

        const status = success ? '✅' : '❌';
        console.log(`${status} ${testName}: ${message}`);
        if (data) {
            console.log('   داده:', data);
        }
    }

    // تست ۱: بررسی اطلاعات پایه سیستم
    async testBasicInfo() {
        console.log('\n🔍 تست ۱: بررسی اطلاعات پایه سیستم');

        try {
            const extensionId = this.csInterface.getExtensionID();
            this.logTestResult('Extension ID', true, 'شناسه اکستنشن دریافت شد', extensionId);

            const systemPath = this.csInterface.getSystemPath('extension');
            this.logTestResult('System Path', true, 'مسیر سیستم دریافت شد', systemPath);

            const hostEnv = this.csInterface.getHostEnvironment();
            this.logTestResult('Host Environment', true, 'اطلاعات میزبان دریافت شد', hostEnv);

        } catch (error) {
            this.logTestResult('Basic Info', false, 'خطا در دریافت اطلاعات پایه', error.message);
        }
    }

    // تست ۲: اجرای ExtendScript ساده
    async testSimpleExtendScript() {
        console.log('\n🔍 تست ۲: اجرای ExtendScript ساده');

        return new Promise((resolve) => {
            const script = this.createExtendScriptWrapper(`
                $.writeln("ExtendScript Test Started");

                var result = {
                    success: true,
                    message: "اتصال ExtendScript موفق",
                    appVersion: app.version,
                    locale: app.locale,
                    documentsCount: app.documents.length
                };
                JSON.stringify(result);
            `);

            this.csInterface.evalScript(script, (result) => {
                try {
                    if (!result || result.trim() === '') {
                        this.logTestResult('Simple ExtendScript', false, 'پاسخ خالی دریافت شد');
                        resolve();
                        return;
                    }

                    const response = JSON.parse(result);

                    if (response.success) {
                        this.logTestResult('Simple ExtendScript', true, response.message, response);
                    } else {
                        this.logTestResult('Simple ExtendScript', false, response.error, response);
                    }
                } catch (parseError) {
                    this.logTestResult('Simple ExtendScript', false, 'خطا در تجزیه پاسخ: ' + result);
                }
                resolve();
            });
        });
    }

    // تست ۳: بررسی دسترسی به سند فعال
    async testActiveDocument() {
        console.log('\n🔍 تست ۳: بررسی دسترسی به سند فعال');

        return new Promise((resolve) => {
            const script = this.createExtendScriptWrapper(`
                if (app.documents.length === 0) {
                    return {
                        success: false,
                        error: "هیچ سندی باز نیست"
                    };
                } else {
                    var doc = app.activeDocument;
                    return {
                        success: true,
                        documentName: doc.name,
                        documentPath: doc.fullName ? doc.fullName.fsName : "بدون مسیر",
                        width: doc.width,
                        height: doc.height,
                        layersCount: doc.layers.length,
                        selectionCount: doc.selection ? doc.selection.length : 0
                    };
                }
            `);

            this.csInterface.evalScript(script, (result) => {
                try {
                    const response = JSON.parse(result);
                    if (response.success) {
                        this.logTestResult('Active Document', true, 'دسترسی به سند موفق', response);
                    } else {
                        this.logTestResult('Active Document', false, response.error);
                    }
                } catch (parseError) {
                    this.logTestResult('Active Document', false, 'خطا در تجزیه پاسخ');
                }
                resolve();
            });
        });
    }

    // تست ۴: بررسی انتخاب (Selection)
    async testSelection() {
        console.log('\n🔍 تست ۴: بررسی انتخاب (Selection)');

        return new Promise((resolve) => {
            const script = this.createExtendScriptWrapper(`
                var doc = app.activeDocument;
                var selection = doc.selection;

                if (selection.length === 0) {
                    return {
                        success: true,
                        message: "هیچ آیتمی انتخاب نشده",
                        selectionCount: 0
                    };
                } else {
                    var selectedItems = [];
                    for (var i = 0; i < Math.min(selection.length, 3); i++) {
                        var item = selection[i];
                        selectedItems.push({
                            type: item.typename,
                            name: item.name || "بدون نام",
                            width: item.width || 0,
                            height: item.height || 0
                        });
                    }

                    return {
                        success: true,
                        message: "آیتم‌های انتخاب شده یافت شد",
                        selectionCount: selection.length,
                        selectedItems: selectedItems
                    };
                }
            `);

            this.csInterface.evalScript(script, (result) => {
                try {
                    const response = JSON.parse(result);
                    if (response.success) {
                        this.logTestResult('Selection Test', true, response.message, response);
                    } else {
                        this.logTestResult('Selection Test', false, response.error);
                    }
                } catch (parseError) {
                    this.logTestResult('Selection Test', false, 'خطا در تجزیه پاسخ');
                }
                resolve();
            });
        });
    }

    // تست ۵: بررسی دسترسی به Symbols
    async testSymbolsAccess() {
        console.log('\n🔍 تست ۵: بررسی دسترسی به Symbols');

        return new Promise((resolve) => {
            const script = this.createExtendScriptWrapper(`
                var doc = app.activeDocument;
                var symbols = doc.symbols;

                return {
                    success: true,
                    symbolsCount: symbols.length,
                    message: "دسترسی به Symbols موفق"
                };
            `);

            this.csInterface.evalScript(script, (result) => {
                try {
                    const response = JSON.parse(result);
                    if (response.success) {
                        this.logTestResult('Symbols Access', true, response.message, response);
                    } else {
                        this.logTestResult('Symbols Access', false, response.error);
                    }
                } catch (parseError) {
                    this.logTestResult('Symbols Access', false, 'خطا در تجزیه پاسخ');
                }
                resolve();
            });
        });
    }

    // تست ۶: تست عملکرد addSymbol
    async testAddSymbolFunction() {
        console.log('\n🔍 تست ۶: تست عملکرد addSymbol');

        return new Promise((resolve) => {
            const extensionPath = this.csInterface.getSystemPath('extension');
            const script = `
                try {
                    var extensionPath = "${extensionPath}";
                    $.evalFile(extensionPath + "/host/test-addsymbol.jsx");
                } catch (e) {
                    JSON.stringify({
                        success: false,
                        error: "خطا در بارگذاری test-addsymbol.jsx: " + e.message
                    });
                }
            `;

            console.log('   مسیر اسکریپت:', script);

            this.csInterface.evalScript(script, (result) => {
                try {
                    console.log('   پاسخ ExtendScript:', result);

                    if (!result || result.trim() === '') {
                        this.logTestResult('Add Symbol Function', false, 'پاسخ خالی دریافت شد');
                        resolve();
                        return;
                    }

                    // بررسی اگر پاسخ با خطا شروع شود
                    if (result.startsWith('Error') || result.startsWith('خطا') || !result.includes('{')) {
                        this.logTestResult('Add Symbol Function', false, 'پاسخ ExtendScript نامعتبر: ' + result);
                        resolve();
                        return;
                    }

                    const response = JSON.parse(result);
                    if (response.success) {
                        this.logTestResult('Add Symbol Function', true, 'تست addSymbol با موفقیت اجرا شد', response);
                    } else {
                        this.logTestResult('Add Symbol Function', false, response.error);
                    }
                } catch (parseError) {
                    this.logTestResult('Add Symbol Function', false, 'خطا در تجزیه پاسخ JSON: ' + parseError.message);
                }
                resolve();
            });
        });
    }

    // تست ۷: تست اتصال پایه ExtendScript
    async testBasicExtendScriptConnection() {
        console.log('\n🔍 تست ۷: تست اتصال پایه ExtendScript');

        return new Promise((resolve) => {
            const extensionPath = this.csInterface.getSystemPath('extension');
            const script = `
                try {
                    var extensionPath = "${extensionPath}";
                    $.evalFile(extensionPath + "/host/test-simple.jsx");
                } catch (e) {
                    JSON.stringify({
                        success: false,
                        error: "خطا در بارگذاری test-simple.jsx: " + e.message
                    });
                }
            `;

            console.log('   مسیر اسکریپت تست:', script);

            this.csInterface.evalScript(script, (result) => {
                try {
                    console.log('   پاسخ ExtendScript:', result);

                    if (!result || result.trim() === '') {
                        this.logTestResult('Basic ExtendScript Connection', false, 'پاسخ خالی دریافت شد');
                        resolve();
                        return;
                    }

                    const response = JSON.parse(result);
                    if (response.success) {
                        this.logTestResult('Basic ExtendScript Connection', true, 'اتصال پایه ExtendScript موفق', response);
                    } else {
                        this.logTestResult('Basic ExtendScript Connection', false, response.error, response);
                    }
                } catch (parseError) {
                    this.logTestResult('Basic ExtendScript Connection', false, 'خطا در تجزیه پاسخ JSON: ' + parseError.message);
                }
                resolve();
            });
        });
    }

    // اجرای تمام تست‌ها
    async runAllTests() {
        console.log('🚀 شروع تست‌های اتصال اکستنشن Vector Catalog به Adobe Illustrator');
        console.log('='.repeat(60));

        // نمایش اطلاعات اولیه
        console.log('📊 اطلاعات اولیه:');
        console.log('زمان شروع:', new Date().toLocaleString('fa-IR'));
        console.log('مرورگر:', navigator.userAgent);
        console.log('آدرس صفحه:', window.location.href);
        console.log('CSInterface موجود:', typeof CSInterface !== 'undefined');

        // اجرای تست‌ها به ترتیب
        await this.testBasicInfo();
        await this.testSimpleExtendScript();
        await this.testActiveDocument();
        await this.testSelection();
        await this.testSymbolsAccess();
        await this.testBasicExtendScriptConnection();
        await this.testAddSymbolFunction();

        // نمایش خلاصه نتایج
        this.displaySummary();
    }

    // نمایش خلاصه نتایج
    displaySummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📈 خلاصه نتایج تست‌ها:');

        const passed = this.testResults.filter(r => r.success).length;
        const failed = this.testResults.filter(r => !r.success).length;
        const total = this.testResults.length;

        console.log(`✅ موفق: ${passed}`);
        console.log(`❌ ناموفق: ${failed}`);
        console.log(`📊 مجموع: ${total}`);

        if (passed === total) {
            console.log('🎉 تمام تست‌ها موفق بودند!');
        } else {
            console.log('⚠️ برخی تست‌ها ناموفق بودند. لطفا خطاها را بررسی کنید.');
        }

        console.log('زمان پایان:', new Date().toLocaleString('fa-IR'));
        console.log('='.repeat(60));
    }

    // متد عمومی برای اجرای مجدد تست‌ها
    rerunTests() {
        this.testResults = [];
        this.runAllTests();
    }
}

// راه‌اندازی تست در بارگذاری صفحه
document.addEventListener('DOMContentLoaded', function() {
    // اجرای تست‌ها بعد از بارگذاری کامل
    setTimeout(() => {
        window.connectionTest = new IllustratorConnectionTest();
    }, 1000);
});

// Export برای دسترسی جهانی
window.IllustratorConnectionTest = IllustratorConnectionTest;
