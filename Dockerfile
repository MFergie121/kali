# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Copy only what's needed to run
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Also ship the MCP server. It runs via tsx (a production dependency) straight
# from TypeScript source — no separate build step — and imports a few pure modules
# from src/lib, so both directories are copied. The web service ignores them; the
# MCP Cloud Run service overrides the start command (see cloudbuild.yaml).
COPY --from=builder /app/mcp ./mcp
COPY --from=builder /app/src ./src

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Default command runs the SvelteKit web app. The MCP service overrides this with
# `--command`/`--args` in cloudbuild.yaml to run `npm run mcp:start`.
CMD ["node", "build"]
