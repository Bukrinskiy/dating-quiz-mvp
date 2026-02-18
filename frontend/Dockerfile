FROM node:22-alpine AS build

WORKDIR /app

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
