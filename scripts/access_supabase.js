const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Running Network Diagnostics (Attempt 3)...');

    const targetUrl = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io';
    const ipUrl = 'http://148.230.91.43'; // Assuming standard port 80

    try {
        // 1. Connectivity Check via fetch (Node.js level)
        console.log(`📡 Checking HTTP access to ${targetUrl} via fetch...`);
        try {
            const response = await fetch(targetUrl);
            console.log(`✅ Fetch Status: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.log(`📄 Response snippet: ${text.substring(0, 100)}...`);
        } catch (e) {
            console.log(`❌ Fetch failed: ${e.message}`);
        }

        // 2. Browser Check with Disabled Security
        console.log('🚀 Launching browser with --disable-web-security...');
        const browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--ignore-certificate-errors',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Attempt 1: Target URL
        console.log(`🌍 Browser Navigating to: ${targetUrl}`);
        try {
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
            console.log(`✅ Title: ${await page.title()}`);
            await page.screenshot({ path: 'debug_supabase_url.png' });
        } catch (e) {
            console.log(`❌ Browser URL Access Failed: ${e.message}`);
        }

        // Attempt 2: IP Address (Fallback)
        console.log(`🌍 Browser Navigating to IP: ${ipUrl}`);
        try {
            await page.goto(ipUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
            console.log(`✅ IP Title: ${await page.title()}`);
            await page.screenshot({ path: 'debug_supabase_ip.png' });
        } catch (e) {
            console.log(`❌ Browser IP Access Failed: ${e.message}`);
        }

        await browser.close();

    } catch (error) {
        console.error('❌ Script Error:', error.message);
        process.exit(1);
    }
})();
