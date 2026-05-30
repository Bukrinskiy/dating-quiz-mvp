FROM node:22-alpine AS build

WORKDIR /app

ARG APP_SURFACE=landing
ARG API_BASE_URL=
ARG PAY_PUBLIC_BASE_URL=
ARG VITE_MOBI_SLON_URL=
ARG VITE_MOBI_SLON_CAMPAIGN_KEY_FACEBOOK=
ARG VITE_MOBI_SLON_CAMPAIGN_KEY_GOOGLE=
ARG VITE_GOOGLE_ADS_ID=
ARG VITE_FB_PIXEL_ID=
ARG VITE_YANDEX_METRIKA_ID=
ARG VITE_TRACKING_DEBUG=false

ENV APP_SURFACE=${APP_SURFACE}
ENV API_BASE_URL=${API_BASE_URL}
ENV PAY_PUBLIC_BASE_URL=${PAY_PUBLIC_BASE_URL}
ENV VITE_MOBI_SLON_URL=${VITE_MOBI_SLON_URL}
ENV VITE_MOBI_SLON_CAMPAIGN_KEY_FACEBOOK=${VITE_MOBI_SLON_CAMPAIGN_KEY_FACEBOOK}
ENV VITE_MOBI_SLON_CAMPAIGN_KEY_GOOGLE=${VITE_MOBI_SLON_CAMPAIGN_KEY_GOOGLE}
ENV VITE_GOOGLE_ADS_ID=${VITE_GOOGLE_ADS_ID}
ENV VITE_FB_PIXEL_ID=${VITE_FB_PIXEL_ID}
ENV VITE_YANDEX_METRIKA_ID=${VITE_YANDEX_METRIKA_ID}
ENV VITE_TRACKING_DEBUG=${VITE_TRACKING_DEBUG}

COPY frontend-landing/package.json ./package.json
COPY frontend-landing/tsconfig.json ./tsconfig.json
COPY frontend-landing/tsconfig.app.json ./tsconfig.app.json
COPY frontend-landing/tsconfig.node.json ./tsconfig.node.json
COPY frontend-landing/eslint.config.js ./eslint.config.js
COPY frontend-landing/vite.config.ts ./vite.config.ts
COPY frontend-landing/index.html ./index.html
COPY frontend-landing/src ./src
COPY frontend-landing/public ./public
COPY shared /shared

RUN corepack enable && pnpm install --no-frozen-lockfile && pnpm build

FROM nginx:1.29-alpine

COPY frontend-landing/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend-landing/runtime-config.js.template /usr/share/nginx/html/runtime-config.js.template
COPY frontend-landing/docker-entrypoint/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh

RUN cp /usr/share/nginx/html/index.html /usr/share/nginx/html/index.html.template && \
    chmod +x /docker-entrypoint.d/40-runtime-config.sh
