
import WebSocket from 'ws';

const ws = new WebSocket('wss://urokisami.ru/test-ws');

ws.on('open', () => {
    console.log('Connected to wss://urokisami.ru');
    ws.send('Hello Remote Server');
});

ws.on('message', (data) => {
    console.log('Received from remote:', data.toString());
    ws.close();
});

ws.on('error', (error) => {
    console.error('Remote WebSocket Error:', error);
});
