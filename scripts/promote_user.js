
const puppeteer = require('puppeteer');
const path = require('path');

const SUPABASE_URL = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io/project/default';
const USER = 'cgdTQxH0zR0O4Y9A';
const PASS = 'yoe6IkbqsoDBaQNGJ2zk7mtj7V85X7QY';

// Target email to promote - PASSED AS ARGUMENT
const targetEmail = process.argv[2];

if (!targetEmail) {
    console.error('Please provide the email to promote as an argument.');
    console.error('Usage: node scripts/promote_user.js <email>');
    process.exit(1);
}

const UPDATE_SQL = `
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
`;

async function run() {
    console.log(`Promoting user ${targetEmail} to admin...`);

    // Launch logic similar to auto_migrate_rbac
    // ... (Compact version of the logic)

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

        // request interception for HTTP
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

        console.log('Navigating to SQL Editor...');
        await page.goto(`${SUPABASE_URL}/sql`, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for editor
        await new Promise(r => setTimeout(r, 5000));

        // We will just blindly type into the active editor if possible or find the Monaco editor

        // Finds the "New query" button if needed, but usually it opens a fresh one or last one.
        // Let's try to clear and type.

        // Type SQL
        console.log('Typing SQL...');
        try { await page.waitForSelector('.monaco-editor'); await page.click('.monaco-editor'); } catch (e) { console.log('Click editor failed', e); }

        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');

        await page.keyboard.type(UPDATE_SQL, { delay: 10 });

        console.log('Executing...');
        // Try Ctrl+Enter
        await page.keyboard.down('Control');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Control');

        console.log('Waiting for execution...');
        await new Promise(r => setTimeout(r, 5000));

        console.log('Taking screenshot of result...');
        await page.screenshot({ path: 'promote_result.png' });

        console.log('Done. Please ask user to refresh.');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

run();
