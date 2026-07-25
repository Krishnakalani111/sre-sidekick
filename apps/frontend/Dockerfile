# Dashboard UI — build the Vite app, serve the static bundle with nginx.
#   docker build -t sre-frontend apps/frontend
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
# Backend URL for the browser to call. Vite inlines VITE_* at build time, so
# this must be a build arg — setting it on the container at runtime does
# nothing. It is a HOST-visible URL (the browser resolves it, not the
# container), hence localhost:3000 rather than the compose service name.
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
