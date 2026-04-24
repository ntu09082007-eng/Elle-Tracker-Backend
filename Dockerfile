# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

RUN rm -f tsconfig.build.tsbuildinfo && \
    rm -rf dist && \
    npx tsc -p tsconfig.build.json && \
    ls -la dist

# Build application
RUN npx tsc -p tsconfig.build.json

RUN echo "=== KIỂM TRA THƯ MỤC GỐC ===" && ls -la
RUN echo "=== KIỂM TRA THƯ MỤC DIST (NẾU CÓ) ===" && ls -la dist || echo "Khong tim thay thu muc dist"
# ------------------------------

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built application
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main.js"]
