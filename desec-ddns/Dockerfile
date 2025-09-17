FROM alpine:latest

# Install curl and CA certificates
RUN apk add --no-cache curl ca-certificates

# Copy update script
COPY update-ddns.sh /usr/local/bin/update-ddns.sh
RUN chmod +x /usr/local/bin/update-ddns.sh

ENTRYPOINT ["/usr/local/bin/update-ddns.sh"]