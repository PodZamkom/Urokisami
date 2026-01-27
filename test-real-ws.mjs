import WebSocket from 'ws';
import fs from 'fs';

const API_KEY = 'AIzaSyBE7NyKig1AEcGitKa99u--w4ffgnkxhhg';
const MODEL = 'gemini-2.0-flash-exp';
const HOST = 'urokisami.ru';
// Ensure we use the exact path the proxy expects for rewriting or direct pass-through
const PATH = `/google-api/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
const URL = `wss://${HOST}${PATH}`;

console.log('Connecting to:', URL);

const ws = new WebSocket(URL, ['google-genai', 'custom-proto'], {
    headers: {
        'Origin': 'https://urokisami.ru',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    }
});

ws.on('open', () => {
    console.log('✅ Connected to Google API via Proxy!');
    console.log('Negotiated Protocol:', ws.protocol);

    // 1. Send Setup Message
    const setupMessage = {
        setup: {
            model: `models/${MODEL}`,
            generationConfig: {
                responseModalities: ["AUDIO"]
            }
        }
    };
    console.log('Sending setup payload:', JSON.stringify(setupMessage, null, 2));
    ws.send(JSON.stringify(setupMessage));

    // 2. Simulate sending audio (Real Time Input)
    // We will send a dummy PCM buffer just to trigger "something" or verify the socket holds.
    // In a real scenario, we'd read a WAV file, base64 encode it, and send it as RealtimeInput.
    // For this test, we just want to see if the connection stays open and maybe get a "turn_complete" or error, 
    // confirming traffic flows two ways.

    console.log('Sending dummy audio event (ClientContent)...');

    // Construct a ClientContent message mimicking audio input
    // Using a very short silent buffer or simple data to prove connectivity
    const audioContent = {
        client_content: {
            turns: [
                {
                    parts: [
                        { text: "Hello, can you hear me?" }
                        // Note: Text input is easier to test than raw audio without a file, 
                        // and Gemini Live supports text-in -> audio-out.
                    ]
                }
            ],
            turn_complete: true
        }
    };

    ws.send(JSON.stringify(audioContent));
});

ws.on('message', (data) => {
    try {
        const str = data.toString();
        const json = JSON.parse(str);

        console.log('✅ Received message type:', Object.keys(json)[0]);
        // console.log('Payload:', str.substring(0, 200) + '...');

        if (json.serverContent && json.serverContent.modelTurn) {
            console.log('🔊 received model turn (Audio/Text content)');
            const parts = json.serverContent.modelTurn.parts;
            parts.forEach(p => {
                if (p.inlineData) {
                    console.log(`   -> Audio Data received (${p.inlineData.data.length} bytes)`);
                }
                if (p.text) {
                    console.log(`   -> Text: ${p.text}`);
                }
            });
            // If we got audio, success!
            if (parts.some(p => p.inlineData)) {
                console.log('🎉 TEST PASSED: Received Audio Response!');
                process.exit(0);
            }
        }

    } catch (e) {
        console.log('Received raw/binary message length:', data.length);
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket Error:', error.message);
    if (error.message.includes('502')) {
        console.error('   -> 502 Bad Gateway: Nginx cannot reach Node or Node cannot reach Google.');
    }
});

ws.on('close', (code, reason) => {
    console.log(`Connection closed: ${code} ${reason}`);
    if (code !== 1000 && code !== 1005) {
        console.error('❌ Connection closed abnormally');
        process.exit(1);
    }
});
