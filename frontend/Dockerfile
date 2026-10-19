# DEVELOPMENT image only (React dev server with hot reload, code is bind-mounted by docker-compose.yml).
# The production image is Dockerfile.prod.
FROM node:22.23.3-alpine

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy project files (see .dockerignore for what is left out)
COPY . .

EXPOSE 3000

# Use polling for hot reload in Docker on Windows
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

CMD ["npm", "start"]
