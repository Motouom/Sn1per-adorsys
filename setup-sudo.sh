#!/bin/bash

# Sn1per Sudo Setup Script
# Configures passwordless sudo for sniper to enable real scans

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SNIPER_PATH="/usr/share/sniper/sniper"
SUDOERS_FILE="/etc/sudoers.d/sniper"

echo -e "${RED}══════════════════════════════════════════════════════════════${NC}"
echo -e "${RED}  Sn1per Sudo Configuration Setup${NC}"
echo -e "${RED}══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}This script requires sudo access.${NC}"
    echo "Re-running with sudo..."
    exec sudo "$0" "$@"
fi

CURRENT_USER="${SUDO_USER:-$USER}"

echo -e "${GREEN}[+] Configuring passwordless sudo for user: $CURRENT_USER${NC}"
echo ""

if [ ! -f "$SNIPER_PATH" ]; then
    echo -e "${YELLOW}[!] Warning: $SNIPER_PATH not found${NC}"
    echo "    Sniper may not be installed yet. Run setup.sh first."
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}[+] Creating sudoers entry...${NC}"

SUDOERS_ENTRY="$CURRENT_USER ALL=(ALL) NOPASSWD: $SNIPER_PATH *"

echo "$SUDOERS_ENTRY" > "$SUDOERS_FILE"
chmod 440 "$SUDOERS_FILE"

echo -e "${GREEN}[+] Validating sudoers configuration...${NC}"

if visudo -c -f "$SUDOERS_FILE" > /dev/null 2>&1; then
    echo -e "${GREEN}[+] Sudoers configuration is valid!${NC}"
else
    echo -e "${RED}[!] Error: Invalid sudoers configuration${NC}"
    rm -f "$SUDOERS_FILE"
    exit 1
fi

echo ""
echo -e "${GREEN}[+] Testing sniper access...${NC}"

if sudo -u "$CURRENT_USER" sudo -n "$SNIPER_PATH" -h > /dev/null 2>&1; then
    echo -e "${GREEN}[+] Success! Sniper can now run without password.${NC}"
else
    echo -e "${YELLOW}[!] Note: You may need to log out and back in for changes to take effect.${NC}"
fi

echo ""
echo -e "${RED}══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Configuration complete!${NC}"
echo ""
echo "You can now run scans from the web UI without entering a password."
echo ""
echo "To verify, run:"
echo "  sudo -n $SNIPER_PATH -h"
echo ""
echo "To remove this configuration:"
echo "  sudo rm $SUDOERS_FILE"
echo -e "${RED}══════════════════════════════════════════════════════════════${NC}"
