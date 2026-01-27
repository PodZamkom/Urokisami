import WebSocket from 'ws';
import { HttpsProxyAgent } from 'https-proxy-agent';

const PROXY_URL = 'http://user340699:671nvc@150.241.224.122:4210';
const TARGET_URL = 'wss://echo.websocket.org/';

console.log('Testing WebSocket through corporate proxy...');
console.log('Proxy:', PROXY_URL);
console.log('Target:', TARGET_URL);

const agent = new HttpsProxyAgent(PROXY_URL);

const ws = new WebSocket(TARGET_URL, {
    agent,
});

ws.on('open', () => {
    console.log('✅ WebSocket connection established!');
    console.log('Sending test message...');
    ws.send('Hello from proxy test!');
});

ws.on('message', (data) => {
    console.log('✅ Received echo:', data.toString());
    ws.close();
    process.exit(0);
});

ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err.message);
    console.error('Full error:', err);
    process.exit(1);
});

ws.on('close', () => {
    console.log('Connection closed');
});

setTimeout(() => {
    console.error('❌ Timeout - connection took too long');
    process.exit(1);
}, 10000);
