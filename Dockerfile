# ---------- STAGE 1/3: deps ----------
FROM --platform=linux/amd64 node:20-bookworm-slim AS deps
ENV DEBIAN_FRONTEND=noninteractive NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts --no-audit --no-fund \
 && npx prisma generate \
 && npm cache clean --force 2>/dev/null || true

# ---------- STAGE 2/3: builder ----------
FROM --platform=linux/amd64 node:20-bookworm-slim AS builder
ENV DEBIAN_FRONTEND=noninteractive NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=4096
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .
RUN echo "=== [1/3 builder] Prisma regenerate client ===" \
 && npx prisma generate \
 && echo "=== [2/3 builder] Start next build ===" \
 && npm run build 2>&1 | tail -80 \
 && echo "=== [3/3 builder] Assemble standalone bundle (static + public + prisma) ===" \
 && test -d .next/standalone \
 && mkdir -p .next/standalone/.next \
 && cp -a .next/static .next/standalone/.next/static \
 && if [ -d public ]; then echo "→ Copy public folder" && cp -a public .next/standalone/public; else echo "→ Skip public (not found)"; fi \
 && if [ -d prisma ]; then echo "→ Copy prisma schema" && cp -a prisma .next/standalone/prisma; fi \
 && echo "=== Standalone final verification ===" \
 && ls -la .next/standalone | head -30 \
 && test -f .next/standalone/server.js \
 && test -d .next/standalone/.next/static

# ---------- STAGE 3/3: runner ----------
FROM --platform=linux/amd64 node:20-bookworm-slim AS runner
ENV DEBIAN_FRONTEND=noninteractive NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
RUN if [ -f /app/prisma/schema.prisma ]; then cd /app && npx prisma generate 2>&1 | tail -5 || true; fi
EXPOSE 3000
CMD ["node", "server.js"]
