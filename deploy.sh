#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if .env file exists
check_env() {
    if [ ! -f "backend/.env" ]; then
        print_warning "backend/.env file not found. Creating from example..."
        cp backend/.env.example backend/.env
        print_warning "Please edit backend/.env with your actual API keys before running the application"
        print_warning "You can edit it with: nano backend/.env"
        return 1
    fi
    return 0
}

# Build and deploy
deploy() {
    print_status "Starting deployment process..."
    
    # Stop existing containers
    print_status "Stopping existing containers..."
    docker-compose down
    
    # Remove old images (optional)
    if [ "$1" = "--clean" ]; then
        print_status "Removing old images..."
        docker-compose down --rmi all
        docker system prune -f
    fi
    
    # Build and start containers
    print_status "Building and starting containers..."
    docker-compose up --build -d
    
    if [ $? -eq 0 ]; then
        print_success "Deployment completed successfully!"
        print_status "Services are starting up..."
        print_status "Frontend will be available at: http://localhost:3000"
        print_status "Backend API will be available at: http://localhost:3001"
        print_status ""
        print_status "To view logs:"
        print_status "  Frontend: docker-compose logs -f frontend"
        print_status "  Backend:  docker-compose logs -f backend"
        print_status "  All:      docker-compose logs -f"
        print_status ""
        print_status "To stop services: docker-compose down"
    else
        print_error "Deployment failed!"
        exit 1
    fi
}

# Show help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --clean    Remove old images before building"
    echo "  --logs     Show container logs"
    echo "  --stop     Stop all containers"
    echo "  --status   Show container status"
    echo "  --help     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # Deploy normally"
    echo "  $0 --clean      # Clean deploy (remove old images)"
    echo "  $0 --logs       # Show logs"
    echo "  $0 --stop       # Stop containers"
}

# Show logs
show_logs() {
    docker-compose logs -f
}

# Stop containers
stop_containers() {
    print_status "Stopping containers..."
    docker-compose down
    print_success "Containers stopped"
}

# Show status
show_status() {
    print_status "Container status:"
    docker-compose ps
}

# Main script
main() {
    case "$1" in
        --help)
            show_help
            ;;
        --logs)
            show_logs
            ;;
        --stop)
            stop_containers
            ;;
        --status)
            show_status
            ;;
        --clean)
            check_docker
            check_env
            deploy --clean
            ;;
        "")
            check_docker
            env_check_result=$?
            deploy
            if [ $env_check_result -eq 1 ]; then
                print_warning "Remember to configure your exchange API keys in backend/.env"
                print_warning "Then restart with: docker-compose restart backend"
            fi
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@" 