import mongoose from 'mongoose';
import { env, isProd } from './env.js';

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log('✓ MongoDB connected');
  } catch (err) {
    console.warn(`⚠ Could not reach MongoDB at ${env.mongoUri}: ${(err as Error).message}`);

    if (isProd) {
      console.error('  Refusing to start without a database in production.');
      process.exit(1);
    }

    // Dev convenience: spin up an in-memory MongoDB so the app runs with zero setup.
    console.warn('  Falling back to an in-memory MongoDB (dev only, data is not persisted).');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    await mongoose.connect(mem.getUri());
    console.log('✓ In-memory MongoDB started');
  }

  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
}
