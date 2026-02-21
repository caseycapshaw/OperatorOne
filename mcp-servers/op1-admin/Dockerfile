FROM node:20-alpine

# Install docker CLI for container management and wget for healthchecks
RUN apk add --no-cache docker-cli curl wget

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy source
COPY src/ ./src/

# Create non-root user and logs directory
RUN addgroup -S op1admin && adduser -S op1admin -G op1admin \
    && mkdir -p /var/log/op1-admin \
    && chown -R op1admin:op1admin /var/log/op1-admin /app

# Expose HTTP API port for approval callbacks
EXPOSE 3000

# Run as non-root user
# Docker socket access requires adding the host's docker GID at runtime:
#   docker run --group-add $(stat -c '%g' /var/run/docker.sock) ...
# Or in compose: group_add: ["${DOCKER_GID:-999}"]
USER op1admin

CMD ["node", "src/index.js"]
