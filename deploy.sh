#!/bin/bash

# Urokisami Deployment Script
# Server: 46.17.103.196

set -e

SERVER="root@46.17.103.196"
PROJECT_NAME="urokisami"
REMOTE_DIR="/root/${PROJECT_NAME}"
DOMAIN="urokisami.ru"

echo "🚀 Deploying ${PROJECT_NAME} to ${SERVER}..."

# Create remote directory
ssh $SERVER "mkdir -p ${REMOTE_DIR}"

# Copy files
echo "📦 Copying files..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  ./ ${SERVER}:${REMOTE_DIR}/

# Build and start container
echo "🐳 Building and starting Docker container..."
ssh $SERVER "cd ${REMOTE_DIR} && \
  export GEMINI_API_KEY='AIzaSyBE7NyKig1AEcGitKa99u--w4ffgnkxhhg' && \
  docker-compose down && \
  docker-compose build --no-cache && \
  docker-compose up -d"

# Configure Nginx
echo "🌐 Configuring Nginx..."
ssh $SERVER "cat > /etc/nginx/sites-available/${PROJECT_NAME} << 'EOF'
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://localhost:3030;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
"

# Enable site and reload Nginx
ssh $SERVER "ln -sf /etc/nginx/sites-available/${PROJECT_NAME} /etc/nginx/sites-enabled/ && \
  nginx -t && systemctl reload nginx"

echo "✅ Deployment complete!"
echo "🌍 Application available at: http://${DOMAIN}"
