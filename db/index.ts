import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
export function getD1(): D1Database {
  if (!env.DB) throw new Error('Practice storage is unavailable. The Sidequest D1 database binding DB must be configured and its migration applied.');
  return env.DB;
}
export function getDb() {return drizzle(getD1(),{schema});}
export function serverArkivAccessKey(): string {
  return (env as unknown as {ARKIV_ACCESS_KEY?:string}).ARKIV_ACCESS_KEY ?? process.env.ARKIV_ACCESS_KEY ?? '';
}
