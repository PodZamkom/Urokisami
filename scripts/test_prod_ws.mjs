import WebSocket from 'ws';

const API_KEY = process.env.GEMINI_API_KEY;
// The test script mimics what the browser sends to the server. 
// If websocket-proxy.js works, the browser sends request to urokisami.ru/google-api/...
// But internally SDK generates generativelanguage.googleapis.com/...
// Since we removed baseUrl, SDK generates default URL.
// websocket-proxy.js intercepts it and changes it to /google-api/...
// So the browser ACTUALLY sends /google-api requests.
// BUT with what path?
// Default path for SDK.

// Try connecting to the proxy with the URL that the SDK *would* generate if we knew it.
// Since we don't know exact SDK logic, we rely on the fact that websocket-proxy.js preserves the path suffix.
// If I use the URL from log Step 533 (which was what SDK generated with baseUrl), maybe SDK generates same path without baseUrl?
// /v1beta/models/...
const WS_URL = `wss://urokisami.ru/google-api/v1beta/models/gemini-2.5-flash-native-audio-preview-12-2025?key=${API_KEY}`;

console.log(`Connecting to ${WS_URL}...`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
    console.log('✅ Connection OPENED!');
    ws.send(JSON.stringify({ test: 'data' }));
    // Don't close immediately to see if it stays open
    setTimeout(() => {
        console.log('Closing connection...');
        ws.close();
    }, 2000);
});

ws.on('message', (data) => {
    console.log('📩 Message received:', data.toString());
});

ws.on('error', (err) => {
    console.error('❌ Connection ERROR:', err.message);
});

ws.on('close', (code, reason) => {
    console.log(`Connection CLOSED. Code: ${code}, Reason: ${reason.toString()}`);
});
