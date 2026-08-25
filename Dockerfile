# ---------- STAGE 1/3: deps ----------
FROM --platform=linux/amd64 node:20-bookworm-slim AS deps
ENV DEBIAN_FRONTEND=noninteractive NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts --no-audit --no-fund \
 && npx prisma generate \
 && npm cache clean --force 2>/dev/null || true

# ---------- STAGE 2/3: builder ----------
FROM --platform=linux/amd64 node:20-bookworm-slim AS builder
ENV DEBIAN_FRONTEND=noninteractive NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=4096
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .
RUN echo "=== [1/2 builder] Prisma regenerate client ===" \
 && npx prisma generate \
 && echo "=== [2/2 builder] Start next build ===" \
 && npm run build 2>&1 | tail -80 \
 && echo "=== Standalone verification ===" \
 && ls -la .next/standalone | head -30 \
 && test -f .next/standalone/server.js

# ---------- STAGE 3/3: runner ----------
FROM --platform=linux/amd64 node:20-bookworm-slim AS runner
ENV DEBIAN_FRONTEND=noninteractive NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public 2>/dev/null || true
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate 2>/dev/null || true
EXPOSE 3000
CMD ["node", "server.js"]
