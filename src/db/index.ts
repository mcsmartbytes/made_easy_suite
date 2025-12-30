import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// Only create client on server-side where env vars are available
const url = process.env.TURSO_DATABASE_URL?.trim();
// Clean auth token - remove any whitespace/newlines that might have been added
const authToken = process.env.TURSO_AUTH_TOKEN?.trim().replace(/\s+/g, '');

let db: ReturnType<typeof drizzle> | null = null;

try {
  if (url && authToken) {
    const client = createClient({ url, authToken });
    db = drizzle(client, { schema });
  }
} catch (error) {
  console.error('Failed to initialize database:', error);
}

export { db };

// Helper to ensure db is available
export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
  }
  return db;
}

export * from './schema';
