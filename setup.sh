#!/bin/bash
#
# Sn1per Platform - Universal Setup Script
# This script installs all dependencies and sets up the platform on any machine
#
# Usage:
#   chmod +x setup.sh
#   sudo ./setup.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

INSTALL_DIR="/usr/share/sniper"
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${RED}"
echo "  ____               "
echo " _________  /  _/___  ___  _____"
echo "/ ___/ __ \\ / // __ \\/ _ \\/ ___/"
echo "(__  ) / / // // /_/ /  __/ /"
echo "/____/_/ /_/___/ .___/\\___/_/"
echo "               /_/"
echo -e "${NC}"
echo -e "${BLUE}Sn1per Security Platform - Universal Setup${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root: sudo $0${NC}"
    exit 1
fi

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    elif [ -f /etc/debian_version ]; then
        OS="debian"
    elif [ -f /etc/redhat-release ]; then
        OS="centos"
    else
        OS="unknown"
    fi
    echo -e "${GREEN}[+] Detected OS: $OS $VER${NC}"
}

# Install system packages
install_system_packages() {
    echo -e "${YELLOW}[+] Installing system packages...${NC}"
    
    case $OS in
        ubuntu|debian|kali)
            apt-get update
            apt-get install -y \
                curl wget git bash sudo \
                python3 python3-pip python3-venv \
                nodejs npm \
                jq xmlstarlet \
                nmap nikto dirb gobuster \
                hydra medusa \
                whatweb wpscan \
                metasploit-framework \
                postgresql \
                chromium-browser || apt-get install -y chromium
            ;;
        centos|rhel|fedora)
            yum install -y \
                curl wget git bash sudo \
                python3 python3-pip \
                nodejs npm \
                jq xmlstarlet \
                nmap nikto dirb gobuster \
                hydra \
                whatweb \
                chromium
            ;;
        arch|manjaro)
            pacman -Sy --noconfirm \
                curl wget git bash sudo \
                python python-pip \
                nodejs npm \
                jq xmlstarlet \
                nmap nikto dirb gobuster \
                hydra medusa \
                whatweb wpscan \
                metasploit \
                postgresql \
                chromium
            ;;
        *)
            echo -e "${RED}[-] Unsupported OS: $OS${NC}"
            echo -e "${YELLOW}[!] Please install dependencies manually${NC}"
            exit 1
            ;;
    esac
}

# Install Node.js properly
install_nodejs() {
    echo -e "${YELLOW}[+] Installing Node.js 20...${NC}"
    
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    
    npm install -g npm@latest
    echo -e "${GREEN}[+] Node.js version: $(node --version)${NC}"
    echo -e "${GREEN}[+] npm version: $(npm --version)${NC}"
}

# Install Python dependencies
install_python_deps() {
    echo -e "${YELLOW}[+] Installing Python dependencies...${NC}"
    
    pip3 install --break-system-packages -r "$CURRENT_DIR/requirements.txt" 2>/dev/null || \
    pip3 install -r "$CURRENT_DIR/requirements.txt"
}

# Setup sniper directory structure
setup_directories() {
    echo -e "${YELLOW}[+] Setting up directories...${NC}"
    
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$INSTALL_DIR/loot/workspace"
    mkdir -p "$INSTALL_DIR/loot/output"
    mkdir -p "$INSTALL_DIR/loot/screenshots"
    mkdir -p "$INSTALL_DIR/loot/logs"
    mkdir -p "/tmp/sniper-sessions"
    
    # Copy files if not already there
    if [ "$CURRENT_DIR" != "$INSTALL_DIR" ]; then
        cp -r "$CURRENT_DIR/"* "$INSTALL_DIR/"
    fi
}

# Fix python2 references to python3
fix_python_references() {
    echo -e "${YELLOW}[+] Fixing Python references...${NC}"
    
    find "$INSTALL_DIR/modes" -name "*.sh" -exec sed -i 's/python2 /python3 /g' {} \;
    find "$INSTALL_DIR/bin" -name "*.py" -exec sed -i 's|#!/usr/bin/env python$|#!/usr/bin/env python3|g' {} \;
    find "$INSTALL_DIR/bin" -name "*.py" -exec sed -i 's|#!/usr/bin/python$|#!/usr/bin/python3|g' {} \;
}

# Setup sudoers for sniper
setup_sudoers() {
    echo -e "${YELLOW}[+] Setting up sudoers...${NC}"
    
    # Get the current user (not root)
    CURRENT_USER=${SUDO_USER:-$USER}
    
    echo "$CURRENT_USER ALL=(ALL) NOPASSWD: $INSTALL_DIR/sniper *" > /etc/sudoers.d/sniper
    chmod 440 /etc/sudoers.d/sniper
    
    echo -e "${GREEN}[+] Added sniper to sudoers for user: $CURRENT_USER${NC}"
}

# Build the UI
build_ui() {
    echo -e "${YELLOW}[+] Building Sniper UI...${NC}"
    
    cd "$INSTALL_DIR/ui/sniper-dashboard"
    npm install
    npm run build
    
    echo -e "${GREEN}[+] UI built successfully${NC}"
}

# Setup systemd service (optional)
setup_systemd() {
    echo -e "${YELLOW}[+] Setting up systemd service...${NC}"
    
    cat > /etc/systemd/system/sniper-ui.service << EOF
[Unit]
Description=Sniper Security Platform UI
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/ui/sniper-dashboard
ExecStart=/usr/bin/npm run start -- -p 3004
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable sniper-ui
    echo -e "${GREEN}[+] Systemd service installed. Use: systemctl start sniper-ui${NC}"
}

# Setup PostgreSQL for Metasploit
setup_postgresql() {
    echo -e "${YELLOW}[+] Setting up PostgreSQL...${NC}"
    
    service postgresql start 2>/dev/null || systemctl start postgresql 2>/dev/null || true
    
    if command -v msfdb &> /dev/null; then
        msfdb reinit 2>/dev/null || true
    fi
}

# Create sniper command symlink
create_symlink() {
    echo -e "${YELLOW}[+] Creating sniper command...${NC}"
    
    ln -sf "$INSTALL_DIR/sniper" /usr/local/bin/sniper
    chmod +x "$INSTALL_DIR/sniper"
}

# Print success message
print_success() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   Sn1per Platform Installed Successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Installation Directory: ${YELLOW}$INSTALL_DIR${NC}"
    echo ""
    echo -e "${BLUE}Quick Start:${NC}"
    echo ""
    echo "  1. Start the UI:"
    echo "     ${YELLOW}cd $INSTALL_DIR/ui/sniper-dashboard && npm run dev -- -p 3004${NC}"
    echo ""
    echo "  2. Or use the systemd service:"
    echo "     ${YELLOW}systemctl start sniper-ui${NC}"
    echo ""
    echo "  3. Access the web interface:"
    echo "     ${YELLOW}http://localhost:3004${NC}"
    echo ""
    echo "  4. Run sniper from command line:"
    echo "     ${YELLOW}sudo sniper -t example.com${NC}"
    echo ""
    echo -e "${BLUE}Docker Option:${NC}"
    echo ""
    echo "  ${YELLOW}docker-compose up -d${NC}"
    echo "  ${YELLOW}Access: http://localhost:3004${NC}"
    echo ""
}

# Main installation
main() {
    detect_os
    install_system_packages
    install_nodejs
    install_python_deps
    setup_directories
    fix_python_references
    setup_sudoers
    build_ui
    create_symlink
    setup_postgresql
    
    # Ask about systemd
    read -p "Install as systemd service? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_systemd
    fi
    
    print_success
}

main
