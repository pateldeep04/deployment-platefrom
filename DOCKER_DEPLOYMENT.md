# Docker Deployment Guide

DeployHub ships with containerized orchestration for MongoDB, Redis, and the unified App server.

## 1. Start All Services
```bash
docker compose up -d --build
```

## 2. Check Logs
```bash
docker compose logs -f app
```

## 3. Stop All Services
```bash
docker compose down
```
