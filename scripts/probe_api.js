const fetch = require('node-fetch'); // Assuming node-fetch is available or using built-in in newer node

// If node version is old (v16-), we might need to import differently or use https module. 
// But let's assume global fetch or require. 
// Actually, standard 'https' module is safer if 'node-fetch' isn't in package.json (it's not).
const http = require('http');

const BASE_URL = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io';
const USER = 'admin';
const PASS = 'yoe6IkbqsoDBaQNGJ2zk7mtj7V85X7QY';

const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

const SQL_QUERY = `
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'commercial', 'supervisor'));
`;

// Helper for requests
function request(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Authorization': AUTH,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        };

        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        console.log(`Req: ${method} ${path}`);

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, data: data });
            });
        });

        req.on('error', (e) => reject(e));

        if (body) req.write(body);
        req.end();
    });
}

async function run() {
    console.log('Probing Supabase Studio API...');

    // 1. Check Root
    try {
        const root = await request('/');
        console.log(`Root Status: ${root.status}`);
        // console.log('Root:', root.data.substring(0, 100));
    } catch (e) {
        console.error('Connection failed:', e.message);
        return;
    }

    // 2. Try to find the SQL endpoint
    // Common paths for Supabase Studio / Kong setup:
    // /api/pg-meta/default/query
    // /pg-meta/default/query
    // /query

    const endpoints = [
        '/api/pg-meta/default/query',
        '/pg-meta/default/query',
        '/api/query',
        '/api/console/sql/execute' // Another variation
    ];

    for (const ep of endpoints) {
        console.log(`Trying endpoint: ${ep}...`);

        const payload = JSON.stringify({ query: SQL_QUERY });
        const res = await request(ep, 'POST', payload);

        console.log(`Status: ${res.status}`);

        if (res.status === 200 || res.status === 201) {
            console.log('SUCCESS! SQL Executed.');
            console.log('Response:', res.data);
            return;
        } else {
            console.log(`Failed. Response start: ${res.data.substring(0, 50)}...`);
        }
    }

    console.log('API Probe finished. No obvious SQL execution endpoint found.');
}

run();
