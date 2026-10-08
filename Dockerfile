FROM node:20-alpine

WORKDIR /app

# Install dependencies needed for runtime
RUN apk add --no-cache libc6-compat

# Copy package manifests
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy application source code
COPY . .

# Build frontend production bundle
RUN npm run build

# Expose Web & WebSocket port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start unified server
CMD ["node", "dist/server.js"]
