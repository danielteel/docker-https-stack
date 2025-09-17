#!/bin/sh
set -e

# Function to update IP
update_ip() {
    IP=$(curl -fs https://api.ipify.org || curl -fs https://checkip.amazonaws.com)
    if [ -n "$IP" ]; then
        echo "Updating DeSEC DNS to $IP"
    else
        echo "Failed to retrieve public IP"
    fi
    curl --user "$DESEC_DOMAIN:$DESEC_TOKEN" "https://update.dedyn.io/"
}

# Update immediately on startup
update_ip

# Loop: update every 5 minutes
while true; do
    sleep 300
    update_ip
done