import { getD1, serverArkivAccessKey } from '@/db';
import { apiError, readJson, rejectCrossOrigin, requestedMode } from '@/lib/api';
import { listLiveTasks } from '@/lib/arkiv';
import { ensurePracticeSession, listPracticeTasks, publishPracticeTask } from '@/lib/demo-store';
import { demoIdentity, resolveSession, sessionCookie } from '@/lib/session';
import { DomainError, validateNewTask } from '@/lib/task-domain';
export async function GET(request:Request) {
  try {
    const mode=requestedMode(request);
    if (mode==='live') {
      try {return Response.json({tasks:await listLiveTasks(serverArkivAccessKey()),mode},{headers:{'Cache-Control':'no-store'}});}
      catch {return Response.json({error:'Arkiv Rabdi could not be read. The public RPC may be rate limited or temporarily unavailable. Retry shortly, or configure an Arkiv access key from the Hub.'},{status:503,headers:{'Cache-Control':'no-store'}});}
    }
    const session=resolveSession(request.headers.get('cookie'));
    const db=getD1();
    await ensurePracticeSession(db,session.id);
    const tasks=await listPracticeTasks(db,session.id);
    return Response.json({tasks,mode,wallet:demoIdentity(session.id)},{headers:{'Cache-Control':'no-store','Set-Cookie':sessionCookie(session.id,request.url)}});
  } catch(error) {return apiError(error,'Practice storage is unavailable. Please retry after the database migration is applied.');}
}
export async function POST(request:Request) {
  try {
    rejectCrossOrigin(request);
    const payload=await readJson(request);
    if (requestedMode(request)==='live' || (payload && typeof payload==='object' && 'mode' in payload && payload.mode==='live')) throw new DomainError('Live tasks must be signed by your browser wallet.',403);
    const input=validateNewTask(payload);
    const session=resolveSession(request.headers.get('cookie'));
    const db=getD1();
    await ensurePracticeSession(db,session.id);
    const task=await publishPracticeTask(db,session.id,input);
    return Response.json(task,{status:201,headers:{'Cache-Control':'no-store','Set-Cookie':sessionCookie(session.id,request.url)}});
  } catch(error) {return apiError(error);}
}
