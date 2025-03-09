#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check for required dependencies
check_dependencies() {
    log_warning "Checking system dependencies..."
    
    # Required commands
    REQUIRED_COMMANDS=("node" "npm" "openssl" "git")
    
    for cmd in "${REQUIRED_COMMANDS[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "$cmd is not installed!"
            return 1
        fi
    done
    
    log_success "All required dependencies are installed."
    return 0
}

# Setup project environment
setup_project() {
    # Create necessary directories
    mkdir -p ssl storage/captures storage/logs config

    # Generate SSL certificates
    log_warning "Generating self-signed SSL certificates..."
    openssl req -x509 -newkey rsa:4096 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -days 365 -nodes \
        -subj "/CN=yahoo-proxy-toolkit"

    # Install project dependencies
    log_warning "Installing project dependencies..."
    npm install

    # Set up environment file
    if [ ! -f .env ]; then
        cp .env.example .env
        log_success "Created .env file from example"
    fi

    # Set appropriate permissions
    chmod 600 ssl/key.pem ssl/cert.pem
    chmod 700 storage/captures storage/logs
}

# Configure firewall (Linux-specific)
configure_firewall() {
    if command -v ufw &> /dev/null; then
        log_warning "Configuring UFW firewall..."
        sudo ufw allow 8080/tcp
        sudo ufw reload
        log_success "Firewall configured for proxy port"
    elif command -v firewall-cmd &> /dev/null; then
        log_warning "Configuring FirewallD..."
        sudo firewall-cmd --permanent --add-port=8080/tcp
        sudo firewall-cmd --reload
        log_success "Firewall configured for proxy port"
    else
        log_warning "No firewall utility found. Manual firewall configuration recommended."
    fi
}

# Main setup function
main() {
    clear
    echo "=== Yahoo Proxy Toolkit Setup ==="
    
    # Perform checks
    check_dependencies || exit 1
    
    # Setup project
    setup_project
    
    # Configure firewall
    configure_firewall
    
    # Final instructions
    echo -e "\n${GREEN}Setup Complete!${NC}"
    echo "To start the proxy:"
    echo "  npm start        # Production mode"
    echo "  npm run dev      # Development mode"
    
    # Security warning
    echo -e "\n${YELLOW}WARNING:${NC} This toolkit is for RESEARCH PURPOSES ONLY."
    echo "Unauthorized use is strictly prohibited."
}

# Run main setup function
main