const puppeteer = require('puppeteer');
const path = require('path');

const URL_TO_TEST = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io/project/default';

(async () => {
    console.log('Testing URL:', URL_TO_TEST);
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: path.join(__dirname, '../browser_bin/chrome/win64-144.0.7559.96/chrome-win64/chrome.exe'),
        userDataDir: path.join(__dirname, '../.puppeteer_debug_' + Date.now()),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--ignore-certificate-errors',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process,HttpsUpgrades,StrictTransportSecurity',
            '--disable-hsts',
            '--window-size=1280,720'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('Navigating...');
        const response = await page.goto(URL_TO_TEST, { waitUntil: 'networkidle2', timeout: 30000 });

        console.log('Final URL:', page.url());
        console.log('Status:', response ? response.status() : 'null');

        const content = await page.content();
        console.log('Title:', await page.title());
        console.log('Content Preview:', content.substring(0, 500));

        await page.screenshot({ path: 'debug_connectivity.png' });
        console.log('Screenshot saved to debug_connectivity.png');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
})();
