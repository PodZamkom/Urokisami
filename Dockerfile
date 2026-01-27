
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

# Delete lockfile and install fresh to avoid network resolution issues
RUN rm -f package-lock.json \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-retry-mintimeout 10000 \
    && npm config set strict-ssl false \
    && npm install --no-audit --no-fund

COPY . .

# Pass API key as build argument
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

# Build the app defined in package.json
RUN npm run build

# Expose port 3000 (Vite's default)
EXPOSE 3000

# Use proxy-server to serve static files and handle WebSocket
CMD ["node", "proxy-server.mjs"]
