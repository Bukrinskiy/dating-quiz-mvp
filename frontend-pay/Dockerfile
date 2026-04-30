FROM node:22-alpine AS build

WORKDIR /app

ARG APP_SURFACE=pay
ARG API_BASE_URL=https://api.flirto.guru
ARG PAY_PUBLIC_BASE_URL=https://pay.flirto.guru
ARG VITE_YANDEX_METRIKA_ID=
ARG VITE_TRACKING_DEBUG=false

ENV APP_SURFACE=${APP_SURFACE}
ENV API_BASE_URL=${API_BASE_URL}
ENV PAY_PUBLIC_BASE_URL=${PAY_PUBLIC_BASE_URL}
ENV VITE_YANDEX_METRIKA_ID=${VITE_YANDEX_METRIKA_ID}
ENV VITE_TRACKING_DEBUG=${VITE_TRACKING_DEBUG}

COPY frontend-pay/package.json ./package.json
COPY frontend-pay/tsconfig.json ./tsconfig.json
COPY frontend-pay/tsconfig.app.json ./tsconfig.app.json
COPY frontend-pay/tsconfig.node.json ./tsconfig.node.json
COPY frontend-pay/eslint.config.js ./eslint.config.js
COPY frontend-pay/vite.config.ts ./vite.config.ts
COPY frontend-pay/index.html ./index.html
COPY frontend-pay/src ./src
COPY frontend-pay/public ./public

RUN corepack enable && pnpm install --no-frozen-lockfile && pnpm build

FROM nginx:1.29-alpine

COPY frontend-pay/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend-pay/runtime-config.js.template /usr/share/nginx/html/runtime-config.js.template
COPY frontend-pay/docker-entrypoint/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh

RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh
