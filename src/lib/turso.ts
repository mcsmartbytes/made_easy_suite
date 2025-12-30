import { createClient, Client } from '@libsql/client';

let tursoClient: Client | null = null;

export function getTurso(): Client {
  if (!tursoClient) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      throw new Error('TURSO_DATABASE_URL environment variable is not set');
    }

    tursoClient = createClient({
      url,
      authToken,
    });
  }

  return tursoClient;
}

// Helper to run a query and return rows
export async function query<T = Record<string, unknown>>(
  sql: string,
  args: (string | number | null | boolean)[] = []
): Promise<T[]> {
  const client = getTurso();
  const result = await client.execute({ sql, args });
  return result.rows as unknown as T[];
}

// Helper to run a query and return first row
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  args: (string | number | null | boolean)[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] || null;
}

// Helper to execute a statement (INSERT, UPDATE, DELETE)
export async function execute(
  sql: string,
  args: (string | number | null | boolean)[] = []
): Promise<{ rowsAffected: number; lastInsertRowid: bigint | undefined }> {
  const client = getTurso();
  const result = await client.execute({ sql, args });
  return {
    rowsAffected: result.rowsAffected,
    lastInsertRowid: result.lastInsertRowid,
  };
}

// Helper to run multiple statements in a transaction
export async function transaction(
  statements: { sql: string; args?: (string | number | null | boolean)[] }[]
): Promise<void> {
  const client = getTurso();
  await client.batch(
    statements.map((s) => ({ sql: s.sql, args: s.args || [] })),
    'write'
  );
}

// Generate a UUID (since SQLite doesn't have gen_random_uuid())
export function generateId(): string {
  return crypto.randomUUID();
}

// Generate a tool QR code
export function generateToolQRCode(): string {
  return 'TOOL-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}
