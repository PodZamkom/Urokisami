
import WebSocket from 'ws';

const ws = new WebSocket('ws://127.0.0.1:3005/test-ws');

ws.on('open', () => {
    console.log('Connected to WebSocket');
    ws.send('Hello Server');
});

ws.on('message', (data) => {
    console.log('Received:', data.toString());
    ws.close();
});

ws.on('error', (error) => {
    console.error('WebSocket Error:', error);
});
