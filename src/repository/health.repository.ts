import { sql } from 'kysely';
import { db } from '../db/db';

export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    // SQL Server specific - simple and fast
    await sql`SELECT 1`.execute(db);
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}