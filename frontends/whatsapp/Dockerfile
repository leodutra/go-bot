FROM oven/bun:slim

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        chromium \
        git \
        && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

COPY . .

RUN --mount=type=ssh bun install --production --frozen-lockfile
