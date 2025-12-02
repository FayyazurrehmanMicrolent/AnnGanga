import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  throw new Error('Please add MONGODB_URI to .env file');
}

interface Cached {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached: Cached = {
  conn: null,
  promise: null,
};

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .then((mongoose) => {
        return mongoose;
      });
  }

  cached.conn = await cached.promise;
    // Ensure default roles exist (idempotent)
    try {
      // Import Role model lazily to avoid circular imports
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Role = require('@/models/roles').default;

      const roles = ['Customer', 'Admin'];
      for (const r of roles) {
        await Role.findOneAndUpdate(
          { role: r },
          { $setOnInsert: { isRoleActive: true } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    } catch (err) {
      // If seeding roles fails, log but don't prevent DB connection
      // console.warn('Role seeding skipped or failed:', err);
    }

    return cached.conn;
}

export default connectDB;
