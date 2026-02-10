
const puppeteer = require('puppeteer');
const path = require('path');

const SUPABASE_URL = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io/project/default';
const USER = 'cgdTQxH0zR0O4Y9A';
const PASS = 'yoe6IkbqsoDBaQNGJ2zk7mtj7V85X7QY';

const targetEmail = process.argv[2];

if (!targetEmail) {
    console.error('Usage: node scripts/check_user.js <email>');
    process.exit(1);
}

const CHECK_SQL = `
SELECT * FROM public.profiles WHERE email = '${targetEmail}';
`;

async function run() {
    console.log(`Checking profile for ${targetEmail}...`);

    // Launch browser (same config as others)
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--start-maximized',
            '--ignore-certificate-errors',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-features=IsolateOrigins,site-per-process,HttpsUpgrades,StrictTransportSecurity',
            '--disable-hsts'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', request => {
            const url = request.url();
            if (url.startsWith('https://') && url.includes('sslip.io')) {
                request.continue({ url: url.replace('https://', 'http://') });
            } else {
                request.continue();
            }
        });

        await page.authenticate({ username: USER, password: PASS });
        await page.goto(`${SUPABASE_URL}/sql`, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for editor
        await new Promise(r => setTimeout(r, 5000));

        console.log('Typing SQL...');
        try { await page.waitForSelector('.monaco-editor'); await page.click('.monaco-editor'); } catch (e) { }

        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');

        await page.keyboard.type(CHECK_SQL, { delay: 10 });

        console.log('Executing...');
        await page.keyboard.down('Control');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Control');

        console.log('Waiting for results...');
        await new Promise(r => setTimeout(r, 5000));

        console.log('Taking screenshot of results...');
        await page.screenshot({ path: 'check_result.png' });

        console.log('Check complete. See check_result.png');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

run();
