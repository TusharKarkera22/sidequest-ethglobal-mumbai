import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { ensurePracticeSession, listPracticeTasks, mutatePracticeTask, publishPracticeTask } from '../lib/demo-store';
import type { NewTask } from '../lib/types';
import { demoIdentity } from '../lib/session';
function database():D1Database {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../drizzle/0000_unusual_calypso.sql',import.meta.url),'utf8'));
  class Statement {
    constructor(private sql:string,private params:(string|number|null)[]=[]){}
    bind(...params:(string|number|null)[]) {return new Statement(this.sql,params);}
    async first() {return sqlite.prepare(this.sql).get(...this.params) ?? null;}
    async all() {return {results:sqlite.prepare(this.sql).all(...this.params),success:true,meta:{}};}
    async run() {const result=sqlite.prepare(this.sql).run(...this.params);return {success:true,meta:{changes:Number(result.changes)}};}
  }
  return {prepare:(sql:string)=>new Statement(sql),batch:async(statements:Statement[])=>{
    sqlite.exec('BEGIN');
    try {const results=[];for(const statement of statements) results.push(await statement.run());sqlite.exec('COMMIT');return results;}
    catch(error){sqlite.exec('ROLLBACK');throw error;}
  }} as unknown as D1Database;
}
const now=1800000000000;
const input:NewTask={title:'Build a real flow',description:'Implement and verify our wallet flow.',category:'Development',skills:['React'],bounty:10,bountyCurrency:'USDC',durationHours:1,ownerName:'Attacker-supplied name'};
test('persists per-session examples without duplicating them on repeat visits',async()=>{
  const db=database();
  await ensurePracticeSession(db,'a',now);await ensurePracticeSession(db,'b',now);await ensurePracticeSession(db,'a',now);
  const a=await listPracticeTasks(db,'a',now),b=await listPracticeTasks(db,'b',now);
  assert.equal(a.length,8);assert.equal(b.length,8);
  assert.equal(a.some(t=>b.some(other=>other.id===t.id)),false);
});
test('persists created tasks, forces You identity, and excludes them from another session',async()=>{
  const db=database();await ensurePracticeSession(db,'a',now);await ensurePracticeSession(db,'b',now);
  const task=await publishPracticeTask(db,'a',input,now);
  assert.equal(task.ownerName,'You');assert.equal(task.owner,demoIdentity('a'));
  assert.equal((await listPracticeTasks(db,'a',now)).some(t=>t.id===task.id),true);
  assert.equal((await listPracticeTasks(db,'b',now)).some(t=>t.id===task.id),false);
  await assert.rejects(()=>mutatePracticeTask(db,'b',task.id,'claim',now+1),/not found/);
});
test('persists claims and completion while blocking duplicate transitions and expired writes',async()=>{
  const db=database();await ensurePracticeSession(db,'a',now);
  const task=(await listPracticeTasks(db,'a',now)).find(t=>t.status==='open')!;
  const claim=await mutatePracticeTask(db,'a',task.id,'claim',now+1);assert.equal(claim.assignee,demoIdentity('a'));
  await assert.rejects(()=>mutatePracticeTask(db,'a',task.id,'claim',now+2),/already/);
  assert.equal((await mutatePracticeTask(db,'a',task.id,'complete',now+3)).status,'completed');
  const short=await publishPracticeTask(db,'a',input,now);
  assert.equal((await listPracticeTasks(db,'a',now+3600000)).some(t=>t.id===short.id),false);
  await assert.rejects(()=>mutatePracticeTask(db,'a',short.id,'claim',now+3600000),/expired/);
});
test('concurrent practice claims cannot both succeed from the same stale task state',async()=>{
  const db=database();await ensurePracticeSession(db,'a',now);
  const task=(await listPracticeTasks(db,'a',now)).find(t=>t.status==='open')!;
  const results=await Promise.allSettled([mutatePracticeTask(db,'a',task.id,'claim',now+1),mutatePracticeTask(db,'a',task.id,'claim',now+1)]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(results.filter(result=>result.status==='rejected').length,1);
  assert.equal((await listPracticeTasks(db,'a',now)).find(t=>t.id===task.id)?.status,'claimed');
});
