import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDB, disconnectDB, isDbConnected } from './config/db.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../client/dist');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    cors({
      origin: env.CLIENT_ORIGINS.length > 0 ? env.CLIENT_ORIGINS : true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', apiRoutes);

  // Serve the built React client when it exists (production/single-service mode).
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.type('text/plain').send(
        'PYQ Portal API is running. Build the client with `npm --prefix client run build`, or use the Vite dev server for the UI.'
      );
    });
  }

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function start() {
  const { connected } = await connectDB();

  if (connected && process.env.SEED_ON_START === 'true') {
    try {
      const { seedDatabase } = await import('./scripts/seed.js');
      const result = await seedDatabase();
      if (result.inserted > 0) {
        console.log(`[seed] Inserted ${result.inserted} new records on startup`);
      }
    } catch (error) {
      console.error(`[seed] Startup seeding failed: ${error.message}`);
    }
  }

  const app = createApp();
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`[server] PYQ Portal API listening on http://0.0.0.0:${env.PORT}`);
    if (!isDbConnected()) {
      console.warn('[server] Running without a database connection — set MONGODB_URI to enable the API.');
    }
  });

  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  start().catch((error) => {
    console.error('[server] Failed to start:', error);
    process.exit(1);
  });
}

export default createApp;
