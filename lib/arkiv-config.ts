import { defineChain } from 'viem';
export const ARKIV_NETWORK = {
  chainId:7794095,
  chainIdHex:'0x76edaf',
  name:'Arkiv Rabdi',
  rpcUrl:'https://rpc.rabdi.db-chain.testnet.arkiv.network',
  explorerUrl:'https://rabdi.explorer.arkiv.network',
  hubUrl:'https://hub.arkiv.network',
  schema:'sidequest.tasks.public.v1',
} as const;
// Public configuration only. Private keys are never read by application code.
export function arkivChain(accessKey='') {
  return defineChain({id:ARKIV_NETWORK.chainId,name:ARKIV_NETWORK.name,nativeCurrency:{name:'Test Golem',symbol:'tGLM',decimals:18},rpcUrls:{default:{http:[`${ARKIV_NETWORK.rpcUrl}${accessKey?`/${encodeURIComponent(accessKey)}`:''}`]}},blockExplorers:{default:{name:'Arkiv Explorer',url:ARKIV_NETWORK.explorerUrl}},testnet:true});
}
