// JavaScript اصلی برای مدیریت کاتالوگ طرح‌های وکتوری

class VectorCatalogExtension {
    constructor() {
        // بررسی وجود CSInterface
        if (typeof CSInterface === 'undefined') {
            console.error('CSInterface یافت نشد. آیا در محیط CEP هستید؟');
            // ایجاد mock CSInterface برای محیط توسعه
            this.csInterface = {
                evalScript: (script, callback) => {
                    console.warn('CSInterface.evalScript: محیط CEP یافت نشد');
                    if (callback) callback('{"success":false,"error":"محیط CEP یافت نشد"}');
                },
                addEventListener: (event, callback) => {
                    console.warn('CSInterface.addEventListener: محیط CEP یافت نشد');
                },
                getSystemPath: (path) => {
                    return '/mock/path';
                },
                getExtensionID: () => {
                    return 'mock-extension-id';
                }
            };
        } else {
            this.csInterface = new CSInterface();
        }

        this.designs = [];
        this.families = [];
        this.currentFilter = {};
        this.selectedDesigns = new Set(); // برای انتخاب چندگانه
        this.logs = [];
        this.favorites = new Set();
        this.recents = [];
        this.performance = {
            startTime: Date.now(),
            operations: {},
            errors: []
        };
        this.initialize();
    }

    displayConnectionInfo() {
        console.log('=== 🔗 اطلاعات اتصال اولیه ===');
        console.log('زمان راه‌اندازی:', new Date().toLocaleString('fa-IR'));
        console.log('مرورگر:', navigator.userAgent);
        console.log('آدرس صفحه:', window.location.href);
        console.log('CSInterface موجود:', typeof CSInterface !== 'undefined');

        if (typeof CSInterface !== 'undefined') {
            try {
                const csInterface = new CSInterface();
                console.log('Extension ID:', csInterface.getExtensionID());
                console.log('System Path:', csInterface.getSystemPath('extension'));
            } catch (e) {
                console.log('خطا در دسترسی به CSInterface:', e.message);
            }
        }

        console.log('DOM Elements Status:');
        const elements = ['app', 'gallery', 'searchInput', 'typeFilter'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            console.log(`  ${id}: ${el ? 'موجود' : 'پیدا نشد'}`);
        });

        console.log('================================');
    }

    // ========== LOGGING SYSTEM ==========

    log(message, type = 'info', data = null) {
        const timestamp = new Date().toLocaleString('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const logEntry = {
            timestamp,
            type,
            message,
            data,
            stack: type === 'error' ? new Error().stack : null
        };

        this.logs.push(logEntry);

        // Console logging with appropriate level
        const consoleMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
        switch (type) {
            case 'error':
                console.error(consoleMessage, data);
                break;
            case 'warn':
                console.warn(consoleMessage, data);
                break;
            case 'debug':
                console.debug(consoleMessage, data);
                break;
            default:
                console.log(consoleMessage, data);
        }

        // Keep only last 100 logs to prevent memory issues
        if (this.logs.length > 100) {
            this.logs = this.logs.slice(-50);
        }

        // Update debug panel if exists
        this.updateDebugPanel();
    }

    updateDebugPanel() {
        const debugPanel = document.getElementById('debugPanel');
        if (debugPanel) {
            const recentLogs = this.logs.slice(-10);
            debugPanel.innerHTML = recentLogs.map(log => `
                <div class="debug-entry debug-${log.type}">
                    <span class="debug-time">${log.timestamp}</span>
                    <span class="debug-type">${log.type}</span>
                    <span class="debug-message">${log.message}</span>
                </div>
            `).join('');
        }
    }

    // ========== PERFORMANCE MONITORING ==========

    startPerformance(operation) {
        this.performance.operations[operation] = {
            start: Date.now(),
            status: 'running'
        };
        this.log(`شروع عملیات: ${operation}`, 'debug');
    }

    endPerformance(operation, success = true, data = null) {
        if (!this.performance.operations[operation]) {
            this.log(`عملیات ${operation} یافت نشد`, 'warn');
            return;
        }

        const op = this.performance.operations[operation];
        op.end = Date.now();
        op.duration = op.end - op.start;
        op.status = success ? 'completed' : 'failed';
        op.data = data;

        this.log(`اتمام عملیات ${operation}: ${op.duration}ms`, success ? 'info' : 'error', op);

        // Clean up old operations
        setTimeout(() => {
            delete this.performance.operations[operation];
        }, 30000); // Keep for 30 seconds
    }

    // ========== ERROR HANDLING ==========

    handleError(error, context = '') {
        const errorInfo = {
            message: error.message || 'خطای ناشناخته',
            stack: error.stack,
            context,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.performance.errors.push(errorInfo);
        this.log(`خطا ${context}: ${errorInfo.message}`, 'error', errorInfo);

        // Show user-friendly error message
        this.showErrorNotification(errorInfo.message);

        // Report to console for debugging
        console.error('Extension Error:', errorInfo);
    }

    showErrorNotification(message) {
        // Create or update error notification
        let notification = document.getElementById('errorNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'errorNotification';
            notification.className = 'error-notification';
            document.body.appendChild(notification);
        }

        notification.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-message">${message}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        notification.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // ========== INITIALIZATION WITH ERROR HANDLING ==========

    initialize() {
        try {
            this.startPerformance('initialization');
            this.log('شروع راه‌اندازی اکستنشن کاتالوگ', 'info');

            // بررسی وجود DOM
            if (typeof document === 'undefined' || !document.body) {
                throw new Error('DOM یافت نشد. آیا صفحه کامل load شده؟');
            }

            this.setupEventListeners();
            this.loadFavoritesFromStorage();
            this.loadRecentsFromStorage();
            this.loadCatalog();
            this.setupDebugPanel();

            // نمایش اطلاعات اتصال اولیه
            this.displayConnectionInfo();

            this.updateStatus('آماده');

            this.endPerformance('initialization', true);
            this.log('اکستنشن کاتالوگ با موفقیت راه‌اندازی شد', 'success');

        } catch (error) {
            this.endPerformance('initialization', false);
            this.handleError(error, 'راه‌اندازی اکستنشن');
            this.updateStatus('خطا در راه‌اندازی');
        }
    }

    setupDebugPanel() {
        // Add debug panel to the page
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debugPanel';
        debugPanel.className = 'debug-panel';
        debugPanel.innerHTML = '<div class="debug-title">Debug Logs</div>';

        // Add to a less intrusive location
        const toolbar = document.querySelector('.toolbar');
        if (toolbar) {
            toolbar.appendChild(debugPanel);
        }
    }

    toggleDebugPanel() {
        const debugPanel = document.getElementById('debugPanel');
        const debugBtn = document.getElementById('debugToggleBtn');

        if (debugPanel) {
            if (debugPanel.style.display === 'none' || debugPanel.style.display === '') {
                debugPanel.style.display = 'block';
                debugBtn.classList.add('active');
                this.log('پنل debug فعال شد', 'info');
            } else {
                debugPanel.style.display = 'none';
                debugBtn.classList.remove('active');
                this.log('پنل debug غیرفعال شد', 'info');
            }
        }
    }

    runBasicTests() {
        this.startPerformance('runTests');
        this.log('شروع اجرای تست‌های پایه', 'info');

        const tests = [
            { name: 'CSInterface Connection', test: () => this.testCSInterface() },
            { name: 'Illustrator Connection', test: () => this.testIllustratorConnection() },
            { name: 'Document Info', test: () => this.testDocumentInfo() },
            { name: 'Selection Info', test: () => this.testSelectionInfo() },
            { name: 'Data Validation', test: () => this.testDataValidation() },
            { name: 'Performance Metrics', test: () => this.testPerformanceMetrics() }
        ];

        let passedTests = 0;
        let totalTests = tests.length;

        const runTest = (index) => {
            if (index >= tests.length) {
                // All tests completed
                this.endPerformance('runTests', true, { passedTests, totalTests });
                this.log(`تست‌ها کامل شد: ${passedTests}/${totalTests} موفق`, 'success');
                this.showErrorNotification(`تست‌ها کامل شد: ${passedTests}/${totalTests} موفق`);
                return;
            }

            const test = tests[index];
            this.log(`در حال اجرای تست: ${test.name}`, 'info');

            try {
                const result = test.test();

                // Handle both sync and async tests
                if (result instanceof Promise) {
                    result.then(success => {
                        if (success) {
                            passedTests++;
                            this.log(`✅ تست ${test.name} موفق`, 'success');
                        } else {
                            this.log(`❌ تست ${test.name} ناموفق`, 'error');
                        }
                        // Run next test after a short delay
                        setTimeout(() => runTest(index + 1), 100);
                    }).catch(error => {
                        this.log(`❌ خطا در تست ${test.name}: ${error.message}`, 'error');
                        setTimeout(() => runTest(index + 1), 100);
                    });
                } else {
                    if (result) {
                        passedTests++;
                        this.log(`✅ تست ${test.name} موفق`, 'success');
                    } else {
                        this.log(`❌ تست ${test.name} ناموفق`, 'error');
                    }
                    // Run next test after a short delay
                    setTimeout(() => runTest(index + 1), 100);
                }
            } catch (error) {
                this.log(`❌ خطا در تست ${test.name}: ${error.message}`, 'error');
                setTimeout(() => runTest(index + 1), 100);
            }
        };

        runTest(0);
    }

    testCSInterface() {
        try {
            if (typeof CSInterface === 'undefined') {
                this.log('CSInterface یافت نشد - محیط توسعه', 'warn');
                return true; // This is expected in development
            }

            const csInterface = new CSInterface();
            this.log('CSInterface ایجاد شد: ' + csInterface.getExtensionID(), 'success');

            // Test basic functionality
            const hostEnv = csInterface.getHostEnvironment();
            console.log('=== 🔌 اطلاعات CSInterface ===');
            console.log('Extension ID:', csInterface.getExtensionID());
            console.log('Host Environment:', JSON.stringify(hostEnv, null, 2));
            console.log('System Path:', csInterface.getSystemPath('extension'));
            console.log('===========================');

            return true;
        } catch (error) {
            this.log('خطا در تست CSInterface: ' + error.message, 'error');
            return false;
        }
    }

    testIllustratorConnection() {
        return new Promise((resolve) => {
            if (!this.csInterface || typeof this.csInterface.evalScript !== 'function') {
                this.log('CSInterface برای تست Illustrator در دسترس نیست', 'warn');
                resolve(false);
                return;
            }

            const script = `
                try {
                    var result = {
                        illustratorVersion: app.version,
                        locale: app.locale,
                        platform: $.platform,
                        os: $.os,
                        documentsCount: app.documents.length,
                        activeDocument: app.documents.length > 0 ? app.activeDocument.name : null,
                        memory: $.memory || 'N/A'
                    };
                    JSON.stringify(result);
                } catch (e) {
                    JSON.stringify({error: e.message, line: e.line});
                }
            `;

            this.csInterface.evalScript(script, (result) => {
                try {
                    if (!result || result.trim() === '') {
                        throw new Error('پاسخ خالی از Illustrator');
                    }

                    const data = JSON.parse(result);

                    if (data.error) {
                        this.log('خطا در اتصال به Illustrator: ' + data.error, 'error');
                        resolve(false);
                        return;
                    }

                    // Log comprehensive Illustrator info
                    console.log('=== 🎨 اطلاعات Illustrator ===');
                    console.log('نسخه Illustrator:', data.illustratorVersion);
                    console.log('زبان سیستم:', data.locale);
                    console.log('پلتفرم:', data.platform);
                    console.log('سیستم عامل:', data.os);
                    console.log('تعداد اسناد باز:', data.documentsCount);
                    console.log('سند فعال:', data.activeDocument || 'هیچ سندی باز نیست');
                    console.log('حافظه استفاده شده:', data.memory);
                    console.log('==============================');

                    this.log('اتصال به Illustrator موفق - نسخه: ' + data.illustratorVersion, 'success');
                    resolve(true);

                } catch (parseError) {
                    this.log('خطا در پردازش پاسخ Illustrator: ' + parseError.message, 'error');
                    resolve(false);
                }
            });
        });
    }

    testDocumentInfo() {
        return new Promise((resolve) => {
            if (!this.csInterface || typeof this.csInterface.evalScript !== 'function') {
                this.log('CSInterface برای تست Document در دسترس نیست', 'warn');
                resolve(false);
                return;
            }

            const script = `
                try {
                    if (app.documents.length === 0) {
                        JSON.stringify({error: 'هیچ سندی باز نیست'});
                    } else {
                        var doc = app.activeDocument;
                        var result = {
                            name: doc.name,
                            path: doc.path || 'ذخیره نشده',
                            width: Math.round(doc.width * 100) / 100,
                            height: Math.round(doc.height * 100) / 100,
                            colorSpace: doc.documentColorSpace,
                            layersCount: doc.layers.length,
                            symbolsCount: doc.symbols.length,
                            artboardsCount: doc.artboards.length,
                            rulerUnits: doc.rulerUnits.toString()
                        };
                        JSON.stringify(result);
                    }
                } catch (e) {
                    JSON.stringify({error: e.message, line: e.line});
                }
            `;

            this.csInterface.evalScript(script, (result) => {
                try {
                    if (!result || result.trim() === '') {
                        throw new Error('پاسخ خالی از Document Info');
                    }

                    const data = JSON.parse(result);

                    if (data.error) {
                        this.log('خطا در دریافت اطلاعات سند: ' + data.error, 'error');
                        resolve(false);
                        return;
                    }

                    // Log document information
                    console.log('=== 📄 اطلاعات سند فعال ===');
                    console.log('نام سند:', data.name);
                    console.log('مسیر:', data.path);
                    console.log('ابعاد:', data.width + ' × ' + data.height + ' ' + data.rulerUnits);
                    console.log('فضای رنگی:', data.colorSpace);
                    console.log('تعداد لایه‌ها:', data.layersCount);
                    console.log('تعداد نمادها:', data.symbolsCount);
                    console.log('تعداد آرتبورد:', data.artboardsCount);
                    console.log('واحد اندازه‌گیری:', data.rulerUnits);
                    console.log('============================');

                    this.log('اطلاعات سند دریافت شد - ' + data.name, 'success');
                    resolve(true);

                } catch (parseError) {
                    this.log('خطا در پردازش اطلاعات سند: ' + parseError.message, 'error');
                    resolve(false);
                }
            });
        });
    }

    testSelectionInfo() {
        return new Promise((resolve) => {
            if (!this.csInterface || typeof this.csInterface.evalScript !== 'function') {
                this.log('CSInterface برای تست Selection در دسترس نیست', 'warn');
                resolve(false);
                return;
            }

            const script = `
                try {
                    if (app.documents.length === 0) {
                        JSON.stringify({error: 'هیچ سندی باز نیست'});
                    } else {
                        var doc = app.activeDocument;
                        var selection = doc.selection;
                        var result = {
                            selectionCount: selection.length,
                            selectedTypes: [],
                            bounds: null,
                            groupedItems: 0,
                            textFrames: 0,
                            paths: 0,
                            images: 0
                        };

                        for (var i = 0; i < selection.length; i++) {
                            var item = selection[i];
                            var type = item.typename;

                            if (result.selectedTypes.indexOf(type) === -1) {
                                result.selectedTypes.push(type);
                            }

                            // Count different types
                            if (type === 'GroupItem') result.groupedItems++;
                            if (type === 'TextFrame') result.textFrames++;
                            if (type === 'PathItem') result.paths++;
                            if (type === 'PlacedItem' || type === 'RasterItem') result.images++;
                        }

                        // Calculate bounds if items selected
                        if (selection.length > 0) {
                            var bounds = selection[0].visibleBounds;
                            result.bounds = {
                                left: Math.round(bounds[0] * 100) / 100,
                                top: Math.round(bounds[1] * 100) / 100,
                                right: Math.round(bounds[2] * 100) / 100,
                                bottom: Math.round(bounds[3] * 100) / 100,
                                width: Math.round((bounds[2] - bounds[0]) * 100) / 100,
                                height: Math.round((bounds[1] - bounds[3]) * 100) / 100
                            };
                        }

                        JSON.stringify(result);
                    }
                } catch (e) {
                    JSON.stringify({error: e.message, line: e.line});
                }
            `;

            this.csInterface.evalScript(script, (result) => {
                try {
                    if (!result || result.trim() === '') {
                        throw new Error('پاسخ خالی از Selection Info');
                    }

                    const data = JSON.parse(result);

                    if (data.error) {
                        this.log('خطا در دریافت اطلاعات انتخاب: ' + data.error, 'error');
                        resolve(false);
                        return;
                    }

                    // Log selection information
                    console.log('=== 🎯 اطلاعات انتخاب ===');
                    console.log('تعداد آیتم‌های انتخاب شده:', data.selectionCount);

                    if (data.selectionCount > 0) {
                        console.log('انواع انتخاب شده:', data.selectedTypes.join(', '));
                        console.log('گروه‌ها:', data.groupedItems);
                        console.log('فریم‌های متنی:', data.textFrames);
                        console.log('مسیرها:', data.paths);
                        console.log('تصاویر:', data.images);

                        if (data.bounds) {
                            console.log('مختصات:', data.bounds.left + ', ' + data.bounds.top + ' تا ' + data.bounds.right + ', ' + data.bounds.bottom);
                            console.log('ابعاد انتخاب:', data.bounds.width + ' × ' + data.bounds.height);
                        }
                    } else {
                        console.log('هیچ آیتمی انتخاب نشده');
                    }
                    console.log('========================');

                    this.log('اطلاعات انتخاب دریافت شد - ' + data.selectionCount + ' آیتم', 'success');
                    resolve(true);

                } catch (parseError) {
                    this.log('خطا در پردازش اطلاعات انتخاب: ' + parseError.message, 'error');
                    resolve(false);
                }
            });
        });
    }

    testDataValidation() {
        try {
            // Test design data validation
            const testDesigns = [
                { code: 'G001', type: 'گل', family_codes: ['G001'], tags: ['test'] },
                { code: '', type: 'بنک', family_codes: [], tags: [] }, // Invalid
                { code: 'B002', type: '', family_codes: ['G001'], tags: ['test'] }, // Invalid
                null, // Invalid
                'invalid string' // Invalid
            ];

            const validDesigns = this.validateDesignsData(testDesigns);
            const expectedValidCount = 1; // Only first design should be valid

            if (validDesigns.length === expectedValidCount) {
                this.log('Data validation test successful', 'debug');
                return true;
            } else {
                throw new Error(`Expected ${expectedValidCount} valid designs, got ${validDesigns.length}`);
            }
        } catch (error) {
            this.log(`Data validation test failed: ${error.message}`, 'error');
            return false;
        }
    }

    testPerformanceMetrics() {
        try {
            const metrics = {
                totalLogs: this.logs.length,
                totalErrors: this.performance.errors.length,
                uptime: Date.now() - this.performance.startTime,
                memoryUsage: this.getMemoryUsage()
            };

            this.log('Performance metrics collected', 'debug', metrics);
            return true;
        } catch (error) {
            this.log(`Performance test failed: ${error.message}`, 'error');
            return false;
        }
    }

    getMemoryUsage() {
        try {
            // Simple memory usage estimation
            const logsSize = JSON.stringify(this.logs).length;
            const designsSize = JSON.stringify(this.designs).length;
            const familiesSize = JSON.stringify(this.families).length;

            return {
                logsSize: `${(logsSize / 1024).toFixed(2)} KB`,
                designsSize: `${(designsSize / 1024).toFixed(2)} KB`,
                familiesSize: `${(familiesSize / 1024).toFixed(2)} KB`,
                totalEstimated: `${((logsSize + designsSize + familiesSize) / 1024).toFixed(2)} KB`
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    setupEventListeners() {
        // Header buttons
        const addSelectionBtn = document.getElementById('addSelectionBtn');
        if (addSelectionBtn) {
            addSelectionBtn.addEventListener('click', () => {
                this.addSymbolFromSelection();
            });
        }

        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadCatalog();
            });
        }

        const updateSizesBtn = document.getElementById('updateSizesBtn');
        if (updateSizesBtn) {
            updateSizesBtn.addEventListener('click', () => {
                this.updateExistingDesignSizes();
            });
        }

        // Search and filters
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilter.search = e.target.value;
                this.applyFilters();
            });
        }

        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                this.currentFilter.search = '';
                this.applyFilters();
            });
        }

        const typeFilter = document.getElementById('typeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilter.type = e.target.value;
                this.applyFilters();
            });
        }

        const familyFilter = document.getElementById('familyFilter');
        if (familyFilter) {
            familyFilter.addEventListener('change', (e) => {
                this.currentFilter.family = e.target.value;
                this.applyFilters();
            });
        }

        const sizeFilter = document.getElementById('sizeFilter');
        if (sizeFilter) {
            sizeFilter.addEventListener('change', (e) => {
                this.currentFilter.size = e.target.value;
                this.applyFilters();
            });
        }

        const eraFilter = document.getElementById('eraFilter');
        if (eraFilter) {
            eraFilter.addEventListener('change', (e) => {
                this.currentFilter.era = e.target.value;
                this.applyFilters();
            });
        }

        const sortFilter = document.getElementById('sortFilter');
        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.currentFilter.sortBy = e.target.value;
                this.applyFilters();
            });
        }

        // Gallery selection buttons
        const selectAllBtn = document.getElementById('selectAllBtn');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                this.selectAllDesigns();
            });
        }

        const clearSelectionBtn = document.getElementById('clearSelectionBtn');
        if (clearSelectionBtn) {
            clearSelectionBtn.addEventListener('click', () => {
                this.clearSelection();
            });
        }

        const placeSelectedBtn = document.getElementById('placeSelectedBtn');
        if (placeSelectedBtn) {
            placeSelectedBtn.addEventListener('click', () => {
                this.placeSelectedDesigns();
            });
        }

        // Family connection buttons
        const connectToFamilyBtn = document.getElementById('connectToFamilyBtn');
        if (connectToFamilyBtn) {
            connectToFamilyBtn.addEventListener('click', () => {
                this.showFamilyConnectModal();
            });
        }

        const batchEditBtn = document.getElementById('batchEditBtn');
        if (batchEditBtn) {
            batchEditBtn.addEventListener('click', () => {
                this.showBatchEditModal();
            });
        }

        // Modal controls
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                this.hideModal('detailModal');
            });
        }

        const closeBatchModalBtn = document.getElementById('closeBatchModalBtn');
        if (closeBatchModalBtn) {
            closeBatchModalBtn.addEventListener('click', () => {
                this.hideModal('batchModal');
            });
        }

        const cancelBatchBtn = document.getElementById('cancelBatchBtn');
        if (cancelBatchBtn) {
            cancelBatchBtn.addEventListener('click', () => {
                this.hideModal('batchModal');
            });
        }

        const confirmBatchBtn = document.getElementById('confirmBatchBtn');
        if (confirmBatchBtn) {
            confirmBatchBtn.addEventListener('click', () => {
                this.batchRegisterDesigns();
            });
        }

        const closePlaceModalBtn = document.getElementById('closePlaceModalBtn');
        if (closePlaceModalBtn) {
            closePlaceModalBtn.addEventListener('click', () => {
                this.hideModal('placeModal');
            });
        }

        // Family connection modal controls
        const closeFamilyConnectModalBtn = document.getElementById('closeFamilyConnectModalBtn');
        if (closeFamilyConnectModalBtn) {
            closeFamilyConnectModalBtn.addEventListener('click', () => {
                this.hideModal('familyConnectModal');
            });
        }

        const cancelFamilyConnectBtn = document.getElementById('cancelFamilyConnectBtn');
        if (cancelFamilyConnectBtn) {
            cancelFamilyConnectBtn.addEventListener('click', () => {
                this.hideModal('familyConnectModal');
            });
        }

        const confirmFamilyConnectBtn = document.getElementById('confirmFamilyConnectBtn');
        if (confirmFamilyConnectBtn) {
            confirmFamilyConnectBtn.addEventListener('click', () => {
                this.connectSelectedToFamilies();
            });
        }

        // Batch edit modal controls
        const closeBatchEditModalBtn = document.getElementById('closeBatchEditModalBtn');
        if (closeBatchEditModalBtn) {
            closeBatchEditModalBtn.addEventListener('click', () => {
                this.hideModal('batchEditModal');
            });
        }

        const cancelBatchEditBtn = document.getElementById('cancelBatchEditBtn');
        if (cancelBatchEditBtn) {
            cancelBatchEditBtn.addEventListener('click', () => {
                this.hideModal('batchEditModal');
            });
        }

        const confirmBatchEditBtn = document.getElementById('confirmBatchEditBtn');
        if (confirmBatchEditBtn) {
            confirmBatchEditBtn.addEventListener('click', () => {
                this.applyBatchEdit();
            });
        }

        // Edit design modal controls
        const closeEditDesignModalBtn = document.getElementById('closeEditDesignModalBtn');
        if (closeEditDesignModalBtn) {
            closeEditDesignModalBtn.addEventListener('click', () => {
                this.hideModal('editDesignModal');
            });
        }

        const cancelEditDesignBtn = document.getElementById('cancelEditDesignBtn');
        if (cancelEditDesignBtn) {
            cancelEditDesignBtn.addEventListener('click', () => {
                this.hideModal('editDesignModal');
            });
        }

        const confirmEditDesignBtn = document.getElementById('confirmEditDesignBtn');
        if (confirmEditDesignBtn) {
            confirmEditDesignBtn.addEventListener('click', () => {
                this.saveDesignEdit();
            });
        }

        const addEditTagBtn = document.getElementById('addEditTagBtn');
        if (addEditTagBtn) {
            addEditTagBtn.addEventListener('click', () => {
                this.addTagToEdit();
            });
        }

        const editNewTagInput = document.getElementById('editNewTagInput');
        if (editNewTagInput) {
            editNewTagInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addTagToEdit();
                }
            });
        }

        const placeSingleBtn = document.getElementById('placeSingleBtn');
        if (placeSingleBtn) {
            placeSingleBtn.addEventListener('click', () => {
                this.placeDesign('single');
            });
        }

        const placeFamilyBtn = document.getElementById('placeFamilyBtn');
        if (placeFamilyBtn) {
            placeFamilyBtn.addEventListener('click', () => {
                this.placeDesign('family');
            });
        }

        const placeMultipleBtn = document.getElementById('placeMultipleBtn');
        if (placeMultipleBtn) {
            placeMultipleBtn.addEventListener('click', () => {
                this.showArrangeOptions();
            });
        }

        // Debug and testing
        // Tag management
        const addTagBtn = document.getElementById('addTagBtn');
        if (addTagBtn) {
            addTagBtn.addEventListener('click', () => {
                this.addNewTag();
            });
        }

        // Tag merge functionality
        this.setupTagMergeFunctionality();

        const newTagInput = document.getElementById('newTagInput');
        if (newTagInput) {
            newTagInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addNewTag();
                }
            });
        }

        const debugToggleBtn = document.getElementById('debugToggleBtn');
        if (debugToggleBtn) {
            debugToggleBtn.addEventListener('click', () => {
                this.toggleDebugPanel();
            });
        }

        const runTestsBtn = document.getElementById('runTestsBtn');
        if (runTestsBtn) {
            runTestsBtn.addEventListener('click', () => {
                this.runBasicTests();
            });
        }

        const testConnectionBtn = document.getElementById('testConnectionBtn');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => {
                if (window.connectionTest) {
                    window.connectionTest.rerunTests();
                } else {
                    console.log('🔄 راه‌اندازی مجدد تست اتصال...');
                    window.connectionTest = new IllustratorConnectionTest();
                }
            });
        }

        const syncBtn = document.getElementById('syncBtn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                this.syncNotesWithDB();
            });
        }

        // Gallery navigation buttons
        const showAllBtn = document.getElementById('showAllBtn');
        if (showAllBtn) {
            showAllBtn.addEventListener('click', () => {
                this.renderCatalog(this.designs);
                document.getElementById('galleryTitle').textContent = `همه طرح‌ها`;
            });
        }

        const showFavoritesBtn = document.getElementById('showFavoritesBtn');
        if (showFavoritesBtn) {
            showFavoritesBtn.addEventListener('click', () => {
                this.showFavorites();
            });
        }

        const showRecentsBtn = document.getElementById('showRecentsBtn');
        if (showRecentsBtn) {
            showRecentsBtn.addEventListener('click', () => {
                this.showRecents();
            });
        }

        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportCatalog();
            });
        }

        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                window.open('settings.html', '_blank', 'width=900,height=700');
            });
        }

        // CEP events
        if (this.csInterface && typeof this.csInterface.addEventListener === 'function') {
            this.csInterface.addEventListener('com.adobe.csxs.events.ThemeChanged', () => {
                console.log('تم تغییر کرد');
            });
        }
    }

    // ========== CATALOG MANAGEMENT ==========

    addSymbolFromSelection() {
        try {
            this.startPerformance('addSymbol');
            this.log('شروع ثبت طرح از انتخاب', 'info');

            this.updateStatus('در حال ثبت طرح...');

            const extensionPath = this.csInterface.getSystemPath('extension');
            const script = `
                try {
                    var extensionPath = "${extensionPath}";
                    $.evalFile(extensionPath + "/host/addSymbol.jsx");
                } catch (e) {
                    JSON.stringify({
                        success: false,
                        error: "خطا در بارگذاری addSymbol.jsx: " + e.message
                    });
                }
            `;
            console.log('Script path:', script);

            this.csInterface.evalScript(script, (result) => {
                try {
                    console.log('ExtendScript result:', result); // Debug log

                    if (!result || result.trim() === '') {
                        throw new Error('پاسخ خالی از ExtendScript دریافت شد');
                    }

                    // Check if result looks like an error message
                    if (result.startsWith('Error') || result.startsWith('خطا') || !result.includes('{')) {
                        throw new Error('پاسخ ExtendScript نامعتبر: ' + result);
                    }

                    const response = JSON.parse(result);

                    if (response.success && response.design) {
                        const design = response.design;

                        // اضافه کردن برچسب‌های انتخابی
                        if (window.SQLiteBridge) {
                            const selectedTags = window.SQLiteBridge.getSelectedTags();
                            design.tags = selectedTags;
                        }

                        // ذخیره در SQLite
                        if (window.SQLiteBridge && window.SQLiteBridge.addDesignToDB(design)) {
                            this.log(`طرح ${design.code} در SQLite ذخیره شد`, 'success');
                        }

                        this.updateStatus(`طرح ${design.code} با موفقیت ثبت شد`);
                        this.loadCatalog(); // بروزرسانی کاتالوگ

                        this.endPerformance('addSymbol', true, {
                            code: design.code,
                            tagsCount: design.tags.length
                        });

                        this.log(`ثبت طرح موفق: ${design.code}`, 'success');

                    } else {
                        throw new Error(response.error || 'خطای ناشناخته در ثبت طرح');
                    }

                } catch (parseError) {
                    this.endPerformance('addSymbol', false);
                    this.handleError(parseError, 'پردازش پاسخ ثبت طرح');
                    this.updateStatus('خطا در ثبت طرح');
                }
            });

        } catch (error) {
            this.endPerformance('addSymbol', false);
            this.handleError(error, 'ثبت طرح از انتخاب');
        }
    }

    updateExistingDesignSizes() {
        try {
            this.startPerformance('updateSizes');
            this.log('شروع بروزرسانی اندازه‌های موجود', 'info');

            this.updateStatus('در حال بروزرسانی اندازه‌ها...');

            const script = 'updateExistingDesignSizes()';

            this.csInterface.evalScript(script, (result) => {
                try {
                    if (!result || result.trim() === '') {
                        throw new Error('پاسخ خالی از ExtendScript دریافت شد');
                    }

                    const response = JSON.parse(result);

                    if (response.success) {
                        const updatedCount = response.updatedCount || 0;
                        this.updateStatus(`اندازه‌ها بروزرسانی شد - ${updatedCount} طرح`);
                        this.loadCatalog(); // Reload catalog to show updated sizes

                        this.endPerformance('updateSizes', true, {
                            updatedCount
                        });

                        this.log(`اندازه‌های ${updatedCount} طرح بروزرسانی شد`, 'success');

                    } else {
                        throw new Error(response.error || 'خطای ناشناخته در بروزرسانی اندازه‌ها');
                    }

                } catch (parseError) {
                    this.endPerformance('updateSizes', false);
                    this.handleError(parseError, 'پردازش پاسخ بروزرسانی اندازه‌ها');
                    this.updateStatus('خطا در پردازش پاسخ بروزرسانی');
                }
            });

        } catch (error) {
            this.endPerformance('updateSizes', false);
            this.handleError(error, 'بروزرسانی اندازه‌های موجود');
        }
    }

    loadCatalog() {
        try {
            this.startPerformance('loadCatalog');
            this.updateStatus('در حال بارگذاری کاتالوگ...');
            this.log('شروع بارگذاری کاتالوگ', 'info');

            // Load from SQLite if available, otherwise fallback to ExtendScript
            if (window.SQLiteBridge) {
                this.loadCatalogFromSQLite();
            } else {
                this.loadCatalogFromExtendScript();
            }

        } catch (error) {
            this.endPerformance('loadCatalog', false);
            this.handleError(error, 'بارگذاری کاتالوگ');
        }
    }

    loadCatalogFromSQLite() {
        try {
            // Get designs from SQLite
            const filters = {};
            if (this.currentFilter.search) {
                filters.keyword = this.currentFilter.search;
            }
            if (this.currentFilter.type) {
                filters.type = this.currentFilter.type;
            }
            if (this.currentFilter.size) {
                filters.size = this.currentFilter.size;
            }
            if (this.currentFilter.family) {
                filters.family = this.currentFilter.family;
            }

            this.designs = window.SQLiteBridge.searchDesigns('', filters);
            this.families = window.SQLiteBridge.getAllFamilies();

            this.renderCatalog();
            this.updateSidebar();
            this.updateStatus(`کاتالوگ بارگذاری شد - ${this.designs.length} طرح`);

            this.endPerformance('loadCatalog', true, {
                designsCount: this.designs.length,
                familiesCount: this.families.length
            });

            this.log(`کاتالوگ SQLite بارگذاری شد: ${this.designs.length} طرح، ${this.families.length} خانواده`, 'success');

        } catch (error) {
            this.log('خطا در بارگذاری از SQLite، استفاده از ExtendScript', 'warn');
            this.loadCatalogFromExtendScript();
        }
    }

    loadCatalogFromExtendScript() {
        const script = 'getAllSymbolsData()';

        this.csInterface.evalScript(script, (result) => {
            try {
                this.log('پاسخ ExtendScript دریافت شد: ' + (result ? result.substring(0, 100) : 'خالی'), 'debug');

                if (!result || result.trim() === '') {
                    throw new Error('پاسخ خالی از ExtendScript دریافت شد');
                }

                // بررسی اینکه پاسخ با JSON شروع می‌شود
                const trimmedResult = result.trim();
                if (!trimmedResult.startsWith('{') && !trimmedResult.startsWith('[')) {
                    this.log('پاسخ ExtendScript معتبر نیست: ' + trimmedResult, 'error');
                    throw new Error('پاسخ ExtendScript معتبر نیست: ' + trimmedResult.substring(0, 100));
                }

                let response;
                try {
                    response = JSON.parse(result);
                } catch (parseError) {
                    this.log('خطا در JSON.parse: ' + parseError.message, 'error');
                    this.log('پاسخ خام: ' + result, 'error');
                    throw new Error('پاسخ ExtendScript JSON معتبر نیست');
                }

                if (response.success) {
                    // Validate response data
                    this.designs = this.validateDesignsData(response.designs || []);
                    this.families = this.validateFamiliesData(response.families || []);

                    // Save to SQLite if available
                    if (window.SQLiteBridge) {
                        this.saveDesignsToSQLite(this.designs);
                        this.saveFamiliesToSQLite(this.families);
                    }

                    this.renderCatalog();
                    this.updateSidebar();
                    this.updateFavoritesDisplay();
                    this.updateStatus(`کاتالوگ بارگذاری شد - ${this.designs.length} طرح`);

                    this.endPerformance('loadCatalog', true, {
                        designsCount: this.designs.length,
                        familiesCount: this.families.length
                    });

                    this.log(`کاتالوگ ExtendScript بارگذاری شد: ${this.designs.length} طرح، ${this.families.length} خانواده`, 'success');

                } else {
                    throw new Error(response.error || 'خطای ناشناخته در بارگذاری کاتالوگ');
                }

            } catch (parseError) {
                this.endPerformance('loadCatalog', false);
                this.handleError(parseError, 'پردازش پاسخ کاتالوگ');
                this.updateStatus('خطا در پردازش داده‌های کاتالوگ');
            }
        });
    }

    saveDesignsToSQLite(designs) {
        if (!window.SQLiteBridge) return;

        designs.forEach(design => {
            window.SQLiteBridge.addDesignToDB(design);
        });
        this.log(`${designs.length} طرح به SQLite ذخیره شد`, 'info');
    }

    saveFamiliesToSQLite(families) {
        if (!window.SQLiteBridge) return;

        families.forEach(family => {
            window.SQLiteBridge.addFamilyToDB(family);
        });
        this.log(`${families.length} خانواده به SQLite ذخیره شد`, 'info');
    }

    validateDesignsData(designs) {
        if (!Array.isArray(designs)) {
            this.log('داده designs نامعتبر است، استفاده از آرایه خالی', 'warn');
            return [];
        }

        return designs.filter(design => {
            if (!design || typeof design !== 'object') {
                this.log('طراحی نامعتبر حذف شد', 'warn');
                return false;
            }

            if (!design.code || typeof design.code !== 'string') {
                this.log(`طراحی بدون کد معتبر حذف شد: ${JSON.stringify(design)}`, 'warn');
                return false;
            }

            return true;
        });
    }

    validateFamiliesData(families) {
        if (!Array.isArray(families)) {
            this.log('داده families نامعتبر است، استفاده از آرایه خالی', 'warn');
            return [];
        }

        return families.filter(family => {
            if (!family || typeof family !== 'object') {
                this.log('خانواده نامعتبر حذف شد', 'warn');
                return false;
            }

            if (!family.code || typeof family.code !== 'string') {
                this.log(`خانواده بدون کد معتبر حذف شد: ${JSON.stringify(family)}`, 'warn');
                return false;
            }

            return true;
        });
    }

    renderCatalog(designs = this.designs) {
        const gallery = document.getElementById('gallery');
        const itemCount = document.getElementById('itemCount');
        const galleryTitle = document.getElementById('galleryTitle');

        gallery.innerHTML = '';
        itemCount.textContent = `${designs.length} آیتم`;

        if (designs.length === 0) {
            gallery.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6c757d;">
                    <div style="font-size: 48px; margin-bottom: 10px;">📭</div>
                    هیچ طرحی یافت نشد
                </div>
            `;
            return;
        }

        // مرتب‌سازی بر اساس اندازه
        const sortBy = this.currentFilter.sortBy || 'none';
        if (sortBy !== 'none') {
            designs = [...designs].sort((a, b) => {
                const sizeOrder = { 'کوچک': 1, 'متوسط': 2, 'بزرگ': 3 };
                const aSize = sizeOrder[a.size] || 0;
                const bSize = sizeOrder[b.size] || 0;

                if (sortBy === 'size-asc') {
                    return aSize - bSize;
                } else if (sortBy === 'size-desc') {
                    return bSize - aSize;
                }
                return 0;
            });
        }

        designs.forEach(design => {
            const card = this.createDesignCard(design);
            gallery.appendChild(card);
        });
    }

    createDesignCard(design) {
        const card = document.createElement('div');
        card.className = 'design-card';
        card.dataset.code = design.code;

        // بررسی انتخاب شدن
        if (this.selectedDesigns.has(design.code)) {
            card.classList.add('selected');
        }

        // Event handlers
        card.onclick = (e) => {
            // اگر Ctrl یا Shift فشرده است، انتخاب چندگانه
            if (e.ctrlKey || e.shiftKey) {
                this.toggleDesignSelection(design.code);
            } else {
                // پاک کردن انتخاب قبلی و انتخاب این کارت
                this.clearSelection();
                this.toggleDesignSelection(design.code);
            }
        };

        card.ondblclick = () => {
            this.showDesignDetails(design);
            this.addToRecents(design.code);
        };

        const typeEmoji = this.getTypeEmoji(design.type);

        card.innerHTML = `
            <div class="design-preview">
                ${typeEmoji}
            </div>
            <div class="design-info">
                <div class="design-code">${design.code}</div>
                <div class="design-type">${design.type}</div>
                <div class="design-size">${design.size}</div>
                <div class="design-era">${design.era}</div>
                <div class="design-tags">
                    ${design.tags.slice(0, 2).map(tag => `<span class="design-tag">${tag}</span>`).join('')}
                    ${design.tags.length > 2 ? `<span class="design-tag">+${design.tags.length - 2}</span>` : ''}
                </div>
            </div>
        `;

        return card;
    }

    getTypeEmoji(type) {
        const emojis = {
            'گل': '🌸',
            'بنک': '🧵',
            'درزی': '✂️',
            'تک': '🎨',
            'کپ گل': '🌺'
        };
        return emojis[type] || '🎭';
    }

    // ========== SELECTION MANAGEMENT ==========

    toggleDesignSelection(code) {
        if (this.selectedDesigns.has(code)) {
            this.selectedDesigns.delete(code);
        } else {
            this.selectedDesigns.add(code);
        }
        this.updateSelectionDisplay();
        this.updateGallerySelection();
    }

    selectAllDesigns() {
        this.designs.forEach(design => {
            this.selectedDesigns.add(design.code);
        });
        this.updateSelectionDisplay();
        this.updateGallerySelection();
    }

    clearSelection() {
        this.selectedDesigns.clear();
        this.updateSelectionDisplay();
        this.updateGallerySelection();
    }

    updateSelectionDisplay() {
        const selectionCount = document.getElementById('selectionCount');
        if (selectionCount) {
            selectionCount.textContent = `${this.selectedDesigns.size} انتخاب شده`;
        }
    }

    updateGallerySelection() {
        // به‌روزرسانی کلاس selected در کارت‌های گالری
        const cards = document.querySelectorAll('.design-card');
        cards.forEach(card => {
            const code = card.dataset.code;
            if (this.selectedDesigns.has(code)) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }

    placeSelectedDesigns() {
        if (this.selectedDesigns.size === 0) {
            this.showErrorNotification('هیچ طرحی انتخاب نشده است');
            return;
        }

        const selectedCodes = Array.from(this.selectedDesigns);
        this.placeMultipleDesigns(selectedCodes);
    }

    placeMultipleDesigns(codes) {
        if (!codes || codes.length === 0) return;

        const data = { codes: codes };
        const script = `placeMultipleSymbols(${JSON.stringify(data)})`;

        this.updateStatus(`در حال قرار دادن ${codes.length} طرح...`);

        this.csInterface.evalScript(script, (result) => {
            try {
                const response = JSON.parse(result);
                if (response.success) {
                    const placedCount = response.placedCount || codes.length;
                    this.updateStatus(`قرار دادن موفق - ${placedCount} آیتم`);
                    this.log(`قرار دادن موفق: ${placedCount} آیتم`, 'success');
                } else {
                    this.updateStatus('خطا در قرار دادن');
                    this.log('خطا در قرار دادن: ' + response.error, 'error');
                }
            } catch (e) {
                this.updateStatus('خطا در پردازش');
                this.log('خطا در پردازش پاسخ قرار دادن: ' + e.message, 'error');
            }
        });
    }

    // ========== SIDEBAR ==========

    updateSidebar() {
        this.updateFamilyList();
        this.updateTagCloud();
    }

    updateFamilyList() {
        const familyList = document.getElementById('familyList');
        familyList.innerHTML = '';

        this.families.forEach(family => {
            const item = document.createElement('div');
            item.className = 'family-item';
            item.innerHTML = `
                <div class="family-name">${family.name}</div>
                <div class="family-actions">
                    <button class="family-view-btn" onclick="extension.showFamilyPage('${family.code}')" title="نمایش خانواده">👁️</button>
                </div>
            `;
            item.onclick = (e) => {
                if (!e.target.classList.contains('family-view-btn')) {
                    this.filterByFamily(family.code);
                }
            };
            familyList.appendChild(item);
        });
    }

    updateTagCloud() {
        const tagContainer = document.getElementById('tagContainer');
        const allTags = window.SQLiteBridge ? window.SQLiteBridge.getAllTags() : [];

        tagContainer.innerHTML = '';
        allTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            tagElement.textContent = tag;
            tagElement.onclick = () => this.toggleTagSelection(tag);
            tagContainer.appendChild(tagElement);
        });

        this.updateSelectedTagsDisplay();
    }

    toggleTagSelection(tag) {
        if (!window.SQLiteBridge) return;

        const selectedTags = window.SQLiteBridge.getSelectedTags();
        const isSelected = selectedTags.includes(tag);

        if (isSelected) {
            // Remove tag
            const newSelection = selectedTags.filter(t => t !== tag);
            window.SQLiteBridge.setSelectedTags(newSelection);
        } else {
            // Add tag
            const newSelection = [...selectedTags, tag];
            window.SQLiteBridge.setSelectedTags(newSelection);
        }

        this.updateSelectedTagsDisplay();
    }

    updateSelectedTagsDisplay() {
        if (!window.SQLiteBridge) return;

        const selectedTags = window.SQLiteBridge.getSelectedTags();
        const tagElements = document.querySelectorAll('#tagContainer .tag');

        tagElements.forEach(element => {
            const tagName = element.textContent;
            if (selectedTags.includes(tagName)) {
                element.classList.add('selected');
            } else {
                element.classList.remove('selected');
            }
        });
    }

    setupTagMergeFunctionality() {
        // Add merge buttons to tag elements
        const tagContainer = document.getElementById('tagContainer');
        if (tagContainer) {
            tagContainer.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const tagElement = e.target.closest('.tag');
                if (tagElement) {
                    this.showTagMergeMenu(tagElement, e.clientX, e.clientY);
                }
            });
        }
    }

    showTagMergeMenu(tagElement, x, y) {
        // Remove existing merge menu
        const existingMenu = document.getElementById('tagMergeMenu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const tagName = tagElement.textContent;
        const menu = document.createElement('div');
        menu.id = 'tagMergeMenu';
        menu.className = 'tag-merge-menu';
        menu.style.position = 'fixed';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.zIndex = '1000';

        menu.innerHTML = `
            <div class="merge-menu-item" onclick="extension.showMergeDialog('${tagName}')">
                ادغام با برچسب دیگر
            </div>
            <div class="merge-menu-item delete" onclick="extension.deleteTag('${tagName}')">
                حذف برچسب
            </div>
        `;

        document.body.appendChild(menu);

        // Close menu on click outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 10);
    }

    showMergeDialog(sourceTag) {
        const mergeDialog = document.createElement('div');
        mergeDialog.className = 'merge-dialog-overlay';
        mergeDialog.innerHTML = `
            <div class="merge-dialog">
                <h3>ادغام برچسب "${sourceTag}"</h3>
                <p>برچسب مقصد را انتخاب کنید:</p>
                <select id="mergeTargetSelect" class="form-select">
                    <option value="">انتخاب برچسب...</option>
                </select>
                <div class="merge-dialog-buttons">
                    <button id="confirmMergeBtn" class="btn btn-primary">ادغام</button>
                    <button id="cancelMergeBtn" class="btn btn-outline">لغو</button>
                </div>
            </div>
        `;

        document.body.appendChild(mergeDialog);

        // Populate target select
        const targetSelect = document.getElementById('mergeTargetSelect');
        const allTags = window.SQLiteBridge ? window.SQLiteBridge.getAllTags() : [];
        allTags.forEach(tag => {
            if (tag !== sourceTag) {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = tag;
                targetSelect.appendChild(option);
            }
        });

        // Event listeners
        document.getElementById('confirmMergeBtn').addEventListener('click', () => {
            const targetTag = targetSelect.value;
            if (targetTag) {
                this.mergeTags(sourceTag, targetTag);
                mergeDialog.remove();
            }
        });

        document.getElementById('cancelMergeBtn').addEventListener('click', () => {
            mergeDialog.remove();
        });
    }

    mergeTags(sourceTag, targetTag) {
        if (!window.SQLiteBridge) return;

        this.log(`ادغام برچسب "${sourceTag}" به "${targetTag}"`, 'info');

        // Merge tags in database
        if (window.SQLiteBridge.mergeTags(sourceTag, targetTag)) {
            this.updateTagCloud();
            this.loadCatalog(); // Refresh to show merged tags
            this.log(`برچسب‌ها با موفقیت ادغام شدند`, 'success');
        } else {
            this.log('خطا در ادغام برچسب‌ها', 'error');
        }
    }

    deleteTag(tagName) {
        if (!window.SQLiteBridge) return;

        if (confirm(`آیا مطمئن هستید که می‌خواهید برچسب "${tagName}" را حذف کنید؟`)) {
            this.log(`حذف برچسب "${tagName}"`, 'info');

            if (window.SQLiteBridge.deleteTag(tagName)) {
                this.updateTagCloud();
                this.loadCatalog(); // Refresh to show deleted tag
                this.log(`برچسب با موفقیت حذف شد`, 'success');
            } else {
                this.log('خطا در حذف برچسب', 'error');
            }
        }
    }

    addNewTag() {
        if (!window.SQLiteBridge) return;

        const newTagInput = document.getElementById('newTagInput');
        const tagName = newTagInput.value.trim();

        if (!tagName) return;

        if (window.SQLiteBridge.addTagToDB(tagName)) {
            newTagInput.value = '';
            this.updateTagCloud();
            this.log(`برچسب جدید اضافه شد: ${tagName}`, 'success');
        } else {
            this.log('خطا در اضافه کردن برچسب', 'error');
        }
    }

    // ========== SEARCH & FILTER ==========

    applyFilters() {
        if (window.SQLiteBridge) {
            // استفاده از SQLite برای فیلتر پیشرفته
            const filters = {
                keyword: this.currentFilter.search || '',
                type: this.currentFilter.type || '',
                size: this.currentFilter.size || '',
                era: this.currentFilter.era || '',
                family: this.currentFilter.family || '',
                tags: window.SQLiteBridge.getSelectedTags() || []
            };

            const filtered = window.SQLiteBridge.searchDesigns(filters);
            this.renderCatalog(filtered);
        } else {
            // Fallback به روش قدیمی
            let filtered = [...this.designs];

            // Search filter
            if (this.currentFilter.search) {
                const searchTerm = this.currentFilter.search.toLowerCase();
                filtered = filtered.filter(design =>
                    design.code.toLowerCase().includes(searchTerm) ||
                    design.type.toLowerCase().includes(searchTerm) ||
                    design.tags.some(tag => tag.toLowerCase().includes(searchTerm))
                );
            }

            // Type filter
            if (this.currentFilter.type) {
                filtered = filtered.filter(design => design.type === this.currentFilter.type);
            }

            // Family filter
            if (this.currentFilter.family) {
                filtered = filtered.filter(design =>
                    design.family_codes.includes(this.currentFilter.family)
                );
            }

            // Size filter
            if (this.currentFilter.size) {
                filtered = filtered.filter(design => design.size === this.currentFilter.size);
            }

            // Era filter
            if (this.currentFilter.era) {
                filtered = filtered.filter(design => design.era === this.currentFilter.era);
            }

            this.renderCatalog(filtered);
        }
    }

    filterByFamily(familyCode) {
        document.getElementById('familyFilter').value = familyCode;
        this.currentFilter.family = familyCode;
        this.applyFilters();
    }

    showFamilyPage(familyCode) {
        const family = this.families.find(f => f.code === familyCode);
        if (!family) {
            this.showErrorNotification('خانواده یافت نشد');
            return;
        }

        // Get all designs in this family
        const familyDesigns = this.designs.filter(design =>
            design.family_codes && design.family_codes.includes(familyCode)
        );

        // Get the representative flower (if exists)
        const flowerDesign = familyDesigns.find(d => d.type === 'گل' && d.code === familyCode);

        // Create family page modal
        const familyModal = document.createElement('div');
        familyModal.className = 'modal family-page-modal';
        familyModal.id = 'familyPageModal';

        familyModal.innerHTML = `
            <div class="modal-content family-modal-content">
                <div class="modal-header">
                    <h3>خانواده ${family.name}</h3>
                    <button id="closeFamilyPageModalBtn" class="close-btn">&times;</button>
                </div>
                <div class="family-page-content">
                    ${flowerDesign ? `
                    <div class="family-representative">
                        <h4>نماینده خانواده</h4>
                        <div class="representative-card" onclick="extension.showDesignDetails('${flowerDesign.code}')">
                            <div class="rep-preview">${this.getTypeEmoji(flowerDesign.type)}</div>
                            <div class="rep-info">
                                <div class="rep-code">${flowerDesign.code}</div>
                                <div class="rep-tags">${flowerDesign.tags.slice(0, 3).join(', ')}</div>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <div class="family-members">
                        <h4>اعضای خانواده (${familyDesigns.length})</h4>
                        <div class="family-members-grid" id="familyMembersGrid">
                            ${familyDesigns.filter(d => d.type !== 'گل' || d.code !== familyCode).map(design => `
                                <div class="member-card" onclick="extension.showDesignDetails('${design.code}')">
                                    <div class="member-preview">${this.getTypeEmoji(design.type)}</div>
                                    <div class="member-info">
                                        <div class="member-code">${design.code}</div>
                                        <div class="member-type">${design.type}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="family-actions">
                        <button class="btn btn-primary" onclick="extension.placeSelectedDesigns()">
                            قرار دادن همه اعضا
                        </button>
                        <button class="btn btn-outline" onclick="extension.selectFamilyMembers('${familyCode}')">
                            انتخاب همه اعضا
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(familyModal);
        this.showModal('familyPageModal');

        // Add close button event
        document.getElementById('closeFamilyPageModalBtn').addEventListener('click', () => {
            this.hideModal('familyPageModal');
            familyModal.remove();
        });
    }

    selectFamilyMembers(familyCode) {
        const familyDesigns = this.designs.filter(design =>
            design.family_codes && design.family_codes.includes(familyCode)
        );

        familyDesigns.forEach(design => {
            this.selectedDesigns.add(design.code);
        });

        this.updateSelectionDisplay();
        this.updateGallerySelection();
        this.hideModal('familyPageModal');
        document.getElementById('familyPageModal').remove();

        this.log(`${familyDesigns.length} عضو خانواده انتخاب شد`, 'info');
    }

    filterByTag(tag) {
        document.getElementById('searchInput').value = tag;
        this.currentFilter.search = tag;
        this.applyFilters();
    }

    // ========== MODALS ==========

    showDesignDetails(design) {
        const isFavorite = this.favorites.has(design.code);

        const modal = document.getElementById('detailModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = `جزئیات ${design.code}`;

        modalBody.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 64px;">${this.getTypeEmoji(design.type)}</div>
            </div>
            <div style="display: grid; gap: 10px;">
                <div><strong>کد:</strong> ${design.code}</div>
                <div><strong>نوع:</strong> ${design.type}</div>
                <div><strong>خانواده:</strong> ${design.family_codes.join(', ')}</div>
                <div><strong>اندازه:</strong> ${design.size}</div>
                ${design.dimensions ? `
                <div><strong>ابعاد:</strong> ${design.dimensions.width} × ${design.dimensions.height} px</div>
                <div><strong>مساحت:</strong> ${design.dimensions.area} px²</div>
                ` : ''}
                <div><strong>دوره زمانی:</strong> ${design.era}</div>
                <div><strong>برچسب‌ها:</strong> ${design.tags.join(', ')}</div>
                <div><strong>توضیحات:</strong> ${design.desc || 'ندارد'}</div>
            </div>
            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <button class="btn btn-primary" onclick="extension.showPlaceModal('${design.code}')">
                    📍 قرار دادن
                </button>
                <button class="btn btn-outline" onclick="extension.showEditDesignModal('${design.code}')">
                    ✏️ ویرایش
                </button>
                <button class="btn ${isFavorite ? 'btn-warning' : 'btn-outline'}" onclick="extension.toggleFavorite('${design.code}')">
                    ${isFavorite ? '⭐' : '☆'} ${isFavorite ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
                </button>
            </div>
        `;

        this.showModal('detailModal');
    }

    showBatchModal() {
        const modal = document.getElementById('batchModal');
        const batchFamilies = document.getElementById('batchFamilies');

        batchFamilies.innerHTML = '';
        this.families.forEach(family => {
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'checkbox-item';
            checkboxItem.innerHTML = `
                <input type="checkbox" id="family-${family.code}" value="${family.code}">
                <label for="family-${family.code}">${family.name} (${family.code})</label>
            `;
            batchFamilies.appendChild(checkboxItem);
        });

        this.showModal('batchModal');
    }

    showPlaceModal(designCode) {
        this.selectedDesignCode = designCode;
        this.hideModal('detailModal');
        this.showModal('placeModal');
    }

    showArrangeOptions() {
        const arrangeOptions = document.querySelector('.arrange-options');
        arrangeOptions.style.display = 'block';
    }

    showFamilyConnectModal() {
        if (this.selectedDesigns.size === 0) {
            this.showErrorNotification('هیچ طرحی انتخاب نشده است');
            return;
        }

        const modal = document.getElementById('familyConnectModal');
        const familyList = document.getElementById('familySelectionList');

        familyList.innerHTML = '';

        this.families.forEach(family => {
            const familyItem = document.createElement('div');
            familyItem.className = 'family-select-item';
            familyItem.innerHTML = `
                <input type="checkbox" id="family-${family.code}" value="${family.code}">
                <label for="family-${family.code}">
                    <span class="family-code">${family.code}</span>
                    <span class="family-name">${family.name}</span>
                </label>
            `;
            familyList.appendChild(familyItem);
        });

        this.showModal('familyConnectModal');
    }

    showBatchEditModal() {
        if (this.selectedDesigns.size === 0) {
            this.showErrorNotification('هیچ طرحی انتخاب نشده است');
            return;
        }

        const modal = document.getElementById('batchEditModal');
        const familySelection = document.getElementById('batchFamilySelection');

        familySelection.innerHTML = '';

        this.families.forEach(family => {
            const familyItem = document.createElement('div');
            familyItem.className = 'checkbox-item';
            familyItem.innerHTML = `
                <input type="checkbox" id="batch-family-${family.code}" value="${family.code}">
                <label for="batch-family-${family.code}">${family.name} (${family.code})</label>
            `;
            familySelection.appendChild(familyItem);
        });

        this.showModal('batchEditModal');
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.add('show');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }

    // ========== DESIGN OPERATIONS ==========

    batchRegisterDesigns() {
        try {
            this.startPerformance('batchRegister');
            this.log('شروع ثبت گروهی طرح‌ها', 'info');

            // Validate inputs
            const type = document.getElementById('batchType').value;
            if (!type) {
                throw new Error('نوع طرح انتخاب نشده است');
            }

            // Get selected tags from new system
            const selectedTags = window.SQLiteBridge ? window.SQLiteBridge.getSelectedTags() : [];

            // اندازه به صورت اتوماتیک محاسبه می‌شود
            const era = document.getElementById('batchEra').value;

            const selectedFamilies = Array.from(document.querySelectorAll('#batchFamilies input:checked'))
                .map(cb => cb.value);

            // Validate family selection for non-flower types
            if (type !== 'گل' && selectedFamilies.length === 0) {
                throw new Error('برای طرح‌های غیر گل باید حداقل یک خانواده انتخاب کنید');
            }

            const data = {
                type,
                family_codes: selectedFamilies,
                tags: selectedTags,
                era
            };

            this.log(`ثبت گروهی: نوع=${type}, خانواده‌ها=${selectedFamilies.length}, برچسب‌ها=${selectedTags.length}`, 'info');

            this.updateStatus('در حال ثبت گروهی...');

            const script = `batchRegisterDesigns(${JSON.stringify(data)})`;

            this.csInterface.evalScript(script, (result) => {
                try {
                    if (!result || result.trim() === '') {
                        throw new Error('پاسخ خالی از ExtendScript دریافت شد');
                    }

                    const response = JSON.parse(result);

                    if (response.success) {
                        const registeredCount = response.registeredCount || 0;
                        this.updateStatus(`ثبت موفق - ${registeredCount} طرح`);
                        this.hideModal('batchModal');

                        // Clear selected tags after successful registration
                        if (window.SQLiteBridge) {
                            window.SQLiteBridge.setSelectedTags([]);
                            this.updateSelectedTagsDisplay();
                        }

                        this.loadCatalog();

                        this.endPerformance('batchRegister', true, {
                            registeredCount,
                            type,
                            tagsCount: selectedTags.length
                        });

                        this.log(`ثبت گروهی موفق: ${registeredCount} طرح`, 'success');

                    } else {
                        throw new Error(response.error || 'خطای ناشناخته در ثبت گروهی');
                    }

                } catch (parseError) {
                    this.endPerformance('batchRegister', false);
                    this.handleError(parseError, 'پردازش پاسخ ثبت گروهی');
                    this.updateStatus('خطا در پردازش پاسخ ثبت');
                }
            });

        } catch (validationError) {
            this.endPerformance('batchRegister', false);
            this.handleError(validationError, 'اعتبارسنجی داده‌های ثبت گروهی');
        }
    }

    placeDesign(mode) {
        if (!this.selectedDesignCode) return;

        let script;
        const data = { code: this.selectedDesignCode };

        if (mode === 'single') {
            script = `placeDesign(${JSON.stringify(data)})`;
        } else if (mode === 'family') {
            // Get all family members from SQLite
            if (window.SQLiteBridge) {
                const familyCodes = window.SQLiteBridge.getFamilyDesigns(this.selectedDesignCode);
                if (familyCodes.length > 0) {
                    data.codes = familyCodes;
                    script = `placeMultipleSymbols(${JSON.stringify(data)})`;
                } else {
                    this.log('هیچ عضوی برای این خانواده یافت نشد', 'warn');
                    return;
                }
            } else {
                script = `placeFamily(${JSON.stringify(data)})`;
            }
        } else if (mode === 'multiple') {
            const rows = parseInt(document.getElementById('arrangeRows').value) || 1;
            const cols = parseInt(document.getElementById('arrangeCols').value) || 1;
            data.arrange = { rows, cols };
            script = `placeMultipleDesigns(${JSON.stringify(data)})`;
        }

        this.updateStatus('در حال قرار دادن روی آرتبورد...');

        this.csInterface.evalScript(script, (result) => {
            try {
                const response = JSON.parse(result);
                if (response.success) {
                    const placedCount = response.placedCount || response.message?.match(/\d+/)?.[0] || 1;
                    this.updateStatus(`قرار دادن موفق - ${placedCount} آیتم`);
                    this.hideModal('placeModal');
                    this.log(`قرار دادن موفق: ${placedCount} آیتم`, 'success');
                } else {
                    this.updateStatus('خطا در قرار دادن');
                    this.log('خطا در قرار دادن: ' + response.error, 'error');
                }
            } catch (e) {
                this.updateStatus('خطا در پردازش');
                this.log('خطا در پردازش پاسخ قرار دادن: ' + e.message, 'error');
            }
        });
    }

    connectSelectedToFamilies() {
        const selectedFamilies = Array.from(document.querySelectorAll('#familySelectionList input:checked'))
            .map(cb => cb.value);

        if (selectedFamilies.length === 0) {
            this.showErrorNotification('هیچ خانواده‌ای انتخاب نشده است');
            return;
        }

        const selectedCodes = Array.from(this.selectedDesigns);
        this.log(`اتصال ${selectedCodes.length} طرح به ${selectedFamilies.length} خانواده`, 'info');

        // Update in SQLite
        if (window.SQLiteBridge) {
            selectedCodes.forEach(code => {
                const design = this.designs.find(d => d.code === code);
                if (design) {
                    // Add new families to existing ones
                    const currentFamilies = design.family_codes || [];
                    const newFamilies = [...new Set([...currentFamilies, ...selectedFamilies])];
                    design.family_codes = newFamilies;

                    window.SQLiteBridge.updateDesignFamilies(code, newFamilies);
                }
            });
        }

        // Update in ExtendScript
        const data = {
            codes: selectedCodes,
            family_codes: selectedFamilies
        };

        const script = `connectDesignsToFamilies(${JSON.stringify(data)})`;

        this.csInterface.evalScript(script, (result) => {
            try {
                const response = JSON.parse(result);
                if (response.success) {
                    this.updateStatus(`اتصال موفق - ${selectedCodes.length} طرح به خانواده‌ها`);
                    this.hideModal('familyConnectModal');
                    this.loadCatalog(); // Reload to show updated family connections
                    this.log('اتصال به خانواده‌ها موفق', 'success');
                } else {
                    this.updateStatus('خطا در اتصال به خانواده‌ها');
                    this.log('خطا در اتصال به خانواده‌ها: ' + response.error, 'error');
                }
            } catch (e) {
                this.updateStatus('خطا در پردازش');
                this.log('خطا در پردازش پاسخ اتصال: ' + e.message, 'error');
            }
        });
    }

    applyBatchEdit() {
        const newTagsInput = document.getElementById('batchTagsInput').value.trim();
        const selectedFamilies = Array.from(document.querySelectorAll('#batchFamilySelection input:checked'))
            .map(cb => cb.value);
        const newSize = document.getElementById('batchSizeSelect').value;
        const newEra = document.getElementById('batchEraSelect').value;

        const selectedCodes = Array.from(this.selectedDesigns);
        this.log(`ویرایش گروهی ${selectedCodes.length} طرح`, 'info');

        // Prepare update data
        const updates = {};

        if (newTagsInput) {
            const newTags = newTagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
            if (newTags.length > 0) {
                updates.tags = newTags;
            }
        }

        if (selectedFamilies.length > 0) {
            updates.family_codes = selectedFamilies;
        }

        if (newSize) {
            updates.size = newSize;
        }

        if (newEra) {
            updates.era = newEra;
        }

        if (Object.keys(updates).length === 0) {
            this.showErrorNotification('هیچ تغییری انتخاب نشده است');
            return;
        }

        // Update in SQLite
        if (window.SQLiteBridge) {
            selectedCodes.forEach(code => {
                window.SQLiteBridge.updateDesignBatch(code, updates);
            });
        }

        // Update in ExtendScript
        const data = {
            codes: selectedCodes,
            updates: updates
        };

        const script = `batchUpdateDesigns(${JSON.stringify(data)})`;

        this.csInterface.evalScript(script, (result) => {
            try {
                const response = JSON.parse(result);
                if (response.success) {
                    this.updateStatus(`ویرایش گروهی موفق - ${selectedCodes.length} طرح`);
                    this.hideModal('batchEditModal');
                    this.loadCatalog(); // Reload to show updated data
                    this.log('ویرایش گروهی موفق', 'success');
                } else {
                    this.updateStatus('خطا در ویرایش گروهی');
                    this.log('خطا در ویرایش گروهی: ' + response.error, 'error');
                }
            } catch (e) {
                this.updateStatus('خطا در پردازش');
                this.log('خطا در پردازش پاسخ ویرایش گروهی: ' + e.message, 'error');
            }
        });
    }

    showEditDesignModal(code) {
        const design = this.designs.find(d => d.code === code);
        if (!design) {
            this.showErrorNotification('طرح یافت نشد');
            return;
        }

        this.currentEditDesign = design;

        // Hide detail modal if open
        this.hideModal('detailModal');

        // Fill form fields
        document.getElementById('editModalTitle').textContent = `ویرایش ${design.code}`;
        document.getElementById('editCodeInput').value = design.code;
        document.getElementById('editTypeInput').value = design.type;
        document.getElementById('editSizeSelect').value = design.size || 'متوسط';
        document.getElementById('editEraSelect').value = design.era || 'جدید';
        document.getElementById('editDescTextarea').value = design.desc || '';

        // Load tags
        this.loadEditTags(design.tags || []);

        // Load families
        this.loadEditFamilies(design.family_codes || []);

        this.showModal('editDesignModal');
    }

    loadEditTags(tags) {
        const container = document.getElementById('editTagsContainer');
        container.innerHTML = '';

        tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'edit-tag';
            tagElement.innerHTML = `
                ${tag}
                <button class="tag-remove" onclick="extension.removeEditTag('${tag}')">&times;</button>
            `;
            container.appendChild(tagElement);
        });
    }

    loadEditFamilies(familyCodes) {
        const container = document.getElementById('editFamiliesContainer');
        container.innerHTML = '';

        this.families.forEach(family => {
            const familyElement = document.createElement('div');
            familyElement.className = 'family-checkbox-item';
            familyElement.innerHTML = `
                <input type="checkbox" id="edit-family-${family.code}"
                       value="${family.code}"
                       ${familyCodes.includes(family.code) ? 'checked' : ''}>
                <label for="edit-family-${family.code}">${family.name} (${family.code})</label>
            `;
            container.appendChild(familyElement);
        });
    }

    addTagToEdit() {
        const input = document.getElementById('editNewTagInput');
        const tagName = input.value.trim();

        if (!tagName) return;

        // Check if tag already exists
        const container = document.getElementById('editTagsContainer');
        const existingTags = Array.from(container.querySelectorAll('.edit-tag')).map(el =>
            el.textContent.replace('×', '').trim()
        );

        if (existingTags.includes(tagName)) {
            this.showErrorNotification('این برچسب قبلاً اضافه شده است');
            return;
        }

        // Add to UI
        const tagElement = document.createElement('span');
        tagElement.className = 'edit-tag';
        tagElement.innerHTML = `
            ${tagName}
            <button class="tag-remove" onclick="extension.removeEditTag('${tagName}')">&times;</button>
        `;
        container.appendChild(tagElement);

        input.value = '';

        // Add to SQLite if new
        if (window.SQLiteBridge && window.SQLiteBridge.addTagToDB(tagName)) {
            this.log(`برچسب جدید اضافه شد: ${tagName}`, 'info');
        }
    }

    removeEditTag(tagName) {
        const container = document.getElementById('editTagsContainer');
        const tagElements = container.querySelectorAll('.edit-tag');

        tagElements.forEach(element => {
            if (element.textContent.replace('×', '').trim() === tagName) {
                element.remove();
            }
        });
    }

    saveDesignEdit() {
        if (!this.currentEditDesign) return;

        const updates = {};

        // Get current tags from UI
        const tagContainer = document.getElementById('editTagsContainer');
        const currentTags = Array.from(tagContainer.querySelectorAll('.edit-tag')).map(el =>
            el.textContent.replace('×', '').trim()
        );
        updates.tags = currentTags;

        // Get selected families
        const selectedFamilies = Array.from(document.querySelectorAll('#editFamiliesContainer input:checked'))
            .map(cb => cb.value);
        updates.family_codes = selectedFamilies;

        // Get other fields
        updates.size = document.getElementById('editSizeSelect').value;
        updates.era = document.getElementById('editEraSelect').value;
        updates.desc = document.getElementById('editDescTextarea').value.trim();

        // Update in SQLite
        if (window.SQLiteBridge) {
            window.SQLiteBridge.updateDesignBatch(this.currentEditDesign.code, updates);
        }

        // Update in ExtendScript
        const data = {
            codes: [this.currentEditDesign.code],
            updates: updates
        };

        const script = `batchUpdateDesigns(${JSON.stringify(data)})`;

        this.csInterface.evalScript(script, (result) => {
            try {
                const response = JSON.parse(result);
                if (response.success) {
                    this.updateStatus(`طرح ${this.currentEditDesign.code} بروزرسانی شد`);
                    this.hideModal('editDesignModal');
                    this.loadCatalog(); // Reload to show updated data
                    this.log(`طرح ${this.currentEditDesign.code} بروزرسانی شد`, 'success');
                } else {
                    this.updateStatus('خطا در بروزرسانی طرح');
                    this.log('خطا در بروزرسانی طرح: ' + response.error, 'error');
                }
            } catch (e) {
                this.updateStatus('خطا در پردازش');
                this.log('خطا در پردازش پاسخ بروزرسانی: ' + e.message, 'error');
            }
        });
    }

    syncNotesWithDB() {
        try {
            this.startPerformance('sync');
            this.log('شروع همگام‌سازی Note ↔ DB', 'info');
            this.updateStatus('در حال همگام‌سازی...');

            const script = 'syncNotesWithDatabase()';

            this.csInterface.evalScript(script, (result) => {
                try {
                    if (!result || result.trim() === '') {
                        throw new Error('پاسخ خالی از ExtendScript دریافت شد');
                    }

                    const response = JSON.parse(result);

                    if (response.success) {
                        const stats = response.stats || {};
                        const message = `همگام‌سازی موفق:
اضافه شده: ${stats.added || 0}
به‌روزرسانی شده: ${stats.updated || 0}
بدون تغییر: ${stats.unchanged || 0}
خطا: ${stats.errors || 0}`;

                        this.updateStatus(message);
                        this.showErrorNotification(message, 'success');

                        // Reload catalog to show synced data
                        this.loadCatalog();

                        this.endPerformance('sync', true, stats);
                        this.log('همگام‌سازی موفق', 'success', stats);

                    } else {
                        throw new Error(response.error || 'خطای ناشناخته در همگام‌سازی');
                    }

                } catch (parseError) {
                    this.endPerformance('sync', false);
                    this.handleError(parseError, 'پردازش پاسخ همگام‌سازی');
                    this.updateStatus('خطا در همگام‌سازی');
                }
            });

        } catch (error) {
            this.endPerformance('sync', false);
            this.handleError(error, 'همگام‌سازی');
        }
    }

    toggleFavorite(code) {
        if (this.favorites.has(code)) {
            this.favorites.delete(code);
            this.log(`طرح ${code} از علاقه‌مندی‌ها حذف شد`, 'info');
        } else {
            this.favorites.add(code);
            this.log(`طرح ${code} به علاقه‌مندی‌ها اضافه شد`, 'info');
        }

        // Save favorites to localStorage
        this.saveFavoritesToStorage();

        // Update UI
        this.updateFavoritesDisplay();

        this.hideModal('detailModal');
    }

    addToRecents(code) {
        // Remove if already exists
        this.recents = this.recents.filter(c => c !== code);

        // Add to beginning
        this.recents.unshift(code);

        // Keep only last 10
        if (this.recents.length > 10) {
            this.recents = this.recents.slice(0, 10);
        }

        // Save to localStorage
        this.saveRecentsToStorage();
    }

    saveFavoritesToStorage() {
        try {
            localStorage.setItem('vectorCatalog_favorites', JSON.stringify(Array.from(this.favorites)));
        } catch (e) {
            this.log('خطا در ذخیره علاقه‌مندی‌ها', 'error');
        }
    }

    saveRecentsToStorage() {
        try {
            localStorage.setItem('vectorCatalog_recents', JSON.stringify(this.recents));
        } catch (e) {
            this.log('خطا در ذخیره موارد اخیر', 'error');
        }
    }

    loadFavoritesFromStorage() {
        try {
            const stored = localStorage.getItem('vectorCatalog_favorites');
            if (stored) {
                this.favorites = new Set(JSON.parse(stored));
            }
        } catch (e) {
            this.log('خطا در بارگذاری علاقه‌مندی‌ها', 'error');
        }
    }

    loadRecentsFromStorage() {
        try {
            const stored = localStorage.getItem('vectorCatalog_recents');
            if (stored) {
                this.recents = JSON.parse(stored);
            }
        } catch (e) {
            this.log('خطا در بارگذاری موارد اخیر', 'error');
        }
    }

    updateFavoritesDisplay() {
        // Update favorite indicators in gallery
        const cards = document.querySelectorAll('.design-card');
        cards.forEach(card => {
            const code = card.dataset.code;
            const favoriteIndicator = card.querySelector('.favorite-indicator');

            if (this.favorites.has(code)) {
                if (!favoriteIndicator) {
                    const indicator = document.createElement('div');
                    indicator.className = 'favorite-indicator';
                    indicator.innerHTML = '⭐';
                    card.appendChild(indicator);
                }
            } else {
                if (favoriteIndicator) {
                    favoriteIndicator.remove();
                }
            }
        });
    }

    showFavorites() {
        const favoriteDesigns = this.designs.filter(design => this.favorites.has(design.code));
        this.renderCatalog(favoriteDesigns);
        document.getElementById('galleryTitle').textContent = `علاقه‌مندی‌ها (${favoriteDesigns.length})`;
    }

    showRecents() {
        const recentDesigns = this.recents.map(code =>
            this.designs.find(design => design.code === code)
        ).filter(design => design); // Remove nulls

        this.renderCatalog(recentDesigns);
        document.getElementById('galleryTitle').textContent = `موارد اخیر (${recentDesigns.length})`;
    }

    exportCatalog() {
        try {
            this.startPerformance('export');
            this.log('شروع Export کاتالوگ', 'info');
            this.updateStatus('در حال Export...');

            const exportData = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    version: '1.0',
                    totalDesigns: this.designs.length,
                    totalFamilies: this.families.length,
                    totalTags: window.SQLiteBridge ? window.SQLiteBridge.getAllTags().length : 0
                },
                designs: this.designs,
                families: this.families,
                tags: window.SQLiteBridge ? window.SQLiteBridge.getAllTags() : [],
                favorites: Array.from(this.favorites),
                recents: this.recents
            };

            // Create JSON file
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // Create download link
            const link = document.createElement('a');
            link.href = url;
            link.download = `vector-catalog-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up
            URL.revokeObjectURL(url);

            this.updateStatus(`Export موفق - ${this.designs.length} طرح`);
            this.log(`Export موفق: ${this.designs.length} طرح`, 'success');

            this.endPerformance('export', true, {
                designsCount: this.designs.length,
                fileSize: jsonString.length
            });

        } catch (error) {
            this.endPerformance('export', false);
            this.handleError(error, 'Export کاتالوگ');
        }
    }

    importCatalog(file) {
        try {
            this.startPerformance('import');
            this.log('شروع Import کاتالوگ', 'info');
            this.updateStatus('در حال Import...');

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importData = JSON.parse(e.target.result);

                    if (!importData.designs || !Array.isArray(importData.designs)) {
                        throw new Error('فرمت فایل Import نامعتبر است');
                    }

                    // Import designs
                    if (window.SQLiteBridge) {
                        importData.designs.forEach(design => {
                            window.SQLiteBridge.addDesignToDB(design);
                        });
                    }

                    // Import families
                    if (importData.families && window.SQLiteBridge) {
                        importData.families.forEach(family => {
                            window.SQLiteBridge.addFamilyToDB(family);
                        });
                    }

                    // Import tags
                    if (importData.tags && window.SQLiteBridge) {
                        importData.tags.forEach(tag => {
                            window.SQLiteBridge.addTagToDB(tag);
                        });
                    }

                    // Import favorites and recents
                    if (importData.favorites) {
                        this.favorites = new Set(importData.favorites);
                        this.saveFavoritesToStorage();
                    }

                    if (importData.recents) {
                        this.recents = importData.recents;
                        this.saveRecentsToStorage();
                    }

                    // Reload catalog
                    this.loadCatalog();

                    const importedCount = importData.designs.length;
                    this.updateStatus(`Import موفق - ${importedCount} طرح`);
                    this.log(`Import موفق: ${importedCount} طرح`, 'success');

                    this.endPerformance('import', true, {
                        importedCount,
                        hasFamilies: !!importData.families,
                        hasTags: !!importData.tags
                    });

                } catch (parseError) {
                    this.endPerformance('import', false);
                    this.handleError(parseError, 'پردازش فایل Import');
                }
            };

            reader.readAsText(file);

        } catch (error) {
            this.endPerformance('import', false);
            this.handleError(error, 'Import کاتالوگ');
        }
    }

    editDesign(code) {
        // Legacy method - redirect to new modal
        this.showEditDesignModal(code);
    }

    // ========== UTILITIES ==========

    generateCode(type) {
        const typeMap = {
            'گل': 'G',
            'بنک': 'B',
            'درزی': 'D',
            'تک': 'T',
            'کپ گل': 'K'
        };

        const prefix = typeMap[type] || 'X';
        const existingCodes = this.designs
            .filter(d => d.type === type)
            .map(d => parseInt(d.code.substring(1)))
            .filter(n => !isNaN(n));

        const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
        return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    }

    updateStatus(message) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
}

// راه‌اندازی برنامه
function initializeApp() {
    if (typeof VectorCatalogExtension !== 'undefined') {
        try {
            console.log('Initializing VectorCatalogExtension...');
            window.extension = new VectorCatalogExtension();
            console.log('VectorCatalogExtension initialized successfully');
        } catch (error) {
            console.error('Error initializing extension:', error);
        }
    } else {
        console.error('VectorCatalogExtension class not found');
    }
}

// اگر DOM آماده است، مستقیم راه‌اندازی کن
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM قبلاً load شده
    initializeApp();
}
