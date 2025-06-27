# Docker Deployment Guide

This guide will help you deploy the Arbitrage Radar application using Docker on your Linux machine.

## Prerequisites

1. **Docker**: Install Docker Engine
   ```bash
   # Update package index
   sudo apt update
   
   # Install Docker
   sudo apt install docker.io -y
   
   # Start and enable Docker
   sudo systemctl start docker
   sudo systemctl enable docker
   
   # Add your user to docker group (to run without sudo)
   sudo usermod -aG docker $USER
   
   # Log out and back in for group changes to take effect
   ```

2. **Docker Compose**: Install Docker Compose
   ```bash
   # Download Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   
   # Make it executable
   sudo chmod +x /usr/local/bin/docker-compose
   
   # Verify installation
   docker-compose --version
   ```

## Quick Start

1. **Clone and navigate to your project**:
   ```bash
   cd ~/arbradar
   ```

2. **Run the deployment script**:
   ```bash
   ./deploy.sh
   ```

This will automatically:
- Check Docker installation
- Create environment file from example
- Build and start all containers
- Show you the access URLs

## Manual Deployment

If you prefer manual control:

1. **Configure environment variables**:
   ```bash
   cp backend/.env.example backend/.env
   nano backend/.env  # Edit with your API keys
   ```

2. **Build and start containers**:
   ```bash
   docker-compose up --build -d
   ```

3. **View logs**:
   ```bash
   docker-compose logs -f
   ```

## Environment Configuration

Edit `backend/.env` with your exchange API credentials:

```bash
# Exchange API Configuration
BINANCE_API_KEY=your_actual_binance_key
BINANCE_SECRET=your_actual_binance_secret

OKX_API_KEY=your_actual_okx_key
OKX_SECRET=your_actual_okx_secret
OKX_PASSPHRASE=your_actual_okx_passphrase

# ... configure other exchanges as needed
```

## Services

After deployment, you'll have:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health

## Useful Commands

### Deployment Script Options
```bash
./deploy.sh              # Normal deployment
./deploy.sh --clean      # Clean deployment (removes old images)
./deploy.sh --logs       # View logs
./deploy.sh --stop       # Stop all containers
./deploy.sh --status     # Show container status
./deploy.sh --help       # Show help
```

### Docker Compose Commands
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart specific service
docker-compose restart backend

# Rebuild and restart
docker-compose up --build -d

# View running containers
docker-compose ps

# Execute command in container
docker-compose exec backend sh
docker-compose exec frontend sh
```

### Docker Commands
```bash
# List all containers
docker ps -a

# List all images
docker images

# Remove unused containers and images
docker system prune -f

# View container logs
docker logs arbradar-backend
docker logs arbradar-frontend

# Execute shell in container
docker exec -it arbradar-backend sh
docker exec -it arbradar-frontend sh
```

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Check what's using the port
   sudo ss -tulpn | grep :3000
   sudo ss -tulpn | grep :3001
   
   # Stop the conflicting process or change ports in docker-compose.yml
   ```

2. **Permission denied for Docker**:
   ```bash
   # Add user to docker group
   sudo usermod -aG docker $USER
   
   # Log out and back in, or run:
   newgrp docker
   ```

3. **Build failures**:
   ```bash
   # Clean build
   ./deploy.sh --clean
   
   # Or manually:
   docker-compose down --rmi all
   docker system prune -f
   docker-compose up --build -d
   ```

4. **API connection issues**:
   - Check if backend is healthy: `curl http://localhost:3001/api/health`
   - Verify environment variables in `backend/.env`
   - Check backend logs: `docker-compose logs backend`

### Health Checks

Both services include health checks:

```bash
# Check health status
docker-compose ps

# Manual health check
curl http://localhost:3001/api/health  # Backend
curl http://localhost:3000             # Frontend
```

### Monitoring

View real-time logs:
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### Scaling

To run multiple instances of a service:
```bash
docker-compose up --scale backend=2 -d
```

## Production Considerations

For production deployment:

1. **Security**:
   - Use strong API keys
   - Don't expose unnecessary ports
   - Use Docker secrets for sensitive data
   - Run behind a reverse proxy (nginx)

2. **Performance**:
   - Allocate sufficient memory
   - Monitor container resource usage
   - Use production-optimized images

3. **Reliability**:
   - Set up log rotation
   - Implement backup strategies
   - Monitor service health
   - Set up restart policies

4. **Updates**:
   ```bash
   # Update to latest code
   git pull
   ./deploy.sh --clean
   ```

## Cleanup

To completely remove the deployment:

```bash
# Stop and remove containers, networks, and volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Clean up system
docker system prune -a
``` 