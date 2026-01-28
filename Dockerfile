
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

# Skip remote build to avoid timeouts on unstable server network
COPY . .

# Minimal install for production only
RUN npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-retry-mintimeout 10000 \
    && npm config set strict-ssl false \
    && npm install --omit=dev --no-audit --no-fund

# Use proxy-server to serve static files and handle WebSocket
EXPOSE 3000
CMD ["node", "proxy-server.mjs"]
