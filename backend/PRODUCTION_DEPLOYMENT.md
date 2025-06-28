# 🚀 Production Deployment Guide

This guide covers deploying the ArbradarBackend to production environments using Docker and the automated CI/CD pipeline.

## 📋 Prerequisites

### System Requirements
- **Docker**: 20.10+ with Docker Compose
- **Node.js**: 20+ (for local development)
- **pnpm**: Latest version
- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **Memory**: Minimum 2GB RAM, recommended 4GB+
- **CPU**: Minimum 2 cores
- **Storage**: 20GB+ free space

### Environment Setup
1. **Server Access**: SSH access to production server
2. **Domain**: Configured domain pointing to server
3. **SSL Certificate**: HTTPS certificate for secure communication
4. **Environment Variables**: Production environment file configured

## 🔧 Configuration

### 1. Environment Variables

Create a `.env.production` file in the backend directory:

```bash
# Production Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Cache Configuration
CACHE_TTL_TICKERS=10000
CACHE_TTL_FUNDING_RATES=600000
CACHE_TTL_PROCESSED_DATA=10000

# API Configuration
API_RATE_LIMIT_WINDOW=60000
API_RATE_LIMIT_MAX=100

# CORS Origins (replace with your actual domains)
CORS_ORIGINS=https://yourproductiondomain.com,https://www.yourproductiondomain.com

# Hyperliquid Configuration (if using)
HYPERLIQUID_WALLET_ADDRESS=your_wallet_address
HYPERLIQUID_PRIVATE_KEY=your_private_key

# Health Check Configuration
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CHECK_INTERVAL=30000

# Production Settings
DEV_ENABLE_DEBUG_LOGS=false
DEV_ENABLE_CACHE_LOGS=false
```

### 2. Docker Compose Configuration

The `docker-compose.production.yml` file is pre-configured for production deployment. Key features:

- **Resource Limits**: CPU and memory constraints
- **Health Checks**: Automatic service health monitoring
- **Logging**: Structured logging with rotation
- **Restart Policy**: Automatic restart on failure
- **Security**: Non-root user execution

## 🚀 Deployment Methods

### Method 1: Automated CI/CD Pipeline (Recommended)

The GitHub Actions pipeline automatically handles:
- ✅ Code quality checks and testing
- ✅ Docker image building and pushing
- ✅ Staging deployment
- ✅ Production deployment (with manual approval)

**Steps:**
1. Push code to `main` branch
2. Pipeline runs automatically
3. Review and approve staging deployment
4. Approve production deployment when ready

### Method 2: Manual Deployment

Using the deployment script:

```bash
# Deploy to production
./scripts/deploy.sh production deploy

# Check deployment health
./scripts/deploy.sh production health

# View logs
./scripts/deploy.sh production logs

# Restart services
./scripts/deploy.sh production restart
```

### Method 3: Direct Docker Commands

```bash
# Pull and start services
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

## 🔐 Security Checklist

### Before Production Deployment:

- [ ] **Environment Variables**: All sensitive data in environment variables
- [ ] **SSL/TLS**: HTTPS enabled and certificates configured
- [ ] **Firewall**: Only necessary ports open (80, 443, 22)
- [ ] **User Permissions**: Application runs as non-root user
- [ ] **Dependencies**: All dependencies updated and audited
- [ ] **Secrets Management**: API keys and passwords securely stored
- [ ] **CORS**: Origins restricted to actual domains
- [ ] **Rate Limiting**: API rate limits configured
- [ ] **Logging**: Sensitive data not logged

### Security Headers (if using Nginx):
```nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
```

## 📊 Monitoring & Health Checks

### Built-in Health Checks
- **Endpoint**: `GET /api/health`
- **Docker Health Check**: Automatic container health monitoring
- **Response Time**: < 5 seconds expected

### Monitoring Metrics
- **Memory Usage**: Monitor container memory consumption
- **CPU Usage**: Track CPU utilization
- **Response Times**: API endpoint performance
- **Error Rates**: Application error frequency
- **Cache Hit Rates**: Cache performance metrics

### Log Monitoring
```bash
# Real-time logs
docker-compose -f docker-compose.production.yml logs -f backend

# Error logs only
docker-compose -f docker-compose.production.yml logs backend | grep ERROR

# Log files location
./logs/combined.log
./logs/error.log
```

## 🔄 Backup & Recovery

### Automated Backups
The deployment script automatically creates backups before updates:
- **Location**: `./backups/YYYYMMDD_HHMMSS/`
- **Content**: Docker container export
- **Retention**: Manual cleanup required

### Manual Backup
```bash
# Create backup
docker export arbradar-backend-prod > backup-$(date +%Y%m%d).tar

# Restore backup
docker import backup-20241201.tar arbradar/backend:backup
```

### Database Backup (if applicable)
```bash
# Future: Redis backup
# docker exec arbradar-redis-prod redis-cli BGSAVE
```

## 🚨 Troubleshooting

### Common Issues:

**1. Container Won't Start**
```bash
# Check container logs
docker logs arbradar-backend-prod

# Check Docker daemon
sudo systemctl status docker

# Check resource usage
docker stats
```

**2. Health Check Failing**
```bash
# Test health endpoint manually
curl http://localhost:3001/api/health

# Check container status
docker-compose -f docker-compose.production.yml ps

# Restart container
docker-compose -f docker-compose.production.yml restart backend
```

**3. High Memory Usage**
```bash
# Check memory usage
docker stats arbradar-backend-prod

# Check application logs for memory leaks
docker logs arbradar-backend-prod | grep "memory"

# Restart if necessary
docker-compose -f docker-compose.production.yml restart backend
```

**4. API Errors**
```bash
# Check application logs
docker-compose -f docker-compose.production.yml logs backend

# Check environment variables
docker exec arbradar-backend-prod env

# Test API endpoints
curl -v http://localhost:3001/api/spreads
```

## 🔧 Maintenance

### Regular Tasks:

**Weekly:**
- [ ] Check application logs for errors
- [ ] Monitor resource usage (CPU, Memory)
- [ ] Verify health check status
- [ ] Review cache performance

**Monthly:**
- [ ] Update Docker images (`docker-compose pull`)
- [ ] Clean up old images (`docker system prune`)
- [ ] Review and rotate logs
- [ ] Security audit of dependencies

**Quarterly:**
- [ ] Update system packages
- [ ] Review and update SSL certificates
- [ ] Performance optimization review
- [ ] Disaster recovery testing

## 📞 Support & Escalation

### Emergency Procedures:
1. **Service Down**: Use deployment script to restart
2. **Data Loss**: Restore from latest backup
3. **Security Breach**: Stop services immediately, investigate
4. **Performance Issues**: Check monitoring metrics, scale if needed

### Contacts:
- **Development Team**: [Your team contact]
- **Infrastructure**: [Your infrastructure contact]
- **Security**: [Your security contact]

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Node.js Production Guide](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [CCXT Documentation](https://docs.ccxt.com/)

---

**Last Updated**: December 2024  
**Version**: 1.0.0 