# ========================================
# Stage 1: Base dependencies
# ========================================
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm@9.0.0

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# ========================================
# Stage 2: Dependencies installer
# ========================================
FROM base AS deps

# Copy all package.json files from the monorepo
COPY packages/db/package.json ./packages/db/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/jobnimbus-sdk/package.json ./packages/jobnimbus-sdk/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
COPY apps/core-api/package.json ./apps/core-api/

# Install dependencies for core-api and its workspace deps
RUN pnpm install --frozen-lockfile --filter @greenenergy/core-api...

# ========================================
# Stage 3: Builder
# ========================================
FROM base AS builder

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/core-api/node_modules ./apps/core-api/node_modules

# Copy root tsconfig files for path mappings
COPY tsconfig*.json ./

# Copy turbo.json for build orchestration
COPY turbo.json ./

# Copy source code
COPY packages/ ./packages/
COPY apps/core-api/ ./apps/core-api/

# Generate Prisma client
WORKDIR /app/packages/db
RUN pnpm prisma generate

# Build from monorepo root with workspace awareness
WORKDIR /app
RUN pnpm build --filter @greenenergy/core-api...

# ========================================
# Stage 4: Production runner
# ========================================
FROM node:20-alpine AS runner

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Create app user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder --chown=nestjs:nodejs /app/apps/core-api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/core-api/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages

# Switch to non-root user
USER nestjs

# Expose port (Railway will override this with PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start the app
CMD ["node", "dist/main.js"]
