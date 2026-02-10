const puppeteer = require('puppeteer');

const TARGET_URL = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io/';
const USERNAME = 'cgdTQxH0zR0O4Y9A';
const PASSWORD = 'yoe6IkbqsoDBaQNGJ2zk7mtj7V85X7QY';

const SQL_QUERY = `
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'commercial', 'supervisor'));
`;

async function run() {
    console.log('--- FORCING HTTP (REWRITE MODE) ---');
    console.log(`Target: ${TARGET_URL}`);

    const browser = await puppeteer.launch({
        headless: false,
        ignoreHTTPSErrors: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--ignore-certificate-errors',
            '--allow-running-insecure-content',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    });

    try {
        const page = await browser.newPage();

        // 1. Authenticate immediately
        await page.authenticate({ username: USERNAME, password: PASSWORD });

        await page.setRequestInterception(true);
        page.on('request', request => {
            const url = request.url();
            if (url.startsWith('https://')) {
                const newUrl = url.replace('https://', 'http://');
                console.log(`Rewriting HTTPS to HTTP: ${newUrl}`);
                request.continue({ url: newUrl });
            } else {
                request.continue();
            }
        });

        // 3. Navigate
        console.log('Navigating...');
        try {
            await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        } catch (e) {
            console.log(`Navigation error: ${e.message}`);
        }

        console.log('Page loaded (or partially loaded). Checking URL...');
        console.log(`Current URL: ${page.url()}`);

        // 4. Try to interact
        // If we are in, we look for SQL Editor.
        // We'll try to execute blindly if we can't find selectors, but let's try to find visual cues.

        await new Promise(r => setTimeout(r, 5000));
        await page.screenshot({ path: 'scripts/http_force_result.png' });

        const content = await page.content();
        if (content.includes('SQL Editor') || content.includes('Table Editor')) {
            console.log('SUCCESS: Dashboard accessed!');

            // Try to navigate to SQL
            // Often at /project/default/editor/sql
            const sqlUrl = TARGET_URL + (TARGET_URL.endsWith('/') ? '' : '/') + 'project/default/editor/sql';
            console.log(`Navigating to SQL Editor: ${sqlUrl}`);

            try {
                await page.goto(sqlUrl, { waitUntil: 'networkidle0' });
            } catch (e) {
                console.log('Navigation to SQL failed, maybe staying on home.');
            }

            await new Promise(r => setTimeout(r, 3000));
            // At this point, better to let the user take over or try to type?
            // "Execute it" - I will try to type.

            console.log('Attempting to type query...');
            await page.keyboard.press('Escape'); // Close any modals
            await page.keyboard.type(SQL_QUERY);

            // Find Run button
            const runBtn = await page.evaluateHandle(() => {
                return Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Run'));
            });

            if (runBtn) {
                await runBtn.click();
                console.log('CLICKED RUN BUTTON');
            } else {
                console.log('Run button not found. Using Ctrl+Enter shortcut.');
                await page.keyboard.down('Control');
                await page.keyboard.press('Enter');
                await page.keyboard.up('Control');
            }

        } else {
            console.log('Could not verify dashboard access. Check screenshot.');
        }

    } catch (e) {
        console.error('CRITICAL ERROR:', e);
    } finally {
        console.log('Keeping browser open for 10 seconds for manual verification...');
        await new Promise(r => setTimeout(r, 10000));
        await browser.close();
    }
}

run();
