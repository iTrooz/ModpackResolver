# Context is ..
FROM oven/bun:1-debian AS BASE
WORKDIR /src
COPY package.json bun.lock ./
COPY backend/package.json backend/package.json
COPY mclib/package.json mclib/package.json
COPY cli/package.json cli/package.json
COPY web/package.json web/package.json

# mclib build stage
FROM base AS build

# Install deps
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --filter=backend

# Build mclib
COPY mclib/src mclib/src
COPY mclib/tsconfig.json mclib/tsconfig.json
RUN cd /src/mclib && bun run build

# Runtime stage
FROM base AS runtime
WORKDIR /src

# Install production deps only
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --filter=backend

# Copy backend source and built mclib
COPY backend/src backend/src
COPY --from=build /src/mclib/dist mclib/dist

# Run project
WORKDIR /src/backend
EXPOSE 3000
USER bun
CMD ["bun", "run", "start:prod"]
