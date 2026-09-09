# Jeden image = API + sestavený frontend. Aplikace tak jede z jednoho
# kontejneru a jednoho původu, takže odpadá CORS i druhá služba v compose.

# 1. Build: instalace celého workspace a sestavení obou aplikací
FROM node:24-alpine AS builder
WORKDIR /app

# Nejdřív jen manifesty — instalace se pak cachuje, dokud se nezmění závislosti.
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY . .

# Testy enginu jsou bránou už v CI; tady jde jen o artefakty.
RUN npm run build --workspace @fof/web \
 && npm run build --workspace @fof/api

# 2. Runtime: jen produkční závislosti a hotové artefakty
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev && npm cache clean --force

# Engine je zabundlovaný přímo v server.js, samostatně ho runtime nepotřebuje.
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/web/dist ./public

# Stav světa leží na svazku; adresář musí patřit uživateli, pod kterým běžíme.
RUN mkdir -p /app/data && chown -R node:node /app
USER node

ENV HOST=0.0.0.0 \
    PORT=3000 \
    FOF_STATIC_DIR=/app/public \
    FOF_DATA_FILE=/app/data/world.json

EXPOSE 3000
CMD ["node", "dist/server.js"]
