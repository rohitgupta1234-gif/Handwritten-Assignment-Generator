<#
.SYNOPSIS
    Startup scripts for Handwritten Assignment Generator on Windows

.DESCRIPTION
    This script provides commands to start the application in development and production modes.

.NOTES
    Run from the project root directory.
#>

$RootDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"

# ===========================================
# DEVELOPMENT MODE
# ===========================================
# Terminal 1 - Backend
Write-Host "Starting Backend (Development)..." -ForegroundColor Green
cd $BackendDir
npm run dev

# Terminal 2 - Frontend (run in separate PowerShell window)
# cd $FrontendDir
# npm run dev

# ===========================================
# PRODUCTION MODE
# ===========================================

# Build both frontend and backend
Write-Host "Building for Production..." -ForegroundColor Green

# Build Frontend
cd $FrontendDir
npm run build

# Build Backend
cd $BackendDir
npm run build

# Start Production Server (Backend serves Frontend)
Write-Host "Starting Production Server..." -ForegroundColor Green
$env:NODE_ENV = "production"
$env:PORT = "5000"
$env:FRONTEND_URL = "https://your-domain.com"
# Set other required environment variables from .env.production
npm run start

# ===========================================
# PRODUCTION WITH PM2 (Process Manager)
# ===========================================
# Install PM2 globally if not installed
# npm install -g pm2

# Start with PM2
# cd $RootDir
# pm2 start ecosystem.config.js --env production

# Monitor PM2 processes
# pm2 monit

# View logs
# pm2 logs

# Stop all processes
# pm2 stop all

# ===========================================
# DATABASE OPERATIONS
# ===========================================

# Initialize Production Database
# cd $BackendDir
# npm run db:init:prod

# Backup Database
# npm run db:backup

# ===========================================
# ENVIRONMENT VARIABLES (Production)
# ===========================================
# Copy .env.production.example to .env.production and fill in values:
#
# NODE_ENV=production
# PORT=5000
# FRONTEND_URL=https://your-domain.com
# DATABASE_PATH=./data/app.db
# REDIS_HOST=your-redis-host
# REDIS_PORT=6379
# REDIS_PASSWORD=your-redis-password
# JWT_SECRET=your-super-secret-jwt-key-min-32-chars
# JWT_ACCESS_TOKEN_EXPIRY=15m
# JWT_REFRESH_TOKEN_EXPIRY=7d
# AI_PROVIDER=gemini
# GEMINI_API_KEY=your-gemini-api-key
# GEMINI_MODEL=gemini-3.6-flash
# OPENAI_API_KEY=your-openai-api-key
# SMTP_HOST=smtp.your-provider.com
# SMTP_PORT=587
# SMTP_USER=your-smtp-user
# SMTP_PASS=your-smtp-password
# EMAIL_FROM=noreply@your-domain.com
# FORGE_API_URL=http://your-forge-host:7860
# LOG_LEVEL=info
# SENTRY_DSN=your-sentry-dsn
# CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# ===========================================
# PUPPETEER DEPENDENCIES (Windows)
# ===========================================
# Puppeteer should work out of the box on Windows 10/11
# If issues occur, install:
# npm install -g puppeteer
# Or run: npx puppeteer browsers install chrome

# ===========================================
# NGINX CONFIGURATION (Reverse Proxy)
# ===========================================
# Example nginx.conf for production:
#
# server {
#     listen 80;
#     server_name your-domain.com;
#     return 301 https://$server_name$request_uri;
# }
#
# server {
#     listen 443 ssl http2;
#     server_name your-domain.com;
#
#     ssl_certificate /path/to/cert.pem;
#     ssl_certificate_key /path/to/key.pem;
#
#     # Frontend (served by backend)
#     location / {
#         proxy_pass http://localhost:5000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#     }
#
#     # Uploads
#     location /uploads {
#         proxy_pass http://localhost:5000;
#         proxy_set_header Host $host;
#         expires 1d;
#         add_header Cache-Control "public, immutable";
#     }
# }

# ===========================================
# SYSTEM SERVICE (Windows Service via NSSM)
# ===========================================
# To run as Windows Service:
# 1. Download NSSM (Non-Sucking Service Manager)
# 2. Run: nssm install HandwriteAI
# 3. Path: C:\Program Files\nodejs\node.exe
# 4. Arguments: <path-to-project>\backend\dist\index.js
# 5. Startup directory: <path-to-project>\backend
# 6. Environment: NODE_ENV=production, PORT=5000, etc.
# 7. Start service: net start HandwriteAI