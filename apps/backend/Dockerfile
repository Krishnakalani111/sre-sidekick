# Backend image. Build context = repo root (it's a pnpm workspace app that
# imports @sre/* source packages and runs via tsx).
#   docker build -f apps/backend/Dockerfile -t sre-backend .
FROM node:20-slim
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
WORKDIR /repo

# Copy the whole workspace (so the lockfile validates), then install ONLY the
# backend + its workspace deps — not the frontend/slack-bot.
COPY . .
RUN pnpm install --frozen-lockfile --filter "@sre/backend..."

ENV BACKEND_PORT=3000
EXPOSE 3000
# tsx runs the TS source directly; @sre/* packages resolve from the workspace.
CMD ["pnpm", "--filter", "@sre/backend", "start"]
