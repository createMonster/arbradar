# Use Node.js 20 alpine for better performance and security
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dumb-init early for consistent signal handling
RUN apk add --no-cache dumb-init

# Copy package files for better layer caching
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm@latest
RUN pnpm install --frozen-lockfile

# Copy source code and build configuration
COPY src ./src
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY .env.example ./

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-alpine AS production

# Install dependencies for runtime
RUN apk add --no-cache \
    dumb-init \
    tini \
    ca-certificates \
    && apk upgrade --no-cache \
    && rm -rf /var/cache/apk/*

# Create app user with specific UID/GID for consistency
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 -G nodejs

# Set working directory and create necessary directories
WORKDIR /app
RUN mkdir -p logs tmp && chown -R nodejs:nodejs /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and production dependencies only
RUN npm install -g pnpm@latest
RUN pnpm install --frozen-lockfile --prod --ignore-scripts \
    && pnpm store prune \
    && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/.env.example ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV LOG_LEVEL=info

# Create non-root user directories
RUN chown -R nodejs:nodejs /app

# Switch to nodejs user for security
USER nodejs

# Expose port (use ARG for flexibility)
ARG PORT=3001
EXPOSE $PORT

# Add labels for better maintainability
LABEL \
    org.opencontainers.image.title="ArbradarBackend" \
    org.opencontainers.image.description="Crypto Arbitrage Monitoring Backend" \
    org.opencontainers.image.version="1.0.0" \
    org.opencontainers.image.authors="ArbradarTeam"

# Enhanced health check with static parameters (Docker doesn't support env vars in HEALTHCHECK)
HEALTHCHECK --interval=30s \
            --timeout=5s \
            --start-period=10s \
            --retries=3 \
    CMD node -e "require('http').get({ \
        hostname: 'localhost', \
        port: process.env.PORT || 3001, \
        path: '/api/health', \
        timeout: 3000 \
    }, (res) => { \
        process.exit(res.statusCode === 200 ? 0 : 1); \
    }).on('error', () => process.exit(1))"

# Use tini for proper signal handling and process management
ENTRYPOINT ["tini", "--"]

# Start the application with proper signal handling
CMD ["node", "dist/index.js"] 