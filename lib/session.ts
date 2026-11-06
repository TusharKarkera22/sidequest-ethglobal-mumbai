import { keccak256, stringToBytes } from 'viem';
import { DomainError } from './task-domain';
export const SESSION_COOKIE = 'sidequest_session_v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function readSessionCookie(cookie: string | null): string | null {
  const value = cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  return value && UUID.test(value) ? value : null;
}
export function resolveSession(cookie: string | null) {
  const existing = readSessionCookie(cookie);
  return {id: existing ?? crypto.randomUUID(), isNew: !existing};
}
export function sessionCookie(id: string, requestUrl: string) {
  return `${SESSION_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${new URL(requestUrl).protocol === 'https:' ? '; Secure' : ''}`;
}
export function assertSessionTask(expected: string, actual: string) {
  if (expected !== actual) throw new DomainError('Task not found in this practice session.', 404);
}
export function demoIdentity(sessionId: string) { return `demo:${keccak256(stringToBytes(`sidequest-practice:${sessionId}`))}`; }
