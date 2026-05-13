FROM kalilinux/kali-rolling:latest

LABEL org.label-schema.name='Sn1per Security Platform' \
    org.label-schema.description='Automated pentest framework with Web UI' \
    org.label-schema.usage='https://github.com/1N3/Sn1per' \
    org.label-schema.url='https://github.com/1N3/Sn1per' \
    org.label-schema.vendor='https://sn1persecurity.com' \
    MAINTAINER="@xer0dayz"

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_VERSION=20
ENV INSTALL_DIR=/usr/share/sniper
ENV HOME=/root

# Update and install core dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    bash \
    sudo \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    jq \
    xmlstarlet \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

# Create sniper user with sudo access
RUN useradd -m -s /bin/bash sniper \
    && echo "sniper:sniper" | chpasswd \
    && usermod -aG sudo sniper \
    && echo "sniper ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# Create directories
RUN mkdir -p ${INSTALL_DIR} \
    ${INSTALL_DIR}/loot/workspace \
    ${INSTALL_DIR}/loot/output \
    ${INSTALL_DIR}/loot/screenshots \
    ${INSTALL_DIR}/loot/logs \
    /tmp/sniper-sessions

# Copy sniper files
COPY . ${INSTALL_DIR}/

# Install Python dependencies
RUN pip3 install --break-system-packages \
    wafw00f \
    requests \
    beautifulsoup4 \
    lxml \
    selenium \
    PyYAML \
    colorama \
    python-nmap \
    shodan \
    censys \
    virustotal-python

# Install sniper dependencies
RUN cd ${INSTALL_DIR} && ./install.sh --docker || true

# Update sniper config for Docker
RUN sed -i 's|INSTALL_DIR=.*|INSTALL_DIR="/usr/share/sniper"|g' ${INSTALL_DIR}/sniper.conf

# Fix python2 to python3 in all scripts
RUN find ${INSTALL_DIR}/modes -name "*.sh" -exec sed -i 's/python2 /python3 /g' {} \;

# Build and setup the UI
WORKDIR ${INSTALL_DIR}/ui/sniper-dashboard
RUN npm install && npm run build

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Start PostgreSQL for Metasploit\n\
service postgresql start 2>/dev/null || true\n\
msfdb reinit 2>/dev/null || true\n\
\n\
# Start the Sniper UI on port 3004\n\
cd /usr/share/sniper/ui/sniper-dashboard\n\
npm run start &\n\
\n\
# Keep container running\n\
tail -f /dev/null\n\
' > /entrypoint.sh && chmod +x /entrypoint.sh

# Expose ports
EXPOSE 3004

# Set working directory
WORKDIR ${INSTALL_DIR}

# Entry point
ENTRYPOINT ["/entrypoint.sh"]
CMD ["bash"]
