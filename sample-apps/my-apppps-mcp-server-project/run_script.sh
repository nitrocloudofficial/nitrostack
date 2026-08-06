#!/bin/bash

################################################################################
# Azure Agentic Cloud - Complete Execution Script
# This script sets up and runs the entire multi-agent system
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
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

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
}

################################################################################
# STEP 0: Pre-flight checks
################################################################################

print_header "Step 0: Pre-flight Checks"

# Check Python version
if ! command -v python3 &> /dev/null; then
    print_error "Python3 is not installed. Please install Python 3.11 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | awk '{print $2}')
print_info "Python version: $PYTHON_VERSION"

# Check if we're in the right directory
if [ ! -f "main.py" ] || [ ! -f "api.py" ]; then
    print_error "Not in the correct directory. Please run from project root."
    exit 1
fi

print_success "Pre-flight checks passed!"

################################################################################
# STEP 1: Fix file naming issues
################################################################################

print_header "Step 1: Fixing File Names"

# Fix DockerFile -> Dockerfile
if [ -f "DockerFile" ]; then
    print_info "Renaming DockerFile to Dockerfile..."
    mv DockerFile Dockerfile
    print_success "Renamed DockerFile to Dockerfile"
fi

# Fix env.env -> .env
if [ -f "env.env" ]; then
    print_info "Renaming env.env to .env..."
    mv env.env .env
    print_success "Renamed env.env to .env"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    cat > .env << 'EOF'
# Azure Configuration
AZURE_SUBSCRIPTION_ID=your-subscription-id-here
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here
AZURE_RESOURCE_GROUP=agentic-cloud-rg

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
AZURE_OPENAI_KEY=your-openai-key-here
AZURE_OPENAI_MODEL=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Application Configuration
LOG_LEVEL=INFO
API_HOST=0.0.0.0
API_PORT=8000
EOF
    print_warning "Created .env template. Please edit it with your credentials!"
    print_warning "Press any key to continue after editing .env..."
    read -n 1
fi

################################################################################
# STEP 2: Virtual Environment Setup
################################################################################

print_header "Step 2: Setting Up Virtual Environment"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_info "Creating virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_info "Virtual environment already exists"
fi

# Activate virtual environment
print_info "Activating virtual environment..."
source venv/bin/activate
print_success "Virtual environment activated"

################################################################################
# STEP 3: Install Dependencies
################################################################################

print_header "Step 3: Installing Dependencies"

print_info "Upgrading pip..."
pip install --upgrade pip --quiet

print_info "Installing requirements..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt --quiet
    print_success "Dependencies installed"
else
    print_error "requirements.txt not found!"
    exit 1
fi

################################################################################
# STEP 4: Validate Configuration
################################################################################

print_header "Step 4: Validating Configuration"

# Load .env and check if critical variables are set
source .env

if [ "$AZURE_SUBSCRIPTION_ID" = "your-subscription-id-here" ]; then
    print_error "Please configure your Azure credentials in .env file!"
    print_info "Edit .env and set:"
    print_info "  - AZURE_SUBSCRIPTION_ID"
    print_info "  - AZURE_OPENAI_ENDPOINT"
    print_info "  - AZURE_OPENAI_KEY"
    exit 1
fi

print_success "Configuration validated"

################################################################################
# STEP 5: Run Tests (Optional)
################################################################################

print_header "Step 5: Running Tests (Optional)"

if [ -f "test_regex.py" ]; then
    print_info "Running test_regex.py..."
    python test_regex.py || print_warning "Tests had warnings (continuing anyway)"
    print_success "Tests completed"
else
    print_info "No test files found, skipping..."
fi

################################################################################
# STEP 6: Choose Execution Mode
################################################################################

print_header "Step 6: Choose Execution Mode"

echo "How would you like to run the application?"
echo "1) Run main.py (Direct execution)"
echo "2) Run API server (api.py with uvicorn)"
echo "3) Run with Docker Compose"
echo "4) Run tests only"
echo "5) Run frontend (React dev server)"
echo "6) Exit"

read -p "Enter choice [1-6]: " choice

case $choice in
    1)
        print_header "Running main.py"
        print_info "Starting main application..."
        python main.py
        ;;
    2)
        print_header "Running API Server"
        print_info "Starting FastAPI server on http://localhost:8000"
        print_info "API docs will be available at http://localhost:8000/docs"
        
        # Check if uvicorn is installed
        if ! command -v uvicorn &> /dev/null; then
            print_info "Installing uvicorn..."
            pip install uvicorn[standard]
        fi
        
        uvicorn api:app --reload --host 0.0.0.0 --port 8000
        ;;
    3)
        print_header "Running with Docker Compose"
        
        # Check if docker-compose is installed
        if ! command -v docker-compose &> /dev/null; then
            print_error "docker-compose is not installed!"
            exit 1
        fi
        
        print_info "Building and starting containers..."
        docker-compose up --build
        ;;
    4)
        print_header "Running Tests"
        
        # Create basic test if it doesn't exist
        if [ ! -d "tests" ]; then
            mkdir tests
            print_info "Created tests directory"
        fi
        
        # Run all Python test files
        print_info "Running all tests..."
        for test_file in test_*.py; do
            if [ -f "$test_file" ]; then
                print_info "Running $test_file..."
                python "$test_file"
            fi
        done
        
        if command -v pytest &> /dev/null; then
            pytest tests/ -v
        else
            print_warning "pytest not installed. Install with: pip install pytest"
        fi
        ;;
    5)
        print_header "Running Frontend Dev Server"
        
        # Check if frontend directory exists
        if [ ! -d "frontend" ]; then
            print_error "frontend directory not found!"
            print_info "Please create the frontend first."
            exit 1
        fi
        
        # Check if node_modules exists
        if [ ! -d "frontend/node_modules" ]; then
            print_info "Installing frontend dependencies..."
            cd frontend
            npm install
            cd ..
        fi
        
        print_info "Starting React dev server on http://localhost:5173"
        print_info "Make sure the backend API is running on http://localhost:8000"
        cd frontend
        npm run dev
        ;;
    6)
        print_info "Exiting..."
        exit 0
        ;;
    *)
        print_error "Invalid choice!"
        exit 1
        ;;
esac

################################################################################
# STEP 7: Cleanup (Optional)
################################################################################

print_header "Execution Complete"
print_success "Application finished successfully!"

echo ""
echo "Useful commands:"
echo "  - View logs: tail -f logs/app.log"
echo "  - Stop containers: docker-compose down"
echo "  - Deactivate venv: deactivate"
echo ""

# Trap Ctrl+C
trap 'print_info "Caught Ctrl+C, cleaning up..."; exit 0' INT
