#!/bin/bash

# Production Deployment Script for ArbradarBackend
# Usage: ./scripts/deploy.sh [environment] [action]
# Example: ./scripts/deploy.sh production deploy

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE=""
ENVIRONMENT=""
ACTION=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [environment] [action]"
    echo ""
    echo "Environments:"
    echo "  dev         - Backend development environment (backend only)"
    echo "  full        - Full application (frontend + backend from root)"
    echo "  staging     - Deploy to staging environment"
    echo "  production  - Deploy to production environment"
    echo ""
    echo "Actions:"
    echo "  deploy      - Deploy the application"
    echo "  rollback    - Rollback to previous version"
    echo "  restart     - Restart services"
    echo "  stop        - Stop services"
    echo "  logs        - Show service logs"
    echo "  health      - Check service health"
    echo ""
    echo "Examples:"
    echo "  $0 dev deploy          # Backend development"
    echo "  $0 full deploy         # Full application"
    echo "  $0 production deploy   # Production deployment"
    echo "  $0 staging restart     # Restart staging"
    echo "  $0 production logs     # View production logs"
}

# Function to validate environment
validate_environment() {
    case "$1" in
        staging|production)
            ENVIRONMENT="$1"
            COMPOSE_FILE="docker-compose.$1.yml"
            ;;
        dev|development)
            ENVIRONMENT="development"
            COMPOSE_FILE="docker-compose.dev.yml"
            ;;
        full|app)
            ENVIRONMENT="full-app"
            COMPOSE_FILE="../docker-compose.yml"
            ;;
        *)
            log_error "Invalid environment: $1"
            show_usage
            exit 1
            ;;
    esac
    
    if [[ ! -f "$PROJECT_ROOT/$COMPOSE_FILE" ]]; then
        log_error "Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
}

# Function to validate action
validate_action() {
    case "$1" in
        deploy|rollback|restart|stop|logs|health)
            ACTION="$1"
            ;;
        *)
            log_error "Invalid action: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running or not accessible"
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose > /dev/null 2>&1; then
        log_error "docker-compose is not installed"
        exit 1
    fi
    
    # Check environment file
    if [[ "$ENVIRONMENT" == "production" ]] && [[ ! -f "$PROJECT_ROOT/.env.production" ]]; then
        log_warning "Production environment file not found: .env.production"
        log_info "Make sure to set environment variables properly"
    fi
    
    log_success "Prerequisites check completed"
}

# Function to backup current deployment
backup_deployment() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_info "Creating backup of current deployment..."
        
        # Create backup directory
        BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Determine container names based on environment
        case "$ENVIRONMENT" in
            production)
                BACKEND_CONTAINER="arbradar-backend-prod"
                ;;
            development)
                BACKEND_CONTAINER="arbradar-backend-dev"
                ;;
            full-app)
                BACKEND_CONTAINER="arbradar-backend"
                ;;
            *)
                BACKEND_CONTAINER="arbradar-backend-prod"
                ;;
        esac
        
        # Export current container
        if docker ps --format "table {{.Names}}" | grep -q "$BACKEND_CONTAINER"; then
            docker export "$BACKEND_CONTAINER" > "$BACKUP_DIR/backend-backup.tar"
            log_success "Backup created: $BACKUP_DIR/backend-backup.tar"
            
            # Backup frontend too if full app
            if [[ "$ENVIRONMENT" == "full-app" ]] && docker ps --format "table {{.Names}}" | grep -q "arbradar-frontend"; then
                docker export arbradar-frontend > "$BACKUP_DIR/frontend-backup.tar"
                log_success "Frontend backup created: $BACKUP_DIR/frontend-backup.tar"
            fi
        else
            log_warning "No running backend container ($BACKEND_CONTAINER) found to backup"
        fi
    fi
}

# Function to deploy
deploy() {
    log_info "Starting deployment to $ENVIRONMENT..."
    
    # Backup current deployment
    backup_deployment
    
    # Pull latest images
    log_info "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Start services
    log_info "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 10
    
    # Check health
    check_health
    
    # Cleanup old images
    log_info "Cleaning up old images..."
    docker system prune -f
    
    log_success "Deployment to $ENVIRONMENT completed successfully!"
}

# Function to rollback
rollback() {
    log_info "Rolling back $ENVIRONMENT deployment..."
    
    # Find latest backup
    BACKUP_DIR="$PROJECT_ROOT/backups"
    if [[ -d "$BACKUP_DIR" ]]; then
        LATEST_BACKUP=$(find "$BACKUP_DIR" -name "backend-backup.tar" | sort -r | head -n1)
        if [[ -n "$LATEST_BACKUP" ]]; then
            log_info "Found backup: $LATEST_BACKUP"
            log_warning "Manual rollback required. Please import the backup manually:"
            log_info "docker import $LATEST_BACKUP arbradar/backend:rollback"
            log_info "Then update your compose file to use the rollback image"
        else
            log_error "No backup found for rollback"
            exit 1
        fi
    else
        log_error "Backup directory not found"
        exit 1
    fi
}

# Function to restart services
restart_services() {
    log_info "Restarting $ENVIRONMENT services..."
    docker-compose -f "$COMPOSE_FILE" restart
    sleep 5
    check_health
    log_success "Services restarted successfully"
}

# Function to stop services
stop_services() {
    log_info "Stopping $ENVIRONMENT services..."
    docker-compose -f "$COMPOSE_FILE" down
    log_success "Services stopped successfully"
}

# Function to show logs
show_logs() {
    log_info "Showing logs for $ENVIRONMENT..."
    docker-compose -f "$COMPOSE_FILE" logs -f --tail=100
}

# Function to check health
check_health() {
    log_info "Checking service health..."
    
    # Check backend health
    BACKEND_URL="http://localhost:3001/api/health"
    if curl -f -s "$BACKEND_URL" > /dev/null; then
        log_success "Backend service is healthy"
    else
        log_error "Backend service is not healthy"
        log_info "Checking container status..."
        docker-compose -f "$COMPOSE_FILE" ps
        return 1
    fi
    
    # Check frontend health if full application
    if [[ "$ENVIRONMENT" == "full-app" ]]; then
        FRONTEND_URL="http://localhost:3000"
        if curl -f -s "$FRONTEND_URL" > /dev/null; then
            log_success "Frontend service is healthy"
        else
            log_warning "Frontend service may not be ready yet"
        fi
    fi
    
    # Check container status
    log_info "Container status:"
    docker-compose -f "$COMPOSE_FILE" ps
}

# Main function
main() {
    # Parse arguments
    if [[ $# -lt 2 ]]; then
        log_error "Invalid number of arguments"
        show_usage
        exit 1
    fi
    
    validate_environment "$1"
    validate_action "$2"
    
    log_info "Environment: $ENVIRONMENT"
    log_info "Action: $ACTION"
    log_info "Compose file: $COMPOSE_FILE"
    
    cd "$PROJECT_ROOT"
    
    # Check prerequisites
    check_prerequisites
    
    # Execute action
    case "$ACTION" in
        deploy)
            deploy
            ;;
        rollback)
            rollback
            ;;
        restart)
            restart_services
            ;;
        stop)
            stop_services
            ;;
        logs)
            show_logs
            ;;
        health)
            check_health
            ;;
    esac
}

# Execute main function with all arguments
main "$@" 