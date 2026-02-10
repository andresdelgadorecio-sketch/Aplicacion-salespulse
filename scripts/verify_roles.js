const puppeteer = require('puppeteer');
const http = require('http');

// Configuration
const APP_URL = 'http://localhost:3000'; // Assuming local dev
const API_BASE_URL = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io';
const API_PATH = '/api/platform/pg-meta/default/query';
const API_USER = 'cgdTQxH0zR0O4Y9A';
const API_PASS = 'yoe6IkbqsoDBaQNGJ2zk7mtj7V85X7QY';
const API_AUTH = 'Basic ' + Buffer.from(`${API_USER}:${API_PASS}`).toString('base64');

// Test User
const TEST_EMAIL = 'jim.tailorq@gmail.com';
const TEST_PASS = 'ADR0711';

// Helpers
async function setRole(email, role) {
    console.log(`[API] Setting role for ${email} to '${role}'...`);
    const sql = `UPDATE profiles SET role = '${role}' WHERE email = '${email}';`;

    return new Promise((resolve, reject) => {
        const url = new URL(API_PATH, API_BASE_URL);
        const req = http.request({
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Authorization': API_AUTH,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(JSON.stringify({ query: sql }));
        req.end();
    });
}

async function run() {
    console.log('--- STARTING ROLE VERIFICATION ---');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        // 1. Initial Login
        console.log('Logging in...');
        await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle0' });

        await page.type('input[type="email"]', TEST_EMAIL);
        await page.type('input[type="password"]', TEST_PASS);

        // Find login button
        const loginBtn = await page.waitForSelector('button[type="submit"]');
        await loginBtn.click();

        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log('Logged in successfully.');

        // 2. Test SUPERVISOR (Default for this user currently)
        await setRole(TEST_EMAIL, 'supervisor');
        console.log('Switched to Supervisor. Refreshing...');
        await page.reload({ waitUntil: 'networkidle0' });
        await page.screenshot({ path: 'scripts/role_supervisor.png' });

        let content = await page.content();
        let hasAnalyzer = content.includes('Analizador'); // Link text
        let hasUpload = content.includes('Cargar Datos');

        console.log(`[SUPERVISOR] Has Analizador: ${hasAnalyzer} (Expected: TRUE)`);
        console.log(`[SUPERVISOR] Has Upload: ${hasUpload} (Expected: FALSE)`);

        // 3. Test COMMERCIAL
        await setRole(TEST_EMAIL, 'commercial');
        console.log('Switched to Commercial. Refreshing...');
        await page.reload({ waitUntil: 'networkidle0' });
        await page.screenshot({ path: 'scripts/role_commercial.png' });

        content = await page.content();
        hasAnalyzer = content.includes('Analizador');
        hasUpload = content.includes('Cargar Datos');

        console.log(`[COMMERCIAL] Has Analizador: ${hasAnalyzer} (Expected: FALSE)`);
        console.log(`[COMMERCIAL] Has Upload: ${hasUpload} (Expected: TRUE)`);

        // 4. Test ADMIN
        await setRole(TEST_EMAIL, 'admin');
        console.log('Switched to Admin. Refreshing...');
        await page.reload({ waitUntil: 'networkidle0' });
        await page.screenshot({ path: 'scripts/role_admin.png' });

        content = await page.content();
        const hasUsers = content.includes('Usuarios');

        console.log(`[ADMIN] Has Users/Admin Panel: ${hasUsers} (Expected: TRUE)`);

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await browser.close();
    }
}

run();
