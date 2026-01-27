// Глобальная замена WebSocket для проксирования всех WS запросов
// Этот файл должен загружаться до инициализации GoogleGenAI

(function () {
    const OriginalWebSocket = window.WebSocket;
    const PROXY_BASE = window.location.origin + '/google-api';

    console.log('[WebSocket Proxy] Installing WebSocket proxy interceptor');
    console.log('[WebSocket Proxy] Will redirect Google AI requests through:', PROXY_BASE);

    // Перехватываем конструктор WebSocket
    window.WebSocket = function (url, protocols) {
        let targetUrl = url;

        // Если URL содержит generativelanguage.googleapis.com, перенаправляем через прокси
        if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
            console.log('[WebSocket Proxy] Intercepted Google AI WebSocket:', url);

            // Заменяем wss://generativelanguage.googleapis.com на наш прокси
            // Переносим весь путь и query параметры, очищая от двойных слешей
            const urlObj = new URL(url);
            const pathAndQuery = (urlObj.pathname + urlObj.search).replace(/\/+/g, '/');

            // Формируем URL через прокси: wss://urokisami.ru/google-api/...
            targetUrl = PROXY_BASE.replace(/^http/, 'ws') + pathAndQuery;

            console.log('[WebSocket Proxy] Redirected to:', targetUrl);
        }

        // Создаем оригинальный WebSocket с перенаправленным URL
        const ws = new OriginalWebSocket(targetUrl, protocols);

        // Логируем события для отладки
        ws.addEventListener('open', () => {
            console.log('[WebSocket Proxy] Connection opened:', targetUrl);
        });

        ws.addEventListener('error', (err) => {
            console.error('[WebSocket Proxy] Connection error:', err);
        });

        ws.addEventListener('close', () => {
            console.log('[WebSocket Proxy] Connection closed:', targetUrl);
        });

        return ws;
    };

    // Копируем статические свойства
    window.WebSocket.prototype = OriginalWebSocket.prototype;
    window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
    window.WebSocket.OPEN = OriginalWebSocket.OPEN;
    window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
    window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;

    // Intercept Fetch requests for REST API
    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
        let url = input;
        
        if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
            console.log('[Fetch Proxy] Intercepted Google AI Request:', url);
            const urlObj = new URL(url);
            const pathAndQuery = (urlObj.pathname + urlObj.search).replace(/\/+/g, '/');
            url = PROXY_BASE + pathAndQuery;
            console.log('[Fetch Proxy] Redirected to:', url);
        } else if (input instanceof Request && input.url.includes('generativelanguage.googleapis.com')) {
             // Handle Request object
             console.log('[Fetch Proxy] Intercepted Google AI Request (Object):', input.url);
             const urlObj = new URL(input.url);
             const pathAndQuery = (urlObj.pathname + urlObj.search).replace(/\/+/g, '/');
             url = PROXY_BASE + pathAndQuery;
             // We need to clone init or create new Request if input is Request
             // Simplest way is to just pass string url if init is provided, or merge
             // But fetch(Request) might have body in Request. 
             // For Google AI SDK, it usually passes url string + init.
        }

        return originalFetch(url, init);
    };
    
    console.log('[WebSocket Proxy] WebSocket & Fetch proxy installed successfully');
})();
