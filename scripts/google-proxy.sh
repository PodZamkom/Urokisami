#!/bin/bash
# Прокси для Google AI API через корпоративный прокси
# Запускается как systemd сервис

PROXY_HOST="user340699:671nvc@150.241.224.122:4210"
TARGET_HOST="generativelanguage.googleapis.com:443"
LOCAL_PORT=8888

echo "Starting Google AI Proxy on port $LOCAL_PORT..."
echo "Routing $TARGET_HOST through $PROXY_HOST"

# Используем netcat для проксирования
while true; do
    nc -l -p $LOCAL_PORT -c "nc -X connect -x $PROXY_HOST $TARGET_HOST"
    sleep 1
done
