// Complete system test
console.log('=== Complete System Test ===');

// Test 1: Check environment
console.log('1. Environment Check:');
console.log('   - User Agent:', navigator.userAgent);
console.log('   - Location:', window.location.href);
console.log('   - DOM Ready:', document.readyState);

// Test 2: Check required libraries
console.log('2. Libraries Check:');
console.log('   - CSInterface:', typeof CSInterface);
console.log('   - VectorCatalogExtension:', typeof VectorCatalogExtension);
console.log('   - jQuery:', typeof $);

// Test 3: Check DOM elements
console.log('3. DOM Elements Check:');
const requiredElements = [
    'app', 'addSelectionBtn', 'refreshBtn', 'searchInput',
    'typeFilter', 'sizeFilter', 'sortFilter', 'gallery'
];

requiredElements.forEach(id => {
    const element = document.getElementById(id);
    console.log(`   - ${id}:`, element ? 'Found' : 'NOT FOUND');
});

// Test 4: Test extension creation
console.log('4. Extension Creation Test:');
if (typeof VectorCatalogExtension !== 'undefined') {
    try {
        const testExtension = new VectorCatalogExtension();
        console.log('   - Extension created: SUCCESS');
        console.log('   - CSInterface type:', typeof testExtension.csInterface);
        console.log('   - Has designs array:', Array.isArray(testExtension.designs));
    } catch (error) {
        console.log('   - Extension creation: FAILED');
        console.log('   - Error:', error.message);
    }
} else {
    console.log('   - VectorCatalogExtension class: NOT FOUND');
}

// Test 5: Check if extension is working
console.log('5. Extension Status:');
if (window.extension) {
    console.log('   - Global extension exists');
    console.log('   - Designs count:', window.extension.designs ? window.extension.designs.length : 'N/A');
    console.log('   - Families count:', window.extension.families ? window.extension.families.length : 'N/A');
} else {
    console.log('   - No global extension found');
}

console.log('=== Test Complete ===');

// If there are errors, show them
if (window.extension && window.extension.performance && window.extension.performance.errors.length > 0) {
    console.log('Errors found:');
    window.extension.performance.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}`);
    });
}
