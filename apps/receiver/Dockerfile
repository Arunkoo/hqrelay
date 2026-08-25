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
COPY apps/receiver ./apps/receiver


RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/receiver

# ---- Stage 2: production runtime ----
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production


COPY package.json package-lock.json ./
COPY apps/receiver/package.json ./apps/receiver/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# prod-only deps — no typescript, no ts-node-dev in final image
RUN npm ci --omit=dev --workspace=apps/receiver --workspace=packages/shared

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/receiver/dist ./apps/receiver/dist

EXPOSE 3000
CMD ["node", "apps/receiver/dist/server.js"]