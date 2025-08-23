# Context is ..
FROM oven/bun:1-debian AS base
WORKDIR /src

# Install tc for traffic control
RUN apt-get update && apt-get install -y iproute2 && rm -rf /var/lib/apt/lists/*

# Install deps
COPY package.json bun.lock ./
COPY backend/package.json backend/package.json
COPY mclib/package.json mclib/package.json
COPY cli/package.json cli/package.json
COPY web/package.json web/package.json
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --filter=backend

# Copy project
COPY backend/ backend/
COPY mclib/ mclib/

# Run project
WORKDIR /src/backend
ENV NODE_ENV=production
EXPOSE 3000
USER bun

CMD ["bun", "run", "start:prod"]
