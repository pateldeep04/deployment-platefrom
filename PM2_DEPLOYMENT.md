# PM2 Production Deployment Guide

DeployHub can be run in production with PM2 on Ubuntu or Windows servers.

## 1. Prerequisites
- Node.js >= 18
- PM2: `npm install -g pm2`

## 2. Build Frontend
```bash
npm run build
```

## 3. Start with PM2
```bash
pm2 start ecosystem.config.cjs
```

## 4. Save & Setup Startup
```bash
pm2 save
pm2 startup
```

## 5. View Status & Logs
```bash
pm2 status
pm2 logs deployhub-server
```
