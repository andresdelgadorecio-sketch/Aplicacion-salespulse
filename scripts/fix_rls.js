
const puppeteer = require('puppeteer');

const SUPABASE_URL = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io/project/default';
const USER = 'cgdTQxH0zR0O4Y9A';
const PASS = 'yoe6IkbqsoDBaQNGJ2zk7mtj7V85X7QY';

const SQL_COMMANDS = `
-- FIX RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING ( true );
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ( auth.uid() = id );
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ( auth.uid() = id );

CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING ( 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' 
);

CREATE POLICY "Admins can insert any profile" ON public.profiles FOR INSERT WITH CHECK ( 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' 
);
`;

async function run() {
    console.log('Fixing RLS Policies...');

    // Launch browser (robust config)
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

        await new Promise(r => setTimeout(r, 5000));

        console.log('Typing SQL...');
        try { await page.waitForSelector('.monaco-editor'); await page.click('.monaco-editor'); } catch (e) { }

        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');

        await page.keyboard.type(SQL_COMMANDS, { delay: 5 });

        console.log('Executing...');
        await page.keyboard.down('Control');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Control');

        console.log('Waiting for completion...');
        await new Promise(r => setTimeout(r, 5000));

        console.log('Taking screenshot...');
        await page.screenshot({ path: 'rls_fix_result.png' });

        console.log('Done.');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

run();
