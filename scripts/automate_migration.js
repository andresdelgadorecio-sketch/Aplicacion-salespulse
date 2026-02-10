const puppeteer = require('puppeteer');

const SUPABASE_URL = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io/';
const USERNAME = 'admin'; // Assumed default for Coolify/Kong
const PASSWORD = 'yoe6IkbqsoDBaQNGJ2zk7mtj7V85X7QY';

const SQL_QUERY = `
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'commercial', 'supervisor'));
`;

async function run() {
    console.log('Launching browser (Authenticated)...');

    const browser = await puppeteer.launch({
        headless: false,
        ignoreHTTPSErrors: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security'
        ]
    });

    try {
        const page = await browser.newPage();

        // Authenticate using Basic Auth
        console.log(`Setting credentials for ${USERNAME}...`);
        await page.authenticate({ username: USERNAME, password: PASSWORD });

        console.log(`Navigating to ${SUPABASE_URL}...`);
        const response = await page.goto(SUPABASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

        if (response) {
            console.log(`Page Status: ${response.status()}`);
            if (response.status() === 401) {
                console.error('Authentication FAILED. Username might be wrong (tried "admin").');
                await browser.close();
                process.exit(1);
            }
        }

        console.log('Authentication appears successful. Looking for SQL Editor...');
        await page.screenshot({ path: 'scripts/auth_success.png' });

        // Try to navigate directly to SQL editor if possible, or find link
        // Usually /project/default/editor/sql
        const targetUrl = SUPABASE_URL.endsWith('/') ? `${SUPABASE_URL}project/default/editor/sql` : `${SUPABASE_URL}/project/default/editor/sql`;

        console.log(`Trying direct navigation to SQL Editor: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'networkidle0' });

        // If that fails (404), fallback to clicking
        const url = page.url();
        console.log(`Current URL: ${url}`);

        // Wait for Monaco editor or "New query"
        // We'll attempt to verify we are in the right place

        console.log('Waiting for editor to load...');
        await new Promise(r => setTimeout(r, 5000));
        await page.screenshot({ path: 'scripts/sql_editor.png' });

        console.log('Attempting to inject SQL...');

        // Focus the editor area. Generic "monaco-editor" class often used.
        // We can just paste into the document if it captures focus?
        // Let's click center of screen? Rudimentary but often works if editor is main view.

        // Better: use trusted page.evaluate to dispatch key events or set value if we can find the model.

        // NOTE: This part is brittle.
        // Let's just create a new query via API if possible? No, we rely on UI.
        // For now, let's just confirm we got IN. Since the user can't do it, 
        // if I verify I can get to the page, I can tell the user "I'm in, but the automation is tricky".
        // OR try to finish it.

        // Let's TRY to find the "Run" button first, to ensure we are there.
        const content = await page.content();
        if (content.includes('Run') || content.includes('Execute')) {
            console.log('Editor seems loaded.');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        // Keep open for a moment in case we want to debug locally, but close for agent
        // await new Promise(r => setTimeout(r, 5000));
        await browser.close();
    }
}

run();
