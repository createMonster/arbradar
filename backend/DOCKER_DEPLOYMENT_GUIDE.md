# 🐳 Docker Deployment Guide

This guide explains the different Docker deployment scenarios for ArbradarBackend and how to avoid container conflicts.

## 📋 Available Deployment Configurations

### 1. **Development (Backend Only)**
- **File**: `docker-compose.dev.yml`
- **Purpose**: Backend development and testing
- **Container**: `arbradar-backend-dev`
- **Usage**: Backend-only development

### 2. **Full Application**
- **File**: `../docker-compose.yml` (root level)
- **Purpose**: Complete application with frontend + backend
- **Containers**: `arbradar-backend`, `arbradar-frontend`
- **Usage**: Full application testing and development

### 3. **Staging Environment**
- **File**: `docker-compose.staging.yml`
- **Purpose**: Staging deployment
- **Container**: `arbradar-backend-staging`
- **Usage**: Pre-production testing

### 4. **Production Environment**
- **File**: `docker-compose.production.yml`
- **Purpose**: Production deployment
- **Container**: `arbradar-backend-prod`
- **Usage**: Live production system

## 🚨 Container Conflict Resolution

### **Problem**
Multiple Docker Compose configurations can create container name conflicts:
- Root `docker-compose.yml` creates `arbradar-backend`
- Backend `docker-compose.dev.yml` creates `arbradar-backend-dev`
- Production creates `arbradar-backend-prod`

### **Solution**
Each environment uses unique container names:

```bash
Environment     | Container Name              | Compose File
----------------|----------------------------|---------------------------
Development     | arbradar-backend-dev       | docker-compose.dev.yml
Full App        | arbradar-backend           | ../docker-compose.yml
Staging         | arbradar-backend-staging   | docker-compose.staging.yml
Production      | arbradar-backend-prod      | docker-compose.production.yml
```

## 🛠️ Deployment Commands

### **Using the Deployment Script** (Recommended)

```bash
# Backend development (backend only)
./scripts/deploy.sh dev deploy
./scripts/deploy.sh dev logs

# Full application (frontend + backend)
./scripts/deploy.sh full deploy
./scripts/deploy.sh full health

# Staging deployment
./scripts/deploy.sh staging deploy
./scripts/deploy.sh staging restart

# Production deployment
./scripts/deploy.sh production deploy
./scripts/deploy.sh production health
```

### **Direct Docker Compose Commands**

```bash
# Development (from backend directory)
docker-compose -f docker-compose.dev.yml up -d

# Full application (from root directory)
docker-compose up -d

# Staging (from backend directory)
docker-compose -f docker-compose.staging.yml up -d

# Production (from backend directory)
docker-compose -f docker-compose.production.yml up -d
```

## 📁 File Structure

```
arbradar/
├── docker-compose.yml                    # Full application (frontend + backend)
├── frontend/
│   └── Dockerfile
└── backend/
    ├── Dockerfile
    ├── docker-compose.dev.yml           # Backend development
    ├── docker-compose.staging.yml       # Staging environment
    ├── docker-compose.production.yml    # Production environment
    └── scripts/
        └── deploy.sh                    # Universal deployment script
```

## 🔧 Environment-Specific Configurations

### **Development Environment**
```yaml
# docker-compose.dev.yml
container_name: arbradar-backend-dev
environment:
  - NODE_ENV=development
  - LOG_LEVEL=debug
  - DEV_ENABLE_DEBUG_LOGS=true
```

### **Full Application**
```yaml
# ../docker-compose.yml
container_name: arbradar-backend
environment:
  - NODE_ENV=production
  - NEXT_PUBLIC_API_URL=http://backend:3001
```

### **Staging Environment**
```yaml
# docker-compose.staging.yml
container_name: arbradar-backend-staging
environment:
  - NODE_ENV=staging
  - LOG_LEVEL=debug
```

### **Production Environment**
```yaml
# docker-compose.production.yml
container_name: arbradar-backend-prod
environment:
  - NODE_ENV=production
  - LOG_LEVEL=info
```

## 🚀 Best Practices

### **1. Use the Deployment Script**
Always use `./scripts/deploy.sh` for consistent deployments:
```bash
./scripts/deploy.sh [environment] [action]
```

### **2. Environment-Specific Commands**
- **Development**: `./scripts/deploy.sh dev deploy`
- **Full Testing**: `./scripts/deploy.sh full deploy`
- **Staging**: `./scripts/deploy.sh staging deploy`
- **Production**: `./scripts/deploy.sh production deploy`

### **3. Avoid Manual Docker Commands**
Don't mix deployment methods to prevent conflicts:
```bash
# ❌ Don't do this (can cause conflicts)
docker-compose up -d
cd backend && docker-compose up -d

# ✅ Do this instead
./scripts/deploy.sh full deploy    # For full app
./scripts/deploy.sh dev deploy     # For backend only
```

### **4. Clean Up Properly**
Always stop services properly:
```bash
./scripts/deploy.sh [environment] stop
```

## 🔍 Troubleshooting Container Conflicts

### **Check Running Containers**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### **Stop All ArbradarContainers**
```bash
docker stop $(docker ps -q --filter "name=arbradar-*")
docker rm $(docker ps -aq --filter "name=arbradar-*")
```

### **Remove Conflicting Networks**
```bash
docker network ls | grep arbradar
docker network rm arbradar_arbradar-network
```

### **Port Conflicts**
If you get port conflicts:
```bash
# Check what's using port 3001
lsof -i :3001

# Stop conflicting containers
docker stop arbradar-backend arbradar-backend-dev arbradar-backend-prod
```

## 📊 Port Mapping Summary

| Environment  | Frontend Port | Backend Port | Container Names           |
|-------------|---------------|--------------|---------------------------|
| Development | -             | 3001         | arbradar-backend-dev      |
| Full App    | 3000          | 3001         | arbradar-frontend, arbradar-backend |
| Staging     | -             | 3001         | arbradar-backend-staging  |
| Production  | -             | 3001         | arbradar-backend-prod     |

## 🔒 Security Considerations

### **Environment Isolation**
- Each environment uses separate Docker networks
- Production uses minimal logging and secure settings
- Development enables debug logging for troubleshooting

### **Resource Limits**
- Production: 2 CPU cores, 1GB RAM
- Staging: 1 CPU core, 512MB RAM  
- Development: No limits (for testing)

## 📝 Quick Reference

```bash
# Start backend development
./scripts/deploy.sh dev deploy

# Start full application
./scripts/deploy.sh full deploy

# Check health status
./scripts/deploy.sh [env] health

# View logs
./scripts/deploy.sh [env] logs

# Stop services
./scripts/deploy.sh [env] stop

# Deploy to production
./scripts/deploy.sh production deploy
```

---

**Last Updated**: December 2024  
**Version**: 1.1.0 