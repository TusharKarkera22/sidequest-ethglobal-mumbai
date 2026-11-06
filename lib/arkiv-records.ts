import { sameIdentity, transitionTask, validateNewTask } from './task-domain';
import type { NewTask, Task } from './types';
export interface LiveRecord {
  key:string; owner:string; creator:string; createdBlock:bigint; expiryBlock:bigint;
  readonly:boolean; kind:string; ref:string; payload:unknown;
}
export interface TaskPayload {version:1; kind:'task'; input:NewTask; createdAt:number; expiresAt:number;}
export interface ActionPayload {version:1; kind:'claim'|'complete'; taskKey:string;}
function object(value:unknown): value is Record<string,unknown> {return typeof value==='object' && value!==null;}
function isAddress(value:string) {return /^0x[0-9a-f]{40}$/i.test(value);}
export function resolveLiveRecords(records:LiveRecord[], now=Date.now()): Task[] {
  const tasks=new Map<string, {task:Task; record:LiveRecord}>();
  for (const record of records) {
    if (!record.readonly || record.kind!=='task' || record.ref!=='' || !isAddress(record.creator) || !object(record.payload)) continue;
    const payload=record.payload;
    if (payload.version!==1 || payload.kind!=='task' || !Number.isSafeInteger(payload.createdAt) || !Number.isSafeInteger(payload.expiresAt)) continue;
    const createdAt=payload.createdAt as number, expiresAt=payload.expiresAt as number;
    if (expiresAt<=now || createdAt>now+300000 || createdAt<=0) continue;
    try {
      const input=validateNewTask(payload.input);
      if (expiresAt!==createdAt+input.durationHours*3600000) continue;
      tasks.set(record.key.toLowerCase(),{record,task:{id:record.key,entityKey:record.key,...input,owner:record.creator,ownerName:input.ownerName,assignee:null,status:'open',createdAt,expiresAt,source:'live'}});
    } catch { /* Public data that does not match Sidequest's protocol is not a task. */ }
  }
  const actions=records.filter(record=>record.readonly && record.kind==='action' && isAddress(record.creator) && object(record.payload)).sort((a,b)=>a.createdBlock<b.createdBlock?-1:a.createdBlock>b.createdBlock?1:a.key.localeCompare(b.key));
  for (const record of actions) {
    const payload=record.payload as Record<string,unknown>;
    if (payload.version!==1 || (payload.kind!=='claim' && payload.kind!=='complete') || typeof payload.taskKey!=='string' || record.ref!==payload.taskKey) continue;
    const entry=tasks.get(payload.taskKey.toLowerCase());
    if (!entry || record.createdBlock<entry.record.createdBlock || record.expiryBlock<entry.record.expiryBlock) continue;
    // Actors come from immutable chain provenance, never a claimed address in JSON.
    try { entry.task=transitionTask(entry.task,payload.kind,record.creator,now); } catch { /* Losing claims and unauthorized events have no effect. */ }
  }
  return [...tasks.values()].map(({task})=>task).sort((a,b)=>b.createdAt-a.createdAt);
}
export function canCompleteLiveTask(task:Task,address:string) {return task.status==='claimed' && (sameIdentity(task.owner,address)||sameIdentity(task.assignee,address));}
