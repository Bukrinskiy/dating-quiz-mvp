FROM node:22-alpine AS build

WORKDIR /app

ARG APP_SURFACE=app
ARG API_BASE_URL=https://api.flirto.guru
ARG PAY_PUBLIC_BASE_URL=https://pay.flirto.guru
ARG APP_PUBLIC_BASE_URL=https://app.flirto.guru

ENV APP_SURFACE=${APP_SURFACE}
ENV API_BASE_URL=${API_BASE_URL}
ENV PAY_PUBLIC_BASE_URL=${PAY_PUBLIC_BASE_URL}
ENV APP_PUBLIC_BASE_URL=${APP_PUBLIC_BASE_URL}

COPY frontend-app/package.json ./package.json
COPY frontend-app/tsconfig.json ./tsconfig.json
COPY frontend-app/tsconfig.app.json ./tsconfig.app.json
COPY frontend-app/tsconfig.node.json ./tsconfig.node.json
COPY frontend-app/eslint.config.js ./eslint.config.js
COPY frontend-app/vite.config.ts ./vite.config.ts
COPY frontend-app/index.html ./index.html
COPY frontend-app/src ./src
COPY frontend-app/public ./public

RUN corepack enable && pnpm install --no-frozen-lockfile && pnpm build

FROM nginx:1.29-alpine

COPY frontend-app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend-app/runtime-config.js.template /usr/share/nginx/html/runtime-config.js.template
COPY frontend-app/docker-entrypoint/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh

RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh
