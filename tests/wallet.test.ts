import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { connectWallet, publishTask, mutateLiveTask } from '../lib/arkiv-wallet';
import type { NewTask, Task } from '../lib/types';
const address='0x'+'1'.repeat(40), other='0x'+'2'.repeat(40);
function wallet(request:(input:{method:string;params?:unknown})=>Promise<unknown>) {Object.defineProperty(globalThis,'window',{configurable:true,value:{ethereum:{request}}});}
afterEach(()=>{Reflect.deleteProperty(globalThis,'window');});
const input:NewTask={title:'Build a wallet flow',description:'Connect and test a wallet on Rabdi.',category:'Development',skills:['React'],bounty:0,bountyCurrency:'USDC',durationHours:24,ownerName:'Ada'};
test('missing browser wallet fails with an actionable message',async()=>{
  await assert.rejects(connectWallet,/browser wallet/);
});
test('connects only after switching to Rabdi and adding its official network when needed',async()=>{
  let chain='0x1',added=false;
  wallet(async({method})=>{
    if(method==='eth_requestAccounts') return [address];
    if(method==='eth_chainId') return chain;
    if(method==='wallet_switchEthereumChain') {if(!added) throw {code:4902};chain='0x76edaf';return null;}
    if(method==='wallet_addEthereumChain') {added=true;return null;}
    throw new Error('Unexpected wallet request');
  });
  assert.equal(await connectWallet(),address);assert.equal(added,true);
});
test('does not accept connection after a rejected network switch',async()=>{
  wallet(async({method})=>{if(method==='eth_requestAccounts') return [address];if(method==='eth_chainId') return '0x1';throw {code:4001};});
  await assert.rejects(connectWallet,/cancelled/);
});
test('refuses a live write when the selected wallet differs from the connected account',async()=>{
  wallet(async({method})=>{if(method==='eth_chainId') return '0x76edaf';if(method==='eth_accounts') return [other];throw new Error('No transaction may be sent');});
  await assert.rejects(()=>publishTask(input,address),/account changed/);
});
test('never treats a practice mutation as a live wallet action',async()=>{
  await assert.rejects(()=>mutateLiveTask({source:'demo'} as Task,'claim',address),/practice task/);
});
test('only reports user cancellation for provider error 4001',async()=>{
  wallet(async()=>{throw {code:4001,message:'User rejected the request.'};});
  await assert.rejects(connectWallet,/cancelled/);
});
test('explains an already pending wallet request instead of reporting cancellation',async()=>{
  wallet(async()=>{throw {code:-32002,message:'Request of type eth_requestAccounts already pending.'};});
  await assert.rejects(connectWallet,error=>error instanceof Error && /pending/i.test(error.message) && /open/i.test(error.message) && !/cancelled/i.test(error.message));
});
test('preserves a provider failure code and short message for diagnosis',async()=>{
  wallet(async()=>{throw {code:-32603,message:'Provider bridge is disconnected.'};});
  await assert.rejects(connectWallet,error=>error instanceof Error && error.message.includes('-32603') && error.message.includes('Provider bridge is disconnected') && !error.message.includes('cancelled'));
});
test('explicit MetaMask preference selects its provider over another injected wallet',async()=>{
  const metamask={isMetaMask:true,request:async({method}:{method:string})=>method==='eth_requestAccounts'?[address]:'0x76edaf'};
  const okx={isOkxWallet:true,isMetaMask:true,request:async()=>{throw new Error('Wrong wallet selected');}};
  Object.defineProperty(globalThis,'window',{configurable:true,value:{ethereum:{...okx,providers:[okx,metamask]}}});
  assert.equal(await connectWallet('metamask'),address);
});
test('preserves the current injected wallet by default when multiple wallets are installed',async()=>{
  const metamask={isMetaMask:true,request:async()=>{throw new Error('Do not switch wallets silently');}};
  const okx={isOkxWallet:true,request:async({method}:{method:string})=>method==='eth_requestAccounts'?[address]:'0x76edaf'};
  Object.defineProperty(globalThis,'window',{configurable:true,value:{ethereum:{...okx,providers:[okx,metamask]}}});
  assert.equal(await connectWallet(),address);
});
test('signing reuses the explicitly connected provider after another wallet takes the default injection',async()=>{
  const okx={isOkxWallet:true,request:async({method}:{method:string})=>method==='eth_requestAccounts'?[address]:method==='eth_accounts'?[other]:'0x76edaf'};
  const metamask={isMetaMask:true,request:async()=>{throw new Error('Wrong default provider');}};
  const surface={ethereum:{...metamask,providers:[metamask,okx]}};
  Object.defineProperty(globalThis,'window',{configurable:true,value:surface});
  assert.equal(await connectWallet('okx'),address);
  surface.ethereum={...metamask,providers:[metamask]};
  await assert.rejects(()=>publishTask(input,address),/account changed/);
});
