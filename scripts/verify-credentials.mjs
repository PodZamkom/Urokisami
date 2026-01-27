
import { SocksProxyAgent } from 'socks-proxy-agent';
import https from 'https';

const PROXY_URL = process.env.PROXY_URL;
const API_KEY = process.env.GEMINI_API_KEY;

console.log('--- Credential Verification ---');
console.log(`Proxy URL present: ${!!PROXY_URL}`);
console.log(`API Key present: ${!!API_KEY}`);

if (!PROXY_URL || !API_KEY) {
    console.error('Missing credentials in .env file');
    process.exit(1);
}

const agent = new SocksProxyAgent(PROXY_URL);

// 1. Test Proxy Connection (via ipify)
const verifyProxy = () => {
    return new Promise((resolve, reject) => {
        console.log('\nTesting Proxy Connection...');
        const req = https.get('https://api.ipify.org?format=json', { agent }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(`Proxy IP: ${json.ip}`);
                    resolve(true);
                } catch (e) {
                    console.error('Failed to parse IP response:', data);
                    reject(e);
                }
            });
        });

        req.on('error', (err) => {
            console.error('Proxy Connection Failed:', err.message);
            reject(err);
        });
    });
};

// 2. Test Gemini API (List Models)
const verifyGemini = () => {
    return new Promise((resolve, reject) => {
        console.log('\nTesting Gemini API via Proxy...');
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models?key=${API_KEY}`,
            method: 'GET',
            agent: agent
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`Success! Found ${json.models?.length || 0} models.`);
                        // console.log('Available models:', json.models.map(m => m.name).join(', '));
                        resolve(true);
                    } catch (e) {
                        console.error('Failed to parse Gemini response');
                        reject(e);
                    }
                } else {
                    console.error(`Gemini API Failed with status: ${res.statusCode}`);
                    console.error('Response:', data);
                    reject(new Error(`Status ${res.statusCode}`));
                }
            });
        });

        req.on('error', (err) => {
            console.error('Gemini API Request Failed:', err.message);
            reject(err);
        });

        req.end();
    });
};

// Run Sequence
(async () => {
    try {
        await verifyProxy();
        await verifyGemini();
        console.log('\n✅ Verification Complete: Credentials and Proxy are working!');
    } catch (err) {
        console.error('\n❌ Verification Failed.');
        process.exit(1);
    }
})();
