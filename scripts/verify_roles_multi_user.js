const puppeteer = require('puppeteer');
const http = require('http');

// API Config for updating roles
const API_BASE_URL = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io';
const API_PATH = '/api/platform/pg-meta/default/query';
const API_USER = 'cgdTQxH0zR0O4Y9A';
const API_PASS = 'yoe6IkbqsoDBaQNGJ2zk7mtj7V85X7QY';
const API_AUTH = 'Basic ' + Buffer.from(`${API_USER}:${API_PASS}`).toString('base64');

const APP_URL = 'http://localhost:3000';
const DEFAULT_PASS = 'adr0711';

// We define our 3 test cases
const USERS = [
    { email: 'jim.tailorq@gmail.com', role: 'supervisor', expected: { analyzer: true, upload: false, admin: false } },
    { email: 'juan.perez@gmail.com', role: 'commercial', expected: { analyzer: false, upload: true, admin: false } },
    { email: 'andres.diaz@gmail.com', role: 'admin', expected: { analyzer: true, upload: true, admin: true } }
];

async function enforceRole(email, role) {
    console.log(`  [SETUP] Enforcing role '${role}' for ${email}...`);
    const sql = `UPDATE profiles SET role = '${role}' WHERE email = '${email}';`;

    return new Promise((resolve) => {
        const req = http.request({
            hostname: new URL(API_BASE_URL).hostname,
            path: API_PATH,
            method: 'POST',
            headers: { 'Authorization': API_AUTH, 'Content-Type': 'application/json' }
        }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(data));
        });
        req.on('error', () => resolve());
        req.write(JSON.stringify({ query: sql }));
        req.end();
    });
}

async function run() {
    console.log('--- MULTI-USER ROLE VERIFICATION (WITH ENFORCEMENT) ---');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        for (const user of USERS) {
            console.log(`\nTesting User: ${user.email} (${user.role.toUpperCase()})`);

            // Enforce role first!
            await enforceRole(user.email, user.role);

            // Use Incognito Context for isolation
            const context = await browser.createBrowserContext();
            const page = await context.newPage();
            await page.setViewport({ width: 1280, height: 800 });

            try {
                // 1. Login
                console.log('  Logging in...');
                await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle0' });

                await page.waitForSelector('input[type="email"]');
                await page.type('input[type="email"]', user.email);
                await page.type('input[type="password"]', DEFAULT_PASS);

                const loginBtn = await page.waitForSelector('button[type="submit"]');
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }),
                    loginBtn.click()
                ]);

                console.log('  Logged in.');
                await page.screenshot({ path: `scripts/verify_${user.role}_dashboard.png` });

                // WAIT for Role to load (text not to be "...")
                console.log('  Waiting for role to load...');
                try {
                    await page.waitForFunction(() => {
                        const el = Array.from(document.querySelectorAll('p')).find(p => p.textContent.includes('Rol:'));
                        return el && !el.textContent.includes('...');
                    }, { timeout: 10000 });
                } catch (e) { console.log('  [WARN] Role loading timed out?'); }

                // Debug: Extract actual role displayed
                const roleText = await page.evaluate(() => {
                    const el = Array.from(document.querySelectorAll('p')).find(p => p.textContent.includes('Rol:'));
                    return el ? el.textContent : 'Rol: NOT FOUND';
                });
                console.log(`  [DEBUG] UI Displayed Role: "${roleText}"`);

                // 2. Check UI Elements
                const content = await page.content();

                const hasAnalyzer = content.includes('Analizador');
                const hasUpload = content.includes('Cargar Datos');
                // Admin check: Look for "Usuarios" or specifically the link to /admin/users
                const hasAdmin = content.includes('href="/admin/users"');

                console.log(`  [${user.role}] Analizador: ${hasAnalyzer} (Expected: ${user.expected.analyzer})`);
                console.log(`  [${user.role}] Cargar Datos: ${hasUpload} (Expected: ${user.expected.upload})`);
                console.log(`  [${user.role}] Admin Panel: ${hasAdmin} (Expected: ${user.expected.admin})`);

                // 3. Validation Logic
                if (hasAnalyzer !== user.expected.analyzer) console.error(`  FAIL: Analyzer visibility mismatch for ${user.role}`);
                if (hasUpload !== user.expected.upload) console.error(`  FAIL: Upload visibility mismatch for ${user.role}`);
                if (hasAdmin !== user.expected.admin) console.error(`  FAIL: Admin visibility mismatch for ${user.role}`);

            } catch (e) {
                console.error(`  ERROR testing ${user.email}:`, e.message);
            } finally {
                await page.close();
            }
        }

    } catch (e) {
        console.error('CRITICAL ERROR:', e);
    } finally {
        await browser.close();
    }
}

run();
