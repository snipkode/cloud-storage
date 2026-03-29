# Build stage for client
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy package files
COPY client/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy client source
COPY client/ ./

# Build the client
RUN npm run build

# Production stage for server
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY server/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy server source
COPY server/ ./

# Copy built client from builder stage
COPY --from=client-builder /app/client/dist ./public

# Create uploads directory
RUN mkdir -p /app/uploads && chmod 755 /app/uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start server
CMD ["node", "server.js"]
