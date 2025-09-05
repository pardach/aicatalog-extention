// Debug ExtendScript Response
// این کد را در Console مرورگر اجرا کنید

function debugExtendScript() {
    console.log("=== Debug ExtendScript ===");

    // تست اتصال CSInterface
    if (typeof CSInterface !== 'undefined') {
        console.log("✅ CSInterface موجود است");

        const csInterface = new CSInterface();

        // تست فراخوانی ساده
        csInterface.evalScript('alert("Hello from ExtendScript")', (result) => {
            console.log("✅ evalScript کار می‌کند");
        });

        // تست getAllSymbolsData
        csInterface.evalScript('getAllSymbolsData()', (result) => {
            console.log("پاسخ ExtendScript:");
            console.log("نوع:", typeof result);
            console.log("طول:", result ? result.length : 0);
            console.log("محتوا:", result ? result.substring(0, 200) : "خالی");

            if (result) {
                try {
                    const parsed = JSON.parse(result);
                    console.log("✅ JSON.parse موفق:", parsed);
                } catch (parseError) {
                    console.error("❌ JSON.parse شکست:", parseError.message);
                    console.log("اولین کاراکتر:", result.charAt(0));
                    console.log("آخرین کاراکتر:", result.charAt(result.length - 1));
                }
            }
        });

    } else {
        console.error("❌ CSInterface یافت نشد");
    }

    console.log("=== پایان Debug ===");
}

// اجرای تست
debugExtendScript();
