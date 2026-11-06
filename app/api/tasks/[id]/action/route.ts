import { getD1 } from '@/db';
import { apiError, readJson, rejectCrossOrigin, requestedMode } from '@/lib/api';
import { mutatePracticeTask } from '@/lib/demo-store';
import { readSessionCookie } from '@/lib/session';
import { DomainError } from '@/lib/task-domain';
export async function POST(request:Request, context:{params:Promise<{id:string}>}) {
  try {
    rejectCrossOrigin(request);
    if (requestedMode(request)==='live') throw new DomainError('Live actions must be signed by your browser wallet.',403);
    const payload=await readJson(request);
    if (!payload || typeof payload!=='object' || !('action' in payload) || (payload.action!=='claim' && payload.action!=='complete')) throw new DomainError('Choose claim or complete.');
    const sessionId=readSessionCookie(request.headers.get('cookie'));
    if (!sessionId) throw new DomainError('Open the practice board before changing a task.',401);
    const {id}=await context.params;
    if (id.length>160) throw new DomainError('Task not found.',404);
    const task=await mutatePracticeTask(getD1(),sessionId,id,payload.action);
    return Response.json(task,{headers:{'Cache-Control':'no-store'}});
  } catch(error) {return apiError(error);}
}
