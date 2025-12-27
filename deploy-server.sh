#!/bin/bash

# Tesla Player Backend - Server Deployment Script
# Run this on your server: bash deploy-server.sh

set -e

echo "=== Tesla Player Backend Deployment ==="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing via nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
fi

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "ERROR: FFmpeg is not installed!"
    echo "Please install FFmpeg first:"
    echo "  Ubuntu/Debian: sudo apt install ffmpeg"
    echo "  CentOS/RHEL: sudo yum install ffmpeg"
    exit 1
fi

echo "FFmpeg version: $(ffmpeg -version | head -1)"

# Clone or update repository
REPO_DIR="$HOME/teslaplayer"

if [ -d "$REPO_DIR" ]; then
    echo "Updating existing repository..."
    cd "$REPO_DIR"
    git pull origin main
else
    echo "Cloning repository..."
    git clone https://github.com/UmutEmree/teslaplayer.git "$REPO_DIR"
    cd "$REPO_DIR"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build server
echo "Building server..."
npm run build -w apps/server

# Create environment file
ENV_FILE="$REPO_DIR/apps/server/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating .env file..."
    cat > "$ENV_FILE" << EOF
PORT=4000
NODE_ENV=production
CORS_ORIGINS=https://teslaplayer.vercel.app,https://borderline.winnipeg.usbx.me
EOF
    echo "Created $ENV_FILE"
fi

# Create systemd service (if systemd is available)
if command -v systemctl &> /dev/null; then
    echo ""
    echo "Creating systemd service..."
    sudo tee /etc/systemd/system/teslaplayer.service > /dev/null << EOF
[Unit]
Description=Tesla Player Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$REPO_DIR/apps/server
ExecStart=$(which node) dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=4000

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable teslaplayer
    sudo systemctl restart teslaplayer
    echo "Service started! Check status with: sudo systemctl status teslaplayer"
else
    # Use PM2 instead
    echo ""
    echo "Installing PM2 for process management..."
    npm install -g pm2

    cd "$REPO_DIR/apps/server"
    pm2 delete teslaplayer 2>/dev/null || true
    pm2 start dist/index.js --name teslaplayer
    pm2 save
    pm2 startup

    echo "Server started with PM2! Check status with: pm2 status"
fi

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Backend URL: http://$(hostname -f):4000"
echo "Health check: http://$(hostname -f):4000/health"
echo ""
echo "IMPORTANT: Update your Vercel frontend environment variable:"
echo "  NEXT_PUBLIC_API_URL=https://borderline.winnipeg.usbx.me"
echo ""
echo "If using a reverse proxy (nginx), configure it to proxy port 4000"
