

// fetch is native in Node 22


const PROXY_URL = 'http://user340699:671nvc@150.241.224.122:4210';
const API_KEY = process.env.GEMINI_API_KEY; // We'll need to run this with the env var or replace it here

const agent = new HttpsProxyAgent(PROXY_URL);

async function verify() {
    console.log('Verifying connection via proxy:', PROXY_URL);

    if (!API_KEY) {
        console.error("Please set GEMINI_API_KEY environment variable.");
        // process.exit(1); 
        // For this script to work easily in the agent flow, let's hardcode or read from .env if possible,
        // but the agent environment might not have it.
        // I'll try to rely on the user having it or I might need to ask/find it.
        // Wait, the vite config uses `env.GEMINI_API_KEY`. I don't know the value.
        // I should check if I can find the .env file.
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    try {
        const response = await fetch(url, { agent });
        const data = await response.json();

        if (response.ok) {
            console.log('✅ Success! API Key is valid and Proxy is working.');
            console.log('Available models count:', data.models ? data.models.length : 0);
        } else {
            console.error('❌ Request failed:', response.status, response.statusText);
            console.error('Error details:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('❌ Network/Proxy Error:', error.message);
    }
}

// verify();
// We will run this and might need to inject the key if it's in a .env file.
