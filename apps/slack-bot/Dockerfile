# Slack bot image. Standalone (CommonJS, @slack/bolt, Socket Mode — no inbound port).
# Build context = apps/slack-bot.
#   docker build -t sre-slack-bot apps/slack-bot
FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src
CMD ["node", "src/app.js"]
