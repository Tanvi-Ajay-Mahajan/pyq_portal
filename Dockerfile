# --- Stage 1: build the React/Vite client and install server dependencies ---
FROM node:26-alpine AS build
RUN apk upgrade --no-cache
WORKDIR /app

# Client: dev dependencies are required to run `vite build`.
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Server: production dependencies only.
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY server/ ./server/

# --- Stage 2: runtime image serving the API + built client on one port ---
FROM node:26-alpine
# The date keys the build cache so this layer installs today's OS fixes; AppJet keeps it current on deploy.
RUN echo "os-refresh 2026-11-11" && apk upgrade --no-cache
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# server/server.js serves client/dist when it exists, so one container serves both.
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/server ./server

EXPOSE 3000
CMD ["node", "server/server.js"]
