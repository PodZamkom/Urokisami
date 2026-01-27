
import { GoogleGenAI } from '@google/genai';
import { WebSocket } from 'ws';

// Mock WebSocket to capture URL
class MockWebSocket extends WebSocket {
    constructor(url, protocols) {
        console.log('📢 SDK TRIED TO CONNECT TO:', url);
        // Throw error to stop execution
        throw new Error('SPY_SUCCESS');
    }
}

// Override global WebSocket if environment supports it, but in Node we might need to patch the global or the module?
// The SDK likely imports 'ws' or uses global.WebSocket.
global.WebSocket = MockWebSocket;

const KEY = process.env.GEMINI_API_KEY || 'AIzaSyBE7NyKig1AEcGitKa99u--w4ffgnkxhhg';
const ai = new GoogleGenAI({ apiKey: KEY });

async function spy() {
    console.log('Starting spy...');
    try {
        await ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            config: { responseModalities: ['AUDIO'] }
        });
    } catch (e) {
        if (e.message !== 'SPY_SUCCESS') {
            console.error('Spy failed with unexpected error:', e);
        }
    }
}

spy();
