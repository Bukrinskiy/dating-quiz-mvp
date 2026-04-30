FROM node:22-alpine AS build

WORKDIR /app

COPY frontend-site/package.json ./package.json
COPY frontend-site/tsconfig.json ./tsconfig.json
COPY frontend-site/tsconfig.app.json ./tsconfig.app.json
COPY frontend-site/tsconfig.node.json ./tsconfig.node.json
COPY frontend-site/eslint.config.js ./eslint.config.js
COPY frontend-site/vite.config.ts ./vite.config.ts
COPY frontend-site/index.html ./index.html
COPY frontend-site/src ./src
COPY frontend-site/public ./public

RUN corepack enable && pnpm install --no-frozen-lockfile && pnpm build

FROM nginx:1.29-alpine

COPY frontend-site/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend-site/runtime-config.js.template /usr/share/nginx/html/runtime-config.js.template
COPY frontend-site/docker-entrypoint/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh

RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh
