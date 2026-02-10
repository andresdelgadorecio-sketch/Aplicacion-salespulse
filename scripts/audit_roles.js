const http = require('http');

const BASE_URL = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io';
const PATH = '/api/platform/pg-meta/default/query';
const USER = 'cgdTQxH0zR0O4Y9A';
const PASS = 'yoe6IkbqsoDBaQNGJ2zk7mtj7V85X7QY';

const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

// Check what roles actually exist
const SQL_QUERY = `SELECT role, count(*) as count FROM profiles GROUP BY role`;

function request(body) {
    return new Promise((resolve, reject) => {
        const url = new URL(PATH, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Authorization': AUTH,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                console.log('Response:', data);
                resolve({ status: res.statusCode, data: data });
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function run() {
    console.log('--- AUDITING ROLES ---');
    const payload = JSON.stringify({ query: SQL_QUERY });
    await request(payload);
}

run();
