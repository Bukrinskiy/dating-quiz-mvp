FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_MOBI_SLON_URL=https://mobi-slon.com/index.php
ARG VITE_MOBI_SLON_CAMPAIGN_KEY=
ARG VITE_FB_PIXEL_ID=
ARG VITE_TRACKING_DEBUG=false

ENV VITE_MOBI_SLON_URL=${VITE_MOBI_SLON_URL}
ENV VITE_MOBI_SLON_CAMPAIGN_KEY=${VITE_MOBI_SLON_CAMPAIGN_KEY}
ENV VITE_FB_PIXEL_ID=${VITE_FB_PIXEL_ID}
ENV VITE_TRACKING_DEBUG=${VITE_TRACKING_DEBUG}

COPY frontend/package.json ./package.json
COPY frontend/pnpm-lock.yaml ./pnpm-lock.yaml
COPY frontend/tsconfig.json ./tsconfig.json
COPY frontend/tsconfig.app.json ./tsconfig.app.json
COPY frontend/tsconfig.node.json ./tsconfig.node.json
COPY frontend/vite.config.ts ./vite.config.ts
COPY frontend/index.html ./index.html
COPY frontend/src ./src
COPY frontend/public ./public

RUN corepack enable && pnpm install --frozen-lockfile && pnpm build

FROM nginx:1.29-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/runtime-config.js.template /usr/share/nginx/html/runtime-config.js.template
COPY frontend/docker-entrypoint/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh

RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh
