# Backend (Node.js)
FROM node:18 AS server
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install
COPY server ./server

# Processor (Python)
FROM python:3.10-slim AS processor
WORKDIR /app
COPY processor/requirements.txt ./processor/
RUN pip install --no-cache-dir -r ./processor/requirements.txt
COPY processor ./processor

# Final image (for docker-compose, services use their own build context) 