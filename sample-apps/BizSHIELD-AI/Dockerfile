# Production Dockerfile for BizShield AI Web Dashboard
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy remaining source code
COPY . .

# Expose server port (default 3000)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Start Express server
CMD ["npm", "start"]
