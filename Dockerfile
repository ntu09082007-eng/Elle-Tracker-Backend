# --- GIAI ĐOẠN 1: BUILD ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files để tận dụng cache của Docker
COPY package*.json ./

# Cài đặt TẤT CẢ dependencies để build (bao gồm cả devDependencies như nest cli, typescript)
RUN npm install

# Copy toàn bộ code vào
COPY . .

# Build dự án (lệnh này sẽ tự gọi nest build hoặc tsc tùy package.json của bà)
RUN npm run build

# --- GIAI ĐOẠN 2: RUN ---
FROM node:20-alpine

WORKDIR /app

# Cài dumb-init để quản lý tiến trình tốt hơn trên Render/Docker
RUN apk add --no-cache dumb-init

# Chỉ copy những thứ cần thiết từ stage builder sang để giảm dung lượng ảnh
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Mở port 3000
EXPOSE 3000

# Dùng dumb-init để chạy cho ổn định
ENTRYPOINT ["dumb-init", "--"]

# Chạy file main trong thư mục dist
CMD ["node", "dist/main"]COPY package*.json ./

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
