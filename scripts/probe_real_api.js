const http = require('http');

const BASE_URL = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io';
const USER = 'cgdTQxH0zR0O4Y9A'; // Updated username
const PASS = 'yoe6IkbqsoDBaQNGJ2zk7mtj7V85X7QY';

const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

const SQL_QUERY = `
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'commercial', 'supervisor'));
`;

function request(path, method, body) {
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
                'User-Agent': 'NodeJS/Script'
            }
        };

        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        console.log(`Sending ${method} request to ${path}...`);

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`Response Status: ${res.statusCode}`);
                resolve({ status: res.statusCode, data: data });
            });
        });

        req.on('error', (e) => {
            console.error(`Request Error: ${e.message}`);
            reject(e);
        });

        if (body) req.write(body);
        req.end();
    });
}

async function run() {
    console.log('--- Starting API Probe ---');

    // Payload for pg-meta query
    const payload = JSON.stringify({ query: SQL_QUERY });

    // Endpoint 1: Standard Supabase Studio API
    // The path is usually proxied. 
    // In self-hosted, usually: /api/pg-meta/default/query

    const endpoints = [
        '/api/pg-meta/default/query',
        '/pg-meta/default/query', // Sometimes direct
        '/api/query'
    ];

    for (const ep of endpoints) {
        try {
            const res = await request(ep, 'POST', payload);

            if (res.status >= 200 && res.status < 300) {
                console.log('SUCCESS! SQL Executed successfully.');
                console.log('Response:', res.data);
                return;
            } else if (res.status === 401) {
                console.log('Example: 401 Unauthorized. Verify credentials.');
                // If 401, maybe try without 'admin' user?
            } else {
                console.log(`Failed with status ${res.status}. Body: ${res.data.substring(0, 200)}`);
            }
        } catch (e) {
            console.error('Network/Logic error during request:', e);
        }
    }

    console.log('--- Finished probing ---');
}

run();
