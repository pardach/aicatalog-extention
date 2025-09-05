// Comprehensive connection test
console.log('=== 🔍 تست جامع اتصال ===');

// Test 1: Environment
console.log('1. 🌍 محیط:');
console.log('   - زمان:', new Date().toLocaleString('fa-IR'));
console.log('   - مرورگر:', navigator.userAgent.split(' ').pop());
console.log('   - آدرس:', window.location.href);
console.log('   - DOM Ready:', document.readyState);

// Test 2: CSInterface
console.log('2. 🔌 CSInterface:');
console.log('   - موجود:', typeof CSInterface !== 'undefined');

if (typeof CSInterface !== 'undefined') {
    try {
        const cs = new CSInterface();
        console.log('   - Extension ID:', cs.getExtensionID());
        console.log('   - Host Environment:', cs.getHostEnvironment());
        console.log('   - System Path:', cs.getSystemPath('extension'));
    } catch (e) {
        console.log('   - خطا:', e.message);
    }
}

// Test 3: DOM Elements
console.log('3. 📄 DOM Elements:');
const criticalElements = [
    'app', 'gallery', 'searchInput', 'typeFilter', 'sizeFilter',
    'addSelectionBtn', 'refreshBtn', 'debugToggleBtn'
];

criticalElements.forEach(id => {
    const el = document.getElementById(id);
    console.log(`   - ${id}: ${el ? '✅' : '❌'}`);
    if (el) {
        console.log(`     نوع: ${el.tagName}, قابل مشاهده: ${el.offsetWidth > 0}`);
    }
});

// Test 4: Extension Object
console.log('4. 🎯 Extension Object:');
console.log('   - window.extension موجود:', typeof window.extension !== 'undefined');

if (window.extension) {
    console.log('   - designs count:', window.extension.designs ? window.extension.designs.length : 'N/A');
    console.log('   - families count:', window.extension.families ? window.extension.families.length : 'N/A');
    console.log('   - CSInterface type:', typeof window.extension.csInterface);
}

// Test 5: Illustrator Connection Test
console.log('5. 🎨 تست اتصال Illustrator:');
if (window.extension && window.extension.csInterface) {
    window.extension.csInterface.evalScript(`
        try {
            var info = {
                version: app.version,
                documents: app.documents.length,
                activeDoc: app.documents.length > 0 ? app.activeDocument.name : null,
                selection: app.documents.length > 0 ? app.activeDocument.selection.length : 0
            };
            JSON.stringify(info);
        } catch (e) {
            JSON.stringify({error: e.message});
        }
    `, (result) => {
        try {
            const data = JSON.parse(result);
            if (data.error) {
                console.log('   - خطا:', data.error);
            } else {
                console.log('   - نسخه Illustrator:', data.version);
                console.log('   - اسناد باز:', data.documents);
                console.log('   - سند فعال:', data.activeDoc || 'هیچ');
                console.log('   - آیتم‌های انتخاب شده:', data.selection);
            }
        } catch (e) {
            console.log('   - خطا در پردازش:', e.message);
        }
    });
} else {
    console.log('   - Extension یا CSInterface موجود نیست');
}

// Test 6: Performance Metrics
console.log('6. ⚡ Performance:');
if (window.extension && window.extension.performance) {
    const perf = window.extension.performance;
    console.log('   - زمان راه‌اندازی:', perf.startTime ? new Date(perf.startTime).toLocaleTimeString('fa-IR') : 'N/A');
    console.log('   - عملیات انجام شده:', Object.keys(perf.operations).length);
    console.log('   - خطاهای رخ داده:', perf.errors.length);

    if (perf.errors.length > 0) {
        console.log('   - آخرین خطا:', perf.errors[perf.errors.length - 1].message);
    }
}

console.log('=== پایان تست اتصال ===');

// Auto-run Illustrator tests if extension is available
if (window.extension && typeof window.extension.testIllustratorConnection === 'function') {
    console.log('در حال اجرای تست‌های Illustrator...');
    setTimeout(() => {
        window.extension.runBasicTests();
    }, 1000);
}
