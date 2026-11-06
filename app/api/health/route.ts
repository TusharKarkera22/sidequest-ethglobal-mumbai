import { getD1, serverArkivAccessKey } from '@/db';
import { arkivPublicClient } from '@/lib/arkiv';
import { ARKIV_NETWORK } from '@/lib/arkiv-config';
export async function GET() {
  const checks=await Promise.allSettled([
    (async()=>{await getD1().prepare('SELECT id FROM practice_sessions LIMIT 1').first();return true;})(),
    arkivPublicClient(serverArkivAccessKey()).getBlockNumber(),
  ]);
  const demoDatabase=checks[0].status==='fulfilled';
  const liveRead=checks[1].status==='fulfilled';
  return Response.json({ok:demoDatabase&&liveRead,network:ARKIV_NETWORK,demoDatabase,liveRead,accessKeyConfigured:Boolean(serverArkivAccessKey()),...(liveRead?{}:{warning:'Arkiv RPC is unavailable or rate limited. Retry with a configured access key.'})},{status:demoDatabase?200:503,headers:{'Cache-Control':'no-store'}});
}
