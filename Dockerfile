# ==============================================
# AI Code Optimizer — Multi-stage Dockerfile
# ==============================================

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci --prefer-offline
COPY client/ ./
RUN npm run build

# Stage 2: Python backend + serve frontend
FROM python:3.12-slim AS production
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libffi-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY server/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY server/ ./server/

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/client/dist ./server/static

# Create uploads directory
RUN mkdir -p ./server/uploads/avatars

# Set defaults
ENV APP_ENV=production
ENV BACKEND_PORT=8001
ENV CORS_ORIGINS=http://localhost:5173
ENV ALLOW_FAKE_AI=0

EXPOSE 8001

WORKDIR /app/server
CMD ["python", "main.py"]
