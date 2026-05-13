# Sn1per Security Platform

Professional penetration testing framework with a modern web interface for comprehensive security assessments.

## Features

- **Web Application Pentesting**: Full assessment including vulnerability scanning, technology detection, SSL analysis
- **Network Pentesting**: Host discovery, port scanning, vulnerability detection
- **Real-time Output**: Terminal output streamed live to the web UI
- **Session Management**: Track all scans with full CRUD operations
- **Comprehensive Reports**: Generate detailed vulnerability reports

## Quick Start

### Step 1: Install Sniper

```bash
# Clone the repository
git clone https://github.com/1N3/Sn1per.git
cd Sn1per

# Run the setup script (installs all dependencies)
chmod +x setup.sh
sudo ./setup.sh
```

### Step 2: Configure Sudo (REQUIRED for Real Scans)

**Automatic method (recommended):**
```bash
chmod +x setup-sudo.sh
sudo ./setup-sudo.sh
```

**Manual method:**
```bash
# Quick one-liner
echo "$USER ALL=(ALL) NOPASSWD: /usr/share/sniper/sniper *" | sudo tee /etc/sudoers.d/sniper && sudo chmod 440 /etc/sudoers.d/sniper

# Or using visudo
sudo visudo
# Add this line (replace 'your_username'):
your_username ALL=(ALL) NOPASSWD: /usr/share/sniper/sniper *
```

### Step 3: Start the Web UI

```bash
cd /usr/share/sniper/ui/sniper-dashboard
npm run dev -- -p 3004

# Or use Docker
docker-compose up -d
```

**Access:** http://localhost:3004

## Sudo Configuration Details

Sniper requires root access for security tools (nmap, nikto, etc.). Without sudo configuration, scans will run in **Simulation Mode**.

### Verify Sudo is Working

```bash
# Should NOT ask for password
sudo -n /usr/share/sniper/sniper -h
```

### Remove Sudo Configuration

```bash
sudo rm /etc/sudoers.d/sniper
```

### Troubleshooting

If you see "sudo: a password is required":
1. Run `sudo ./setup-sudo.sh`
2. Log out and back in
3. Verify with `sudo -n /usr/share/sniper/sniper -h`
4. Or use **Debug/Simulation Mode** in the UI

## System Requirements

### Minimum
- **OS**: Ubuntu 20.04+, Debian 11+, Kali Linux 2023+, or similar
- **RAM**: 4GB
- **Disk**: 20GB
- **CPU**: 2 cores

### Recommended
- **OS**: Kali Linux 2024+
- **RAM**: 8GB+
- **Disk**: 50GB+
- **CPU**: 4+ cores

## Installed Tools

The setup automatically installs these security tools:

| Tool | Purpose |
|------|---------|
| nmap | Port scanning and service detection |
| nikto | Web server scanner |
| dirb/gobuster | Directory brute forcing |
| hydra/medusa | Password brute forcing |
| whatweb | Web technology fingerprinting |
| wpscan | WordPress scanner |
| metasploit-framework | Exploitation framework |
| nuclei | Vulnerability scanner |
| wafw00f | WAF detection |

## Usage

### Web Interface

1. Open `http://localhost:3004`
2. Choose **Web App Pentesting** or **Network Pentesting**
3. Enter target domain/IP
4. Select scan mode and start

### Command Line

```bash
# Basic web scan
sudo sniper -t example.com

# Normal mode (recon + vuln scanning)
sudo sniper -t example.com -m normal

# Stealth mode (passive)
sudo sniper -t example.com -m stealth

# Discovery mode (host discovery)
sudo sniper -t 192.168.1.0/24 -m discover

# Full port scan
sudo sniper -t example.com -m fullportonly

# Vulnerability scan
sudo sniper -t example.com -m vulnscan
```

## Scan Modes

| Mode | Description |
|------|-------------|
| normal | Full web application assessment |
| stealth | Passive reconnaissance only |
| discover | Network host discovery |
| web | Web-only scanning |
| webscan | Deep web vulnerability scan |
| fullportonly | Full TCP/UDP port scan |
| vulnscan | Vulnerability-focused scan |

## Configuration

### Sniper Configuration

Edit `/usr/share/sniper/sniper.conf`:

```bash
# API Keys (add your keys)
SHODAN_API_KEY="your_key_here"
CENSYS_APP_ID="your_id_here"
CENSYS_API_SECRET="your_secret_here"

# Enable/disable features
NUCLEI="1"
DIRSEARCH="1"
WAFWOOF="1"
# etc.
```

### UI Configuration

The UI settings are in `/usr/share/sniper/ui/sniper-dashboard/.env`:

```env
SNIPER_PATH=/usr/share/sniper/sniper
LOOT_PATH=/usr/share/sniper/loot
```

## Troubleshooting

### "sudo: a password is required"

Configure sudoers as shown above in the Sudo Configuration section.

### "python2: command not found"

The setup script fixes this, but if you see it:

```bash
# Fix all python2 references
sudo find /usr/share/sniper/modes -name "*.sh" -exec sed -i 's/python2 /python3 /g' {} \;
```

### "wafw00f: command not found"

```bash
pip3 install wafw00f --break-system-packages
```

### "npm: command not found"

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
```

### UI shows "Waiting for more output"

Check if sniper can run:

```bash
sudo -n /usr/share/sniper/sniper -h
```

If it asks for password, fix sudoers. Otherwise, enable **Debug/Simulation Mode** in the UI.

## Project Structure

```
Sn1per/
├── sniper              # Main scanner script
├── modes/              # Scan mode implementations
├── templates/          # Vulnerability detection templates
├── bin/                # Helper scripts
├── wordlists/          # Wordlists for brute forcing
├── conf/               # Configuration files
├── loot/               # Scan results (mounted volume)
├── ui/
│   └── sniper-dashboard/   # Next.js web UI
│       ├── src/
│       │   ├── app/        # Pages and API routes
│       │   ├── components/ # React components
│       │   └── types/      # TypeScript definitions
│       └── package.json
├── Dockerfile          # Docker image definition
├── docker-compose.yml  # Docker orchestration
├── requirements.txt    # Python dependencies
├── setup.sh           # Universal setup script
└── README.md          # This file
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan` | POST | Start a new scan (SSE streaming) |
| `/api/workspace` | GET | Get workspace data |
| `/api/workspace` | GET ?workspace=X | Get specific workspace |
| `/api/sessions` | GET ?action=list | List all scan sessions |
| `/api/sessions` | POST action=create | Create new session |
| `/api/sessions` | DELETE ?id=X | Delete session |
| `/api/screenshot` | GET ?workspace=X&filename=Y | Get screenshot |

## Security Notes

- Never run scans against targets you don't own or have permission to test
- The platform requires root/sudo access for security tools
- API keys are stored in plaintext - protect your configuration
- Session data is stored in `/tmp/sniper-sessions.json`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

GNU General Public License v3.0

## Support

- Issues: https://github.com/1N3/Sn1per/issues
- Documentation: https://github.com/1N3/Sn1per/wiki
- Twitter: @xer0dayz

---

Made with by the Sn1per Security Team
