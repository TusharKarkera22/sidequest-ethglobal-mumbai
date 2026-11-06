import { createPublicClient } from '@arkiv-network/sdk';
import { asc, eq } from '@arkiv-network/sdk/query';
import { hexToString, http } from 'viem';
import { arkivChain } from './arkiv-config';
import { SidequestRecords } from './arkiv-schema';
import { resolveLiveRecords, type LiveRecord } from './arkiv-records';
import type { Task } from './types';
export function arkivPublicClient(accessKey='') {return createPublicClient({chain:arkivChain(accessKey),transport:http(undefined,{timeout:12000,retryCount:0})});}
export async function readLiveRecords(accessKey='', taskKey?:string): Promise<LiveRecord[]> {
  const client=arkivPublicClient(accessKey);
  const records:LiveRecord[]=[];
  const selection={$key:true,$owner:true,$creator:true,$createdAt:true,$expiresAt:true,$creationFlags:true,kind:true,ref:true,payload:true} as const;
  for (let offset=0;offset<2000;offset+=100) {
    let query=client.select(selection).from(SidequestRecords).orderBy(asc('$key')).limit(100).offset(offset);
    if (taskKey) query=query.where(eq('ref',taskKey));
    const page=await query.fetch();
    for (const row of page.entities) {
      try {records.push({key:row.$key,owner:row.$owner,creator:row.$creator,createdBlock:row.$createdAt,expiryBlock:row.$expiresAt,readonly:row.$creationFlags.readonly,kind:row.kind.value,ref:row.ref.value,payload:JSON.parse(hexToString(row.payload.value))});} catch { /* A malformed public payload is not trusted. */ }
    }
    if (page.entities.length+page.skipped<100) return records;
  }
  throw new Error('Sidequest reached its live query limit. Narrow the query before continuing.');
}
export async function listLiveTasks(accessKey=''): Promise<Task[]> {return resolveLiveRecords(await readLiveRecords(accessKey));}
export function recordFromEntity(row:{
  $key:string; $owner:string; $creator:string; $createdAt:bigint; $expiresAt:bigint;
  $creationFlags:{readonly:boolean}; kind:{value:string}; ref:{value:string}; payload:{value:`0x${string}`};
}):LiveRecord {
  return {key:row.$key,owner:row.$owner,creator:row.$creator,createdBlock:row.$createdAt,expiryBlock:row.$expiresAt,readonly:row.$creationFlags.readonly,kind:row.kind.value,ref:row.ref.value,payload:JSON.parse(hexToString(row.payload.value))};
}
