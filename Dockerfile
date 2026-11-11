# Build the Vite client from the project/ subfolder, then serve the static
# build with a tiny Node server that supports SPA routes (/browse, /dashboard...).
FROM node:26-alpine AS build
RUN apk upgrade --no-cache
WORKDIR /app
COPY project/package*.json ./
RUN npm install
COPY project/ ./
RUN npm run build

FROM node:26-alpine
# The date keys the build cache so this layer installs today's OS fixes; AppJet keeps it current on deploy.
RUN echo "os-refresh 2026-11-11" && apk upgrade --no-cache
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./public
COPY --from=build /app/server.mjs ./server.mjs
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.mjs"]
