FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY modrinth ./modrinth
RUN pnpm install --frozen-lockfile

COPY website ./website

RUN pnpm website:build

FROM caddy:alpine

COPY website/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/website/.vitepress/dist/ /srv/
