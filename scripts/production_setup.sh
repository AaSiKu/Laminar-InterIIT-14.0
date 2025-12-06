#!/bin/bash
# TODO: Once verify and update
# Production Deployment Script
# This script sets up and runs the application in production mode

# --- Configuration ---
# Set the name of the virtual environment directory
API_VENV_DIR="backend/api_venv"
# Set the path to your requirements file
API_REQS_FILE="backend/api/requirements.txt"

PID_DIR="deploy/pids"
LOG_DIR="deploy/logs"

# Docker images
PIPELINE_IMAGE_NAME="backend-pipeline:latest"
POSTGRES_IMAGE_NAME="backend-postgres:latest"
AGENTIC_IMAGE_NAME="backend-agentic:latest"

# Server ports - Production uses different ports
API_SERVER_PORT=8080
CONTRACT_PARSER_PORT=8081
FRONTEND_PORT=8083

# Production settings
WORKERS=4
HOST="0.0.0.0"

# ---------------------

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Stop the script if any command fails
set -e

# Trap to handle script interruption
cleanup() {
    log_warning "Script interrupted. Cleaning up..."
    exit 1
}
trap cleanup INT TERM

log_info "Starting Production Deployment..."
echo "=============================================="

# Create necessary directories
mkdir -p $PID_DIR
mkdir -p $LOG_DIR

## 1. Check for Python 3
log_info "Checking for Python 3..."
if ! command -v python3 &> /dev/null; then
    log_error "python3 is not installed. Please install it to continue."
    exit 1
fi
log_success "Python 3 found."

## 2. Check for Node.js
log_info "Checking for Node.js..."
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install it to continue."
    exit 1
fi
log_success "Node.js found: $(node --version)"

## 3. Create Virtual Environment for API
if [ ! -d "$API_VENV_DIR" ]; then
    log_info "Creating virtual environment in './$API_VENV_DIR'..."
    python3 -m venv $API_VENV_DIR
else
    log_info "Virtual environment './$API_VENV_DIR' already exists."
fi

## 4. Activate Venv and Install Requirements for API
log_info "Activating virtual environment..."
source "$API_VENV_DIR/bin/activate"

log_info "Upgrading pip..."
pip install --upgrade pip -q

if [ -f "$API_REQS_FILE" ]; then
    log_info "Installing requirements from $API_REQS_FILE..."
    pip install -r $API_REQS_FILE > $LOG_DIR/pip.log 2>&1
    log_success "Requirements installed."
else
    log_warning "'$API_REQS_FILE' not found. Skipping dependency installation."
fi

## 5. Check Docker daemon and images
log_info "Checking Docker environment..."

if ! docker version > /dev/null 2>&1; then
    log_error "Docker daemon is not running."
    exit 1
fi
log_success "Docker daemon is running."

# Check for required images
for IMAGE in "$PIPELINE_IMAGE_NAME" "$POSTGRES_IMAGE_NAME" "$AGENTIC_IMAGE_NAME"; do
    if [ -z "$(docker images -q "$IMAGE" 2> /dev/null)" ]; then
        log_error "Docker image '$IMAGE' does not exist locally."
        log_info "Please build the image first: docker build -t $IMAGE ."
        exit 1
    fi
    log_success "Image '$IMAGE' exists."
done

## 6. Build Frontend for Production
log_info "Building frontend for production..."
cd frontend

log_info "Installing npm packages..."
npm ci --silent > ../$LOG_DIR/frontend_install.log 2>&1

log_info "Building production bundle..."
npm run build > ../$LOG_DIR/frontend_build.log 2>&1
log_success "Frontend build completed. Output in frontend/dist/"

cd ..

## 7. Start FastAPI in Production Mode (Gunicorn with Uvicorn workers)
log_info "Starting FastAPI server in production mode..."

# Check if gunicorn is installed
if ! python3 -c "import gunicorn" 2>/dev/null; then
    log_info "Installing gunicorn..."
    pip install gunicorn -q
fi

# Export environment variables
export PIPELINE_IMAGE_NAME
export POSTGRES_IMAGE_NAME
export AGENTIC_IMAGE_NAME
export ENVIRONMENT=production

# Use gunicorn with uvicorn workers for production
nohup gunicorn backend.api.main:app \
    --workers $WORKERS \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind $HOST:$API_SERVER_PORT \
    --access-logfile $LOG_DIR/api_access.log \
    --error-logfile $LOG_DIR/api_error.log \
    --capture-output \
    --daemon \
    --pid $PID_DIR/api.pid

API_PID=$(cat $PID_DIR/api.pid 2>/dev/null || echo "unknown")
log_success "API Server started with PID: $API_PID"
log_info "Access logs: $LOG_DIR/api_access.log"
log_info "Error logs: $LOG_DIR/api_error.log"

echo "---"

## 8. Serve Frontend Static Files
log_info "Starting frontend static file server..."

# Check if serve is installed globally
if ! command -v serve &> /dev/null; then
    log_info "Installing 'serve' package globally..."
    npm install -g serve > /dev/null 2>&1
fi

cd frontend
export VITE_API_SERVER="http://localhost:$API_SERVER_PORT"
nohup serve -s dist -l $FRONTEND_PORT > ../$LOG_DIR/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "../$PID_DIR/frontend.pid"

log_success "Frontend started with PID: $FRONTEND_PID"
log_info "Frontend logs: $LOG_DIR/frontend.log"

echo "---"

## 9. Start Contract Parser Agent Server (Production mode)
if [ -d "backend/contractparseragent/server" ]; then
    log_info "Starting Contract Parser Agent server..."
    cd backend/contractparseragent/server
    nohup python server.py > ../../../$LOG_DIR/contractparseragent.log 2>&1 &
    CONTRACTPARSERAGENT_PID=$!
    echo $CONTRACTPARSERAGENT_PID > "../../../$PID_DIR/contractparseragent.pid"
    cd ../../..

    log_success "Contract Parser Agent server started with PID: $CONTRACTPARSERAGENT_PID"
    log_info "Logs: $LOG_DIR/contractparseragent.log"
    echo "---"
fi

## 10. Health Check
log_info "Performing health check..."
sleep 3

# Check if API is responding
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$API_SERVER_PORT/health" | grep -q "200\|404"; then
    log_success "API server is responding"
else
    log_warning "API server may still be starting up..."
fi

# Check if frontend is responding
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$FRONTEND_PORT" | grep -q "200"; then
    log_success "Frontend server is responding"
else
    log_warning "Frontend server may still be starting up..."
fi

echo ""
echo "=============================================="
log_success "Production deployment completed!"
echo "=============================================="
echo ""
echo "Services running:"
echo "  - API Server:      http://localhost:$API_SERVER_PORT"
echo "  - Frontend:        http://localhost:$FRONTEND_PORT"
echo ""
echo "Log files:"
echo "  - API access:      $LOG_DIR/api_access.log"
echo "  - API errors:      $LOG_DIR/api_error.log"
echo "  - Frontend:        $LOG_DIR/frontend.log"
echo ""
echo "To stop all services, run: ./scripts/production_stop.sh"
echo "To view logs: tail -f $LOG_DIR/*.log"
echo "=============================================="
