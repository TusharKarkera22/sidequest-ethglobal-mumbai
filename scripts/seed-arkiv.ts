/** Optional real Rabdi write. ARKIV_PRIVATE_KEY must be supplied through an ignored environment file or your shell. */
import { createWalletClient, ExpirationTime } from '@arkiv-network/sdk';
import { privateKeyToAccount } from 'viem/accounts';
import { http, stringToBytes, type Hex } from 'viem';
import { mkdir, writeFile } from 'node:fs/promises';
import { arkivChain, ARKIV_NETWORK } from '../lib/arkiv-config';
import { arkivPublicClient, recordFromEntity } from '../lib/arkiv';
import { SidequestRecords } from '../lib/arkiv-schema';
import { resolveLiveRecords, type TaskPayload } from '../lib/arkiv-records';
import { validateNewTask } from '../lib/task-domain';
async function main() {
  const privateKey=process.env.ARKIV_PRIVATE_KEY;
  if (!privateKey || !/^0x[0-9a-f]{64}$/i.test(privateKey)) throw new Error('Set ARKIV_PRIVATE_KEY to a test-wallet key in your local environment. Never put a key in chat or source control.');
  const account=privateKeyToAccount(privateKey as Hex);
  const accessKey=process.env.ARKIV_ACCESS_KEY ?? '';
  const publicClient=arkivPublicClient(accessKey);
  const balance=await publicClient.getBalance({address:account.address});
  console.log(JSON.stringify({network:ARKIV_NETWORK.name,address:account.address,balanceWei:balance.toString()}));
  if (balance===BigInt(0)) throw new Error('This wallet needs test tGLM. Fund the public address at https://hub.arkiv.network and rerun.');
  if (process.argv.includes('--dry-run')) return;
  const input=validateNewTask({title:'Review Sidequest’s live task lifecycle',description:'Try publishing, claiming, and completing a task on the Sidequest live board. Share one concrete improvement to the wallet flow or the expiration states with the team. This is a real testnet coordination request from the Sidequest build.',category:'Research',skills:['Arkiv','User testing'],bounty:0,bountyCurrency:'USDC',durationHours:72,ownerName:'Sidequest team'});
  const createdAt=Date.now(),expiresAt=createdAt+input.durationHours*3600000;
  const payload:TaskPayload={version:1,kind:'task',input,createdAt,expiresAt};
  const wallet=createWalletClient({chain:arkivChain(accessKey),account,transport:http(undefined,{timeout:20000,retryCount:0})});
  const receipt=await wallet.createEntity(SidequestRecords,{kind:'task',ref:'',category:input.category,payload:stringToBytes(JSON.stringify(payload))},{expiration:ExpirationTime.atDate(new Date(expiresAt)),flags:{readonly:true}});
  const entity=await publicClient.getEntity(receipt.entityKey,SidequestRecords);
  const task=resolveLiveRecords([recordFromEntity(entity)])[0];
  if (!task) throw new Error('The transaction confirmed, but the readback did not match the Sidequest schema. Check the explorer before retrying.');
  const proof={network:ARKIV_NETWORK.name,chainId:ARKIV_NETWORK.chainId,schema:ARKIV_NETWORK.schema,entityKey:receipt.entityKey,txHash:receipt.txHash,owner:account.address,title:task.title,expiresAt:new Date(expiresAt).toISOString(),verifiedReadback:true,explorer:`${ARKIV_NETWORK.explorerUrl}/tx/${receipt.txHash}`};
  await mkdir('outputs',{recursive:true});
  await writeFile('outputs/arkiv-proof.json',JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify(proof,null,2));
}
main().catch(error=>{
  // SDK errors may include request details; print only our own safe setup messages.
  const safeMessages=['Set ARKIV_PRIVATE_KEY','This wallet needs test tGLM','The transaction confirmed'];
  const message=error instanceof Error && safeMessages.some(prefix=>error.message.startsWith(prefix))?error.message:'Arkiv write failed. Check wallet funding, the RPC access key, and network availability. No live task is being reported as successful.';
  console.error(message);process.exitCode=1;
});
