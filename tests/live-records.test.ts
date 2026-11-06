import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveLiveRecords, type LiveRecord } from '../lib/arkiv-records';
const now=1800000000000;
const taskKey='0x'+'a'.repeat(64);
const alice='0x'+'1'.repeat(40), bob='0x'+'2'.repeat(40), carol='0x'+'3'.repeat(40);
function record(key:string, creator:string, createdBlock:bigint, payload:unknown, ref=''): LiveRecord {return {key,owner:creator,creator,createdBlock,expiryBlock:BigInt(1000),readonly:true,kind:ref?'action':'task',ref,payload};}
const task=()=>record(taskKey,alice,BigInt(10),{version:1,kind:'task',input:{title:'Build a wallet flow',description:'Connect and test a wallet on Rabdi.',category:'Development',skills:['Viem'],bounty:25,bountyCurrency:'USDC',durationHours:24,ownerName:'Ada'},createdAt:now,expiresAt:now+86400000});
const event=(key:string,creator:string,block:bigint,kind:'claim'|'complete')=>record(key,creator,block,{version:1,kind,taskKey},taskKey);
test('derives publisher from chain creator instead of attacker-controlled payload',()=>{
  const t=task(); (t.payload as Record<string,unknown>).owner=carol;
  assert.equal(resolveLiveRecords([t],now)[0].owner,alice);
});
test('resolves concurrent claims by actual chain creation block rather than supplied time',()=>{
  const result=resolveLiveRecords([task(),event('0xc',carol,BigInt(12),'claim'),event('0xb',bob,BigInt(11),'claim')],now);
  assert.equal(result[0].assignee,bob);
  assert.equal(result[0].status,'claimed');
});
test('ignores self-claims and unauthorized completions but accepts assigned builder completion',()=>{
  const records=[task(),event('0xa',alice,BigInt(11),'claim'),event('0xb',bob,BigInt(12),'claim'),event('0xc',carol,BigInt(13),'complete')];
  assert.equal(resolveLiveRecords(records,now)[0].status,'claimed');
  assert.equal(resolveLiveRecords([...records,event('0xd',bob,BigInt(14),'complete')],now)[0].status,'completed');
});
test('rejects mutable records, expired tasks and invalid content',()=>{
  assert.deepEqual(resolveLiveRecords([{...task(),readonly:false}],now),[]);
  assert.deepEqual(resolveLiveRecords([task()],now+86400000),[]);
  assert.deepEqual(resolveLiveRecords([{...task(),payload:{version:1,kind:'task',input:{title:'fake'}}}],now),[]);
});
test('ignores claims created before the task and forged task references',()=>{
  const forged={...event('0xf',carol,BigInt(12),'claim'),ref:'0xwrong'};
  assert.equal(resolveLiveRecords([task(),event('0xb',bob,BigInt(9),'claim'),forged],now)[0].status,'open');
});
