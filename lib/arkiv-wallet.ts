'use client';
import { createWalletClient, ExpirationTime } from '@arkiv-network/sdk';
import { custom, isAddress, stringToBytes, type EIP1193Provider, type Hex } from 'viem';
import { ARKIV_NETWORK, arkivChain } from './arkiv-config';
import { SidequestRecords } from './arkiv-schema';
import { arkivPublicClient, readLiveRecords, recordFromEntity } from './arkiv';
import { resolveLiveRecords, type TaskPayload } from './arkiv-records';
import { DomainError, sameIdentity, transitionTask, validateNewTask } from './task-domain';
import type { NewTask, Task } from './types';
const publicAccessKey=process.env.NEXT_PUBLIC_ARKIV_ACCESS_KEY ?? '';
type WalletPreference = 'metamask' | 'okx';
type InjectedProvider = EIP1193Provider & {isMetaMask?:boolean;isOkxWallet?:boolean;isOKExWallet?:boolean;providers?:InjectedProvider[]};
let connectedProvider: {window:Window;ethereum:InjectedProvider}|null=null;
function provider(preferred?:WalletPreference): InjectedProvider {
  if (typeof window==='undefined') throw new Error('Connect a browser wallet to use the live board.');
  if (!preferred && connectedProvider?.window===window) return connectedProvider.ethereum;
  const injected=window as unknown as {ethereum?:InjectedProvider;okxwallet?:InjectedProvider};
  const wallets=[...(injected.ethereum?.providers ?? []),injected.ethereum,injected.okxwallet].filter((item):item is InjectedProvider=>Boolean(item));
  const isOkx=(item:InjectedProvider)=>Boolean(item.isOkxWallet || item.isOKExWallet || item===injected.okxwallet);
  const metamask=wallets.find(item=>item.isMetaMask && !isOkx(item));
  const okx=wallets.find(isOkx);
  const selected=preferred==='metamask'?metamask:preferred==='okx'?okx:injected.ethereum ?? metamask ?? okx;
  if (!selected) throw new Error(preferred?`The ${preferred==='metamask'?'MetaMask':'OKX'} provider is unavailable. Open or enable that wallet extension and refresh Sidequest.`:'Install a browser wallet such as MetaMask to publish or claim live tasks. You can read the live board without a wallet.');
  return selected;
}
function rpcErrorCode(error:unknown,depth=0):number|undefined {
  if (!error || typeof error!=='object' || depth>3) return;
  if ('code' in error && typeof error.code==='number') return error.code;
  for (const field of ['cause','error','data','originalError']) {
    if (field in error) {const code=rpcErrorCode((error as Record<string,unknown>)[field],depth+1);if(code!==undefined)return code;}
  }
}
class WalletRequestError extends Error {
  constructor(message:string, public code?:number) {super(message);this.name='WalletRequestError';}
}
function walletRequestError(error:unknown,operation='Wallet connection'):WalletRequestError {
  if (error instanceof WalletRequestError) return error;
  const code=rpcErrorCode(error);
  if (code===4001) return new WalletRequestError(`${operation} cancelled (4001). Try again when you are ready.`,code);
  if (code===-32002) return new WalletRequestError('A wallet request is already pending (-32002). Open your wallet extension and approve or dismiss that request, then try again.',code);
  if (code===4100) return new WalletRequestError('Wallet access is not authorized (4100). Open your wallet, unlock it, and allow Sidequest to connect to your account.',code);
  if (code===4200) return new WalletRequestError('This wallet does not support the connection request (4200). Try MetaMask or select another wallet.',code);
  if (code===4900 || code===4901) return new WalletRequestError(`Your wallet is disconnected (${code}). Open and unlock it, check its network connection, then retry.`,code);
  const raw=error && typeof error==='object' && 'message' in error && typeof error.message==='string'?error.message:'';
  const detail=raw.replace(/https?:\/\/\S+/g,'[RPC URL]').replace(/\s+/g,' ').slice(0,220);
  return new WalletRequestError(`${operation} failed${code!==undefined?` (${code})`:''}.${detail?` ${detail}`:' Open and unlock your wallet extension, then retry.'}`,code);
}
async function ensureNetwork(ethereum:EIP1193Provider) {
  const chainId=await ethereum.request({method:'eth_chainId'});
  if (Number(chainId)===ARKIV_NETWORK.chainId) return;
  try {await ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:ARKIV_NETWORK.chainIdHex}]});}
  catch(error) {
    if (rpcErrorCode(error)!==4902) throw walletRequestError(error,'Network switch');
    const chain=arkivChain(publicAccessKey);
    await ethereum.request({method:'wallet_addEthereumChain',params:[{chainId:ARKIV_NETWORK.chainIdHex,chainName:chain.name,nativeCurrency:chain.nativeCurrency,rpcUrls:chain.rpcUrls.default.http,blockExplorerUrls:[ARKIV_NETWORK.explorerUrl]}]});
    await ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:ARKIV_NETWORK.chainIdHex}]});
  }
  if (Number(await ethereum.request({method:'eth_chainId'}))!==ARKIV_NETWORK.chainId) throw new Error('Your wallet is still on another network. Select Arkiv Rabdi and try again.');
}
export async function connectWallet(preferred?:WalletPreference):Promise<string> {
  // A fresh connection can choose a wallet; later writes reuse the same provider.
  connectedProvider=null;
  const ethereum=provider(preferred);
  let addresses:readonly string[];
  try {addresses=await ethereum.request({method:'eth_requestAccounts'});}
  catch(error) {throw walletRequestError(error);}
  const address=addresses[0];
  if (!address || !isAddress(address)) throw new Error('Your wallet did not return a valid account.');
  try {await ensureNetwork(ethereum);} catch(error) {throw walletRequestError(error,'Network setup');}
  connectedProvider={window,ethereum};
  return address;
}
async function signingClient(address:string) {
  if (!isAddress(address)) throw new DomainError('Connect a valid wallet account.');
  const ethereum=provider();
  await ensureNetwork(ethereum);
  const addresses=await ethereum.request({method:'eth_accounts'});
  if (!addresses[0] || !sameIdentity(address,addresses[0])) throw new Error('Your active wallet account changed. Reconnect the wallet before continuing.');
  return createWalletClient({chain:arkivChain(publicAccessKey),transport:custom(ethereum),account:address as Hex});
}
async function loadTask(entityKey:string) {
  if (!/^0x[0-9a-f]{64}$/i.test(entityKey)) throw new DomainError('This live task has an invalid entity key.');
  const entity=await arkivPublicClient(publicAccessKey).getEntity(entityKey as Hex,SidequestRecords);
  const original=recordFromEntity(entity);
  const actions=await readLiveRecords(publicAccessKey,entityKey);
  const task=resolveLiveRecords([original,...actions]).find(item=>sameIdentity(item.id,entityKey));
  if (!task) throw new Error('This live task is expired or does not match the Sidequest data format.');
  return {task,expiryBlock:entity.$expiresAt};
}
export async function publishTask(input:NewTask,address:string):Promise<Task> {
  const value=validateNewTask(input);
  const wallet=await signingClient(address);
  const createdAt=Date.now();
  const expiresAt=createdAt+value.durationHours*3600000;
  const payload:TaskPayload={version:1,kind:'task',input:value,createdAt,expiresAt};
  const receipt=await wallet.createEntity(SidequestRecords,{kind:'task',ref:'',category:value.category,payload:stringToBytes(JSON.stringify(payload))},{expiration:ExpirationTime.atDate(new Date(expiresAt)),flags:{readonly:true}});
  try {
    const {task}=await loadTask(receipt.entityKey);
    return {...task,txHash:receipt.txHash};
  } catch {throw new Error(`Transaction confirmed (${receipt.txHash}), but the entity could not yet be read. Refresh the live board before publishing again.`);}
}
export async function mutateLiveTask(input:Task,action:'claim'|'complete',address:string):Promise<Task> {
  if (input.source!=='live') throw new DomainError('This is a practice task. Switch to the live board first.');
  const wallet=await signingClient(address);
  const entityKey=input.entityKey ?? input.id;
  const {task,expiryBlock}=await loadTask(entityKey);
  transitionTask(task,action,address); // Recheck current chain state, not a stale card.
  const receipt=await wallet.createEntity(SidequestRecords,{kind:'action',ref:entityKey,category:task.category,payload:stringToBytes(JSON.stringify({version:1,kind:action,taskKey:entityKey}))},{expiration:ExpirationTime.atBlock(expiryBlock),flags:{readonly:true}});
  for (let attempt=0;attempt<3;attempt++) {
    try {
      const {task:updated}=await loadTask(entityKey);
      if (action==='claim' && sameIdentity(updated.assignee,address)) return {...updated,txHash:receipt.txHash};
      if (action==='complete' && updated.status==='completed') return {...updated,txHash:receipt.txHash};
      if (action==='claim' && updated.assignee && !sameIdentity(updated.assignee,address)) throw new DomainError('Another builder claimed this task first. Refresh the live board.',409);
    } catch(error) {if (error instanceof DomainError) throw error;}
    if (attempt<2) await new Promise(resolve=>setTimeout(resolve,750));
  }
  throw new Error(`Transaction confirmed (${receipt.txHash}), but the updated task is not indexed yet. Refresh the live board to check its status.`);
}
