// Test initialization issues
console.log('=== Testing Initialization ===');

// Check if DOM is ready
console.log('DOM Ready:', document.readyState);

// Check if CSInterface exists
console.log('CSInterface exists:', typeof CSInterface !== 'undefined');

// Check if required elements exist
const elements = [
    'addSelectionBtn',
    'refreshBtn',
    'searchInput',
    'typeFilter',
    'sizeFilter',
    'sortFilter'
];

elements.forEach(id => {
    const element = document.getElementById(id);
    console.log(`${id} exists:`, element !== null);
});

// Test extension initialization
if (typeof VectorCatalogExtension !== 'undefined') {
    console.log('VectorCatalogExtension class exists');

    try {
        const extension = new VectorCatalogExtension();
        console.log('Extension created successfully');
        window.testExtension = extension;
    } catch (error) {
        console.error('Error creating extension:', error);
    }
} else {
    console.error('VectorCatalogExtension class not found');
}

console.log('=== Test Complete ===');
