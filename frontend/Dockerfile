# syntax=docker/dockerfile:1

# ─── Stage 1: Build React ─────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

# --mount=type=cache persists the npm download cache between builds.
# If npm ci fails partway, already-downloaded packages are cached for the retry.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .

# Empty string means the frontend uses relative URLs — nginx proxies to the API.
ENV VITE_API_URL=""

RUN npm run build


# ─── Stage 2: Serve via nginx ────────────────────────────────────────────────
FROM nginxinc/nginx-unprivileged:stable-alpine

USER root
RUN apk upgrade --no-cache
USER 101

COPY --chown=101:101 nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=15s \
    --timeout=4s \
    --start-period=10s \
    --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
