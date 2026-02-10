const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// User confirmed HTTP is correct
const SUPABASE_URL = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io/project/default';
console.log('Using URL:', SUPABASE_URL);

const USER = 'cgdTQxH0zR0O4Y9A';
const PASS = 'yoe6IkbqsoDBaQNGJ2zk7mtj7V85X7QY';

// The SQL to execute
const SQL_FILE = path.join(__dirname, '../src/db/migrations/002_add_email_to_profiles.sql');
const SQL_CONTENT = fs.readFileSync(SQL_FILE, 'utf8');

async function run() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: path.join(__dirname, '../browser_bin/chrome/win64-144.0.7559.96/chrome-win64/chrome.exe'),
        defaultViewport: null,
        userDataDir: path.join(__dirname, '../.puppeteer_user_data_' + Date.now()), // Unique user data dir to avoid HSTS cache
        args: [
            '--start-maximized',
            '--ignore-certificate-errors',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--allow-running-insecure-content',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process,HttpsUpgrades,StrictTransportSecurity', // Disable HSTS explicitly if possible via features
            '--disable-hsts'
        ]
    });

    let page;
    try {
        page = await browser.newPage();

        // AUTHENTICATION FOR KONG GATEWAY
        await page.authenticate({ username: USER, password: PASS });

        // Intercept requests to strict block or log upgrades
        await page.setRequestInterception(true);
        page.on('request', request => {
            const url = request.url();
            if (url.startsWith('https://')) {
                console.log('BLOCKED HTTPS UPGRADE:', url);
                // Try to downgrade it back if it matches our target host
                if (url.includes('sslip.io')) {
                    const httpUrl = url.replace('https://', 'http://');
                    console.log('REDIRECTING TO HTTP:', httpUrl);
                    request.continue({ url: httpUrl });
                } else {
                    request.continue();
                }
            } else {
                request.continue();
            }
        });

        // Debug listeners
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err));
        page.on('requestfailed', request => console.log('REQ FAILED:', request.url(), request.failure().errorText));

        // Set standard User Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('Navigating to login...');
        await page.goto(SUPABASE_URL, { waitUntil: 'domcontentloaded' });
        console.log('Navigated. Actual URL in browser:', page.url());

        await page.screenshot({ path: 'debug_initial_load.png' });

        console.log('Waiting for inputs OR dashboard...');
        let foundFrame = null;
        let isDashboard = false;

        // Retry loop
        const startTime = Date.now();
        while (Date.now() - startTime < 60000) {
            // Check for Dashboard existence (SQL Editor link or sidebar)
            const dashboardEl = await page.$$(`xpath///span[contains(text(), 'SQL Editor')] | //a[contains(@href, '/sql')]`);
            if (dashboardEl.length > 0) {
                console.log('Dashboard detected! Skipping login.');
                isDashboard = true;
                break;
            }

            // Check for inputs
            try {
                const currentPages = page.frames();
                for (const frame of currentPages) {
                    try {
                        if (await frame.$('input')) {
                            foundFrame = frame;
                            console.log('Found input in frame: ' + frame.url());
                            break;
                        }
                    } catch (e) { }
                }
            } catch (e) { }

            if (foundFrame) break;
            await new Promise(r => setTimeout(r, 1000));
        }

        if (!foundFrame && !isDashboard) {
            console.log('Wait failed. Dumping HTML...');
            try { console.log((await page.content()).substring(0, 500)); } catch (e) { }
            // Proceed effectively blindly or throw? failing here is better
            // But maybe the page is just slow.
            // Let's try to find SQL editor anyway in the next step.
        }

        if (foundFrame && !isDashboard) {
            console.log('Found inputs, typing credentials...');
            const inputs = await foundFrame.$$('input');
            if (inputs.length >= 2) {
                await inputs[0].type(USER);
                await inputs[1].type(PASS);

                // Look for Acceder button
                const btnXpath = "//button[contains(text(), 'Acceder')] | //a[contains(text(), 'Acceder')] | //span[contains(text(), 'Acceder')]";
                let clicked = false;
                try {
                    const [btn] = await foundFrame.$$(`xpath/${btnXpath}`);
                    if (btn) {
                        await btn.click();
                        console.log('Clicked Acceder.');
                        clicked = true;
                    }
                } catch (e) { }

                if (!clicked) {
                    const submit = await foundFrame.$('button[type="submit"]');
                    if (submit) await submit.click();
                    else await foundFrame.keyboard.press('Enter');
                }
            }

            console.log('Waiting for navigation after login...');
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => console.log('Navigation timeout or already loaded.'));
        }

        // Navigate to SQL Editor
        console.log('Looking for SQL Editor...');
        const sqlSelectors = [
            "//span[contains(text(), 'SQL Editor')]",
            "//div[contains(text(), 'SQL Editor')]",
            "//a[contains(@href, '/sql')]",
            "//a[contains(text(), 'SQL')]",
            // Fallback: try navigating directly URL logic if button fails?
            // "button" triggers usually
        ];

        let foundSql = false;
        for (const sel of sqlSelectors) {
            try {
                const [el] = await page.$$(`xpath/${sel}`);
                if (el) {
                    await el.click();
                    foundSql = true;
                    console.log('Clicked SQL Editor item.');
                    break;
                }
            } catch (e) { }
        }

        if (!foundSql) {
            console.log('Could not find SQL Editor button. Trying direct URL navigation...');
            // Try assuming standard path /project/default/sql
            const currentUrl = page.url();
            if (currentUrl.includes('/project/default')) {
                const sqlUrl = currentUrl.replace(/\/project\/default.*$/, '/project/default/sql');
                await page.goto(sqlUrl, { waitUntil: 'domcontentloaded' });
                foundSql = true;
            }
        }

        await new Promise(r => setTimeout(r, 2000));
        const newQueryXpath = "//button[contains(text(), 'New query')] | //span[contains(text(), 'New query')]";
        try {
            const [btn] = await page.$x(newQueryXpath);
            if (btn) await btn.click();
        } catch (e) { console.log('New query button not found or error', e); }

        // Type SQL
        console.log('Typing SQL...');
        try { await page.click('.monaco-editor'); } catch (e) { }
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(SQL_CONTENT, { delay: 1 });

        // Run
        console.log('Executing...');
        await page.keyboard.down('Control');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Control');

        await new Promise(r => setTimeout(r, 3000));
        console.log('Done.');
        await new Promise(r => setTimeout(r, 50000));

    } catch (e) {
        console.error('Automation Error:', e);
        if (page) await page.screenshot({ path: 'debug_error_ua.png' });
    } finally {
        console.log('Browser left open.');
    }
}

run();
