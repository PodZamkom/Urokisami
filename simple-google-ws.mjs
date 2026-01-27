
import WebSocket from 'ws';
import { HttpsProxyAgent } from 'https-proxy-agent';

const PROXY_URL = 'http://user340699:671nvc@102.129.190.91:7967';
const agent = new HttpsProxyAgent(PROXY_URL);
const URL = 'wss://generativelanguage.googleapis.com/v1alpha/models/gemini-2.0-flash-exp:bidiGenerateContent?key=AIzaSyBE7NyKig1AEcGitKa99u--w4ffgnkxhhg';

console.log('Connecting to Google via Proxy:', PROXY_URL);

const ws = new WebSocket(URL, {
    agent,
    header: {
        'User-Agent': 'Node.js/Test'
    }
});

ws.on('open', () => {
    console.log('✅ Connected to Google!');
    ws.close();
});

ws.on('error', (e) => {
    console.error('❌ Connection Failed:', e.message);
});

ws.on('close', (code, reason) => {
    console.log(`Closed: ${code} ${reason}`);
});
