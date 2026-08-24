# ---- Stage 1: deps + build ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/receiver/package.json ./apps/receiver/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/worker ./apps/worker

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/worker

# ---- Stage 2: production runtime ----
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci --omit=dev --workspace=apps/worker --workspace=packages/shared

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

# no EXPOSE — worker has no HTTP server (kept alive by channel.consume(),not app.listen())

CMD ["node", "apps/worker/dist/server.js"]