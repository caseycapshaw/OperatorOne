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

# Create logs directory
RUN mkdir -p /var/log/op1-admin

# Expose HTTP API port for approval callbacks
EXPOSE 3000

# Run as non-root (but needs docker group access)
# In production, configure docker socket permissions appropriately

CMD ["node", "src/index.js"]
