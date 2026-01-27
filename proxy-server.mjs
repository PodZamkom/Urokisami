import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { SocksProxyAgent } from 'socks-proxy-agent';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function fileLog(msg) {
    const ts = new Date().toISOString();
    try {
        fs.appendFileSync(path.join(__dirname, 'proxy_debug.log'), `[${ts}] ${msg}\n`);
    } catch (e) {
        console.error('Logging failed:', e);
    }
    console.log(msg);
}

const PROXY_URL = process.env.PROXY_URL;
const PORT = 3005;

if (!PROXY_URL) {
    console.error('Error: PROXY_URL not found in environment variables.');
    process.exit(1);
}

const agent = new SocksProxyAgent(PROXY_URL);

fileLog(`Starting proxy server on port ${PORT}...`);
fileLog(`Using Proxy: ${PROXY_URL}`);

// Helper to serve static files
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

function serveStatic(req, res) {
    fileLog(`[HTTP STATIC] ${req.url}`);
    let filePath = path.join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url);
    const extname = String(path.extname(filePath)).toLowerCase();

    // Safety check to prevent directory traversal
    if (!filePath.startsWith(path.join(__dirname, 'dist'))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                // If file not found, serve index.html for SPA routing (except for assets)
                if (req.url.startsWith('/assets') || req.url.startsWith('/utils')) {
                    fileLog(`[HTTP 404] ${req.url} (Not Found at ${filePath})`);
                    res.writeHead(404);
                    res.end('Not found');
                } else {
                    fs.readFile(path.join(__dirname, 'dist', 'index.html'), (err, indexContent) => {
                        if (err) {
                            res.writeHead(500);
                            res.end('Error loading index.html');
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(indexContent, 'utf-8');
                        }
                    });
                }
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            const contentType = mimeTypes[extname] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
            fileLog(`[HTTP 200] ${req.url} -> ${contentType}`);
        }
    });
}

const server = http.createServer((req, res) => {
    // Handle /google-api requests (REST Proxy)
    if (req.url.startsWith('/google-api')) {
        const targetPath = req.url.replace(/^\/google-api/, '');
        const targetUrl = `https://generativelanguage.googleapis.com${targetPath}`;

        fileLog(`[HTTP PROXY] ${req.method} ${req.url} -> ${targetUrl}`);

        const proxyReq = https.request(targetUrl, {
            method: req.method,
            headers: {
                ...req.headers,
                host: 'generativelanguage.googleapis.com'
            },
            agent,
            rejectUnauthorized: false
        }, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error('[HTTP PROXY ERROR]', err);
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end('Bad Gateway');
        });

        req.pipe(proxyReq);
        return;
    }

    // Serve Static Files
    serveStatic(req, res);
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
    const timestamp = new Date().toISOString();
    fileLog(`[${timestamp}] [WS UPGRADE ATTEMPT] URL: ${req.url}`);

    // Compute target path: remove /google-api if present, otherwise use as is
    let targetPath = req.url.startsWith('/google-api')
        ? req.url.replace(/^\/google-api/, '')
        : req.url;

    targetPath = targetPath.replace(/\/+/g, '/');

    // REWRITE: If it's a model-based path, rewrite to the working /ws/ path
    // Broadened to catch SDK variations that may not include specific method names
    if (targetPath.includes('models/')) {
        fileLog(`[${timestamp}] [REWRITE] Original Path: ${targetPath}`);
        const urlParams = targetPath.split('?')[1] || '';
        // Use the official Gemini Live endpoint path
        targetPath = `/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent${urlParams ? '?' + urlParams : ''}`;
        fileLog(`[${timestamp}] [REWRITE] New Path: ${targetPath}`);
    }

    const targetUrl = `wss://generativelanguage.googleapis.com${targetPath}`;
    fileLog(`[${timestamp}] [WS PROXYING] To: ${targetUrl}`);

    // Prepare clean headers for Google API
    const headers = {};

    // Set proper headers for Google API
    headers['host'] = 'generativelanguage.googleapis.com';
    headers['origin'] = 'https://generativelanguage.googleapis.com';

    // Keep protocol if present
    if (req.headers['sec-websocket-protocol']) {
        headers['sec-websocket-protocol'] = req.headers['sec-websocket-protocol'];
    }

    // Keep user-agent for good measure
    if (req.headers['user-agent']) {
        headers['user-agent'] = req.headers['user-agent'];
    }

    const ws = new WebSocket(targetUrl, {
        agent,
        headers,
        rejectUnauthorized: false
    });

    ws.on('open', () => {
        fileLog(`[${new Date().toISOString()}] [WS] Connected to Google API`);
        wss.handleUpgrade(req, socket, head, (clientWs) => {
            wss.emit('connection', clientWs, req);

            clientWs.on('message', (message, isBinary) => {
                const ts = new Date().toISOString();
                const size = message instanceof Buffer ? message.length : 0;
                if (isBinary) {
                    fileLog(`[${ts}] [Client -> Google] Binary: ${size} bytes`);
                } else {
                    const text = message.toString();
                    fileLog(`[${ts}] [Client -> Google] Text: ${text.substring(0, 500)}...`);
                }

                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(message, { binary: isBinary });
                } else {
                    console.error(`[${ts}] [Client -> Google] Warning: Upstream WS not open. State: ${ws.readyState}`);
                }
            });

            ws.on('message', (message, isBinary) => {
                const ts = new Date().toISOString();
                const size = message instanceof Buffer ? message.length : 0;
                if (isBinary) {
                    fileLog(`[${ts}] [Google -> Client] Binary: ${size} bytes`);
                } else {
                    const text = message.toString();
                    fileLog(`[${ts}] [Google -> Client] Text: ${text.substring(0, 500)}...`);
                }

                if (clientWs.readyState === WebSocket.OPEN) {
                    // Force data to be sent as text, because Google sends JSON as Binary frames, 
                    // and some browser SDKs might struggle with Blobs for JSON content.
                    const msgString = message.toString();
                    clientWs.send(msgString, { binary: false });
                } else {
                    console.error(`[${ts}] [Google -> Client] Warning: Client WS not open. State: ${clientWs.readyState}`);
                }
            });

            clientWs.on('close', (code, reason) => {
                fileLog(`[${new Date().toISOString()}] [WS] Client closed connection. Code: ${code}, Reason: ${reason}`);
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                }
            });

            ws.on('close', (code, reason) => {
                fileLog(`[${new Date().toISOString()}] [WS] Google closed connection. Code: ${code}, Reason: ${reason}`);
                if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CONNECTING) {
                    clientWs.close();
                }
            });

            clientWs.on('error', (err) => console.error(`[${new Date().toISOString()}] [WS Client Error]`, err));
            ws.on('error', (err) => console.error(`[${new Date().toISOString()}] [WS Google Error]`, err));
        });
    });

    ws.on('error', (err) => {
        console.error(`[${new Date().toISOString()}] [WS Error] Connection to Google failed:`, err.message);
        // If upgrade fails, we can't really send HTTP 502 easily on the socket, 
        // but we can try writing a response if it's not upgraded yet?
        // Usually just destroying the socket is the standard behavior or sending a valid HTTP error response.
        try {
            socket.write('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n');
        } catch (e) { /* ignore */ }
        socket.destroy();
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
