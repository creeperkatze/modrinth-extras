FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json ./
COPY website/package.json website/pnpm-lock.yaml website/pnpm-workspace.yaml ./website/
RUN cd website && pnpm install --frozen-lockfile

COPY website ./website

RUN cd website && pnpm build

FROM caddy:alpine

COPY website/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/website/.vitepress/dist/ /srv/
