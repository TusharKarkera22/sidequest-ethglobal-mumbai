import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateNewTask, transitionTask, createTask, DomainError } from '../lib/task-domain';
import { readSessionCookie, resolveSession, assertSessionTask } from '../lib/session';
import type { NewTask, Task } from '../lib/types';
const input: NewTask = { title:'Build a wallet flow', description:'Connect and test a wallet on Rabdi.', category:'Development', skills:['React', 'React', ' TypeScript '], bounty:25, bountyCurrency:'USDC', durationHours:24, ownerName:'Ada' };
const now = 1800000000000;
const task = (): Task => createTask(input, {id:'task-a', owner:'alice', ownerName:'You', source:'demo', now});
test('rejects malformed content, unsupported categories and non-finite bounty', () => {
  for (const bad of [{...input,title:' '},{...input,description:'x'.repeat(4001)},{...input,category:'Other'},{...input,bounty:-1},{...input,bounty:Infinity},{...input,durationHours:0},{...input,durationHours:721},{...input,skills:['x'.repeat(33)]}]) {
    assert.throws(() => validateNewTask(bad), DomainError);
  }
});
test('normalizes task content and computes an absolute expiration', () => {
  const valid=validateNewTask({...input,title:'  Build a wallet flow  '});
  assert.equal(valid.title,'Build a wallet flow');
  assert.deepEqual(valid.skills,['React','TypeScript']);
  assert.equal(task().expiresAt,now+86400000);
});
test('allows another builder to claim exactly once and owner or assignee to complete', () => {
  const claimed=transitionTask(task(),'claim','bob',now+1);
  assert.equal(claimed.assignee,'bob');
  assert.equal(claimed.status,'claimed');
  assert.throws(() => transitionTask(claimed,'claim','carol',now+2), DomainError);
  assert.throws(() => transitionTask(claimed,'complete','carol',now+2), DomainError);
  assert.equal(transitionTask(claimed,'complete','bob',now+2).status,'completed');
  assert.equal(transitionTask(claimed,'complete','alice',now+2).status,'completed');
});
test('blocks self claims, completion before a claim and every action at expiration', () => {
  assert.throws(() => transitionTask(task(),'claim','alice',now+1),DomainError);
  assert.throws(() => transitionTask(task(),'complete','alice',now+1),DomainError);
  assert.throws(() => transitionTask(task(),'claim','bob',now+86400000),DomainError);
});
test('compares wallet identities without case sensitivity', () => {
  const t={...task(), owner:'0xAbC'};
  assert.throws(() => transitionTask(t,'claim','0xabc',now+1),DomainError);
});
test('creates unpredictable browser sessions and rejects malformed cookie identities', () => {
  const a=resolveSession(null), b=resolveSession(null);
  assert.notEqual(a.id,b.id);
  assert.equal(a.isNew,true);
  assert.equal(readSessionCookie(`sidequest_session_v1=${a.id}`),a.id);
  assert.equal(readSessionCookie('sidequest_session_v1=attacker'),null);
  assert.equal(resolveSession(`sidequest_session_v1=${a.id}`).isNew,false);
});
test('session authorization rejects a task copied from another browser session', () => {
  assert.throws(() => assertSessionTask('session-a','session-b'),DomainError);
  assert.doesNotThrow(() => assertSessionTask('session-a','session-a'));
});
test('public practice identity does not expose the HttpOnly session credential',async()=>{
  const {demoIdentity}=await import('../lib/session');
  const session='31ae18c3-a0a8-4dc6-b4dd-818954c4581b';
  assert.equal(demoIdentity(session).includes(session),false);
  assert.equal(demoIdentity(session),demoIdentity(session));
  assert.notEqual(demoIdentity(session),demoIdentity('32ae18c3-a0a8-4dc6-b4dd-818954c4581b'));
});
test('sample task identifiers do not expose the private session credential',async()=>{
  const {exampleTasks}=await import('../lib/demo-data');
  const session='31ae18c3-a0a8-4dc6-b4dd-818954c4581b';
  assert.equal(JSON.stringify(exampleTasks(session,now)).includes(session),false);
});
