const http = require('http');

const BASE_URL = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io';
const PATH = '/api/platform/pg-meta/default/query';
const USER = 'cgdTQxH0zR0O4Y9A';
const PASS = 'yoe6IkbqsoDBaQNGJ2zk7mtj7V85X7QY';
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

const SQL_QUERY = `SELECT email, role FROM profiles WHERE email = 'jim.tailorq@gmail.com'`;

async function run() {
    console.log('--- CHECKING JIM ROLE ---');
    const response = await new Promise((resolve, reject) => {
        const req = http.request({
            hostname: new URL(BASE_URL).hostname,
            port: 80,
            path: PATH + '?key=profiles-role-check',
            method: 'POST',
            headers: {
                'Authorization': AUTH,
                'Content-Type': 'application/json'
            }
        }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(JSON.stringify({ query: SQL_QUERY }));
        req.end();
    });
    console.log('Response:', response);
}

run();
