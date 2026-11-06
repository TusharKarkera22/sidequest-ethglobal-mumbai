import { DomainError } from './task-domain';
export async function readJson(request:Request):Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new DomainError('Send JSON with Content-Type application/json.',415);
  if (Number(request.headers.get('content-length') ?? 0)>16000) throw new DomainError('This request is too large.',413);
  const body=await request.text();
  if (body.length>16000) throw new DomainError('This request is too large.',413);
  try {return JSON.parse(body);} catch {throw new DomainError('The request contains invalid JSON.');}
}
export function apiError(error:unknown, fallback='The request could not be completed. Please try again.') {
  if (error instanceof DomainError) return Response.json({error:error.message},{status:error.status,headers:{'Cache-Control':'no-store'}});
  console.error('[Sidequest API]',error instanceof Error?error.name:'Unknown error');
  return Response.json({error:fallback},{status:503,headers:{'Cache-Control':'no-store'}});
}
export function rejectCrossOrigin(request:Request) {
  const origin=request.headers.get('origin');
  if (origin && origin!==new URL(request.url).origin) throw new DomainError('This request must come from your Sidequest board.',403);
}
export function requestedMode(request:Request) {
  const mode=new URL(request.url).searchParams.get('mode') ?? 'demo';
  if (mode!=='demo' && mode!=='live') throw new DomainError('Choose demo or live mode.');
  return mode;
}
