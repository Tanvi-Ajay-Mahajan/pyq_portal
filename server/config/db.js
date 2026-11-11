import mongoose from 'mongoose';
import { env, isDbConfigured } from './env.js';

let connected = false;

export async function connectDB(uri = env.MONGODB_URI) {
  if (!uri) {
    console.warn(
      '[db] MONGODB_URI is not set. The API will respond with 503 until a MongoDB connection string is configured.'
    );
    return { connected: false };
  }

  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri, {
      dbName: env.MONGODB_DB_NAME,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
    connected = true;
    const { name, host } = mongoose.connection;
    console.log(`[db] MongoDB connected (db: ${name}, host: ${host})`);
    return { connected: true };
  } catch (error) {
    connected = false;
    console.error(`[db] MongoDB connection failed: ${error.message}`);
    return { connected: false, error };
  }
}

export function isDbConnected() {
  return connected && mongoose.connection.readyState === 1;
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  connected = false;
}

export { isDbConfigured };
