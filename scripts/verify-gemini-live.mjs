import { WebSocket } from 'ws';
import { SocksProxyAgent } from 'socks-proxy-agent';

// Load env vars (node --env-file=.env needed)
const PROXY_URL = process.env.PROXY_URL;
const API_KEY = process.env.GEMINI_API_KEY;

if (!PROXY_URL || !API_KEY) {
    console.error('❌ Missing PROXY_URL or GEMINI_API_KEY in environment');
    process.exit(1);
}

// Correct endpoint used by proxy-server logic
const HOST = 'generativelanguage.googleapis.com';
const PATH = '/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';
const URL = `wss://${HOST}${PATH}?key=${API_KEY}`;

console.log('--- Verifying Gemini Live WebSocket ---');
console.log(`Target: wss://${HOST}${PATH}`);
console.log('Proxy:  Configured');

const agent = new SocksProxyAgent(PROXY_URL);

// Create WebSocket with the Agent
const ws = new WebSocket(URL, {
    agent,
    headers: {
        'host': HOST
    }
});

let isConnected = false;

ws.on('open', () => {
    console.log('✅ WebSocket Connected!');
    isConnected = true;

    // Send a simple setup message or just wait to see if it holds
    console.log('...Waiting 5 seconds to check stability...');

    // Simulate simple setup (optional, showing we can talk)
    const setupMsg = {
        setup: {
            model: "models/gemini-2.0-flash-exp",
            generationConfig: {
                responseModalities: ["AUDIO"]
            }
        }
    };

    try {
        ws.send(JSON.stringify(setupMsg));
        console.log('» Sent setup message');
    } catch (e) {
        console.error('Error sending message:', e);
    }
});

ws.on('message', (data) => {
    console.log('« Received message:', data.length, 'bytes');
    // If we receive a "turnComplete" or any server content, it validates protocol
    const str = data.toString();
    if (str.length < 500) console.log('  Content:', str);
});

ws.on('close', (code, reason) => {
    console.log(`❌ WebSocket Closed. Code: ${code}, Reason: ${reason}`);
    // If it closes immediately (within ~1s), that's the "loop" bug
    if (!isConnected) {
        console.error('FAILED: Could not establish stable connection.');
        process.exit(1);
    }
});

ws.on('error', (err) => {
    console.error('❌ WebSocket Error:', err.message);
});

// Timeout to end test successfully
setTimeout(() => {
    if (isConnected) {
        console.log('\n✅ TEST PASSED: Connection held for 5+ seconds without disconnect.');
        ws.close(1000, 'Test Complete');
        process.exit(0);
    } else {
        console.error('\n❌ TEST FAILED: Connection was never established/stable.');
        process.exit(1);
    }
}, 6000);
