# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /build
COPY package*.json ./
RUN npm ci --omit=dev
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# ── Stage 2: Playwright + runtime ────────────────────────────────────────────
FROM mcr.microsoft.com/playwright:v1.43.0-jammy AS runner

# Non-root user
RUN useradd -m -u 1001 -s /bin/bash midas

WORKDIR /app

# Copy compiled output + production deps only
COPY --from=builder /build/dist         ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY package.json ecosystem.config.js   ./

# Runtime dirs (owned by midas user)
RUN mkdir -p screenshots/KSA screenshots/Qatar screenshots/Kuwait \
             reports logs data && \
    chown -R midas:midas /app

USER midas

# Health check — process alive + logs written in last 12h
HEALTHCHECK --interval=60s --timeout=10s --start-period=120s \
  CMD node -e "\
    const fs=require('fs');\
    const f='./logs/combined.log';\
    if(!fs.existsSync(f)) process.exit(1);\
    const age=(Date.now()-fs.statSync(f).mtimeMs)/3600000;\
    process.exit(age>24?1:0);"

# Default: run daemon (peak-hour scheduler)
CMD ["node", "dist/index.js"]
