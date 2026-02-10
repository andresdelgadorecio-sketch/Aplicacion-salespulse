const net = require('net');

const host = '148.230.91.43';
const port = 5432;

console.log(`Testing connection to ${host}:${port}...`);

const socket = new net.Socket();

socket.setTimeout(3000); // 3s timeout

socket.on('connect', () => {
    console.log('Success: Port 5432 is OPEN. I can connect to Postgres.');
    socket.destroy();
});

socket.on('timeout', () => {
    console.log('Error: Connection timed out. Firewall might be blocking port 5432.');
    socket.destroy();
});

socket.on('error', (err) => {
    console.log(`Error: Could not connect. ${err.message}`);
});

socket.connect(port, host);
