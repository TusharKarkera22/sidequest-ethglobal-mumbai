import type { Task, NewTask } from './types';
import { createTask, DomainError, transitionTask } from './task-domain';
import { assertSessionTask, demoIdentity } from './session';
import { exampleTasks } from './demo-data';
export async function ensurePracticeSession(db: D1Database, sessionId: string, now = Date.now()) {
  const found=await db.prepare('SELECT id FROM practice_sessions WHERE id = ?').bind(sessionId).first();
  if (found) return;
  const tasks=exampleTasks(sessionId,now);
  // The insert and examples are committed together; examples never enter the migration.
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO practice_sessions (id, created_at) VALUES (?, ?)').bind(sessionId,now),
    ...tasks.map(task => db.prepare('INSERT OR IGNORE INTO practice_tasks (id, session_id, payload, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').bind(task.id,sessionId,JSON.stringify(task),task.createdAt,task.expiresAt)),
  ]);
}
export async function listPracticeTasks(db: D1Database, sessionId: string, now = Date.now()): Promise<Task[]> {
  const result=await db.prepare('SELECT payload FROM practice_tasks WHERE session_id = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 100').bind(sessionId,now).all<{payload:string}>();
  return result.results.map(row => JSON.parse(row.payload) as Task);
}
export async function publishPracticeTask(db: D1Database, sessionId: string, input: NewTask, now = Date.now()): Promise<Task> {
  const count=await db.prepare('SELECT COUNT(*) AS count FROM practice_tasks WHERE session_id = ? AND expires_at > ?').bind(sessionId,now).first<{count:number}>();
  if ((count?.count ?? 0)>=100) throw new DomainError('Your practice board has reached 100 active tasks.',429);
  const task=createTask(input,{id:crypto.randomUUID(),owner:demoIdentity(sessionId),ownerName:'You',source:'demo',now});
  await db.prepare('INSERT INTO practice_tasks (id, session_id, payload, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').bind(task.id,sessionId,JSON.stringify(task),task.createdAt,task.expiresAt).run();
  return task;
}
export async function mutatePracticeTask(db: D1Database, sessionId: string, id: string, action: 'claim'|'complete', now = Date.now()): Promise<Task> {
  const row=await db.prepare('SELECT session_id, payload FROM practice_tasks WHERE id = ? AND session_id = ?').bind(id,sessionId).first<{session_id:string;payload:string}>();
  if (!row) throw new DomainError('Task not found in this practice session.',404);
  assertSessionTask(sessionId,row.session_id);
  const task=transitionTask(JSON.parse(row.payload) as Task,action,demoIdentity(sessionId),now);
  const result=await db.prepare('UPDATE practice_tasks SET payload = ? WHERE id = ? AND session_id = ? AND payload = ?').bind(JSON.stringify(task),id,sessionId,row.payload).run();
  if (result.meta.changes !== 1) throw new DomainError('This task changed while you were working. Refresh the board and try again.',409);
  return task;
}
