import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { Task } from '../lib/types';
export const practiceSessions = sqliteTable('practice_sessions', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at').notNull(),
});
export const practiceTasks = sqliteTable('practice_tasks', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => practiceSessions.id, {onDelete:'cascade'}),
  payload: text('payload', {mode:'json'}).$type<Task>().notNull(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
}, table => [index('practice_tasks_session_expiry').on(table.sessionId, table.expiresAt)]);
