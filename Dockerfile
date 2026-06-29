# Sona — Bun + Hono server. Single-stage; Bun runs TS directly (no build step).
FROM oven/bun:1
WORKDIR /app

# Install deps first for layer caching (bun.lock* tolerates either lock filename).
COPY package.json bun.lock* bun.lockb* ./
RUN bun install --production --frozen-lockfile

COPY . .

ENV PORT=8080
EXPOSE 8080
CMD ["bun", "src/index.ts"]
