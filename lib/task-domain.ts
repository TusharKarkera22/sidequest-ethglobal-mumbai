import { z } from 'zod';
import { CATEGORIES, type BoardMode, type NewTask, type Task } from './types';

export class DomainError extends Error {
  constructor(message: string, public status = 400) { super(message); this.name = 'DomainError'; }
}
const newTaskSchema = z.object({
  title: z.string().trim().min(4, 'Use at least 4 characters for the title.').max(100),
  description: z.string().trim().min(12, 'Add a description of at least 12 characters.').max(4000),
  category: z.enum(CATEGORIES as [typeof CATEGORIES[number], ...typeof CATEGORIES[number][]]),
  skills: z.array(z.string().trim().min(1).max(32)).max(8).transform(values => [...new Set(values)]),
  bounty: z.number().finite().min(0).max(1000000),
  bountyCurrency: z.string().trim().min(1).max(12).regex(/^[A-Za-z0-9]+$/, 'Use a currency symbol such as USDC or ETH.'),
  durationHours: z.number().finite().int().min(1).max(720),
  ownerName: z.string().trim().min(1).max(48),
});
export function validateNewTask(input: unknown): NewTask {
  const result = newTaskSchema.safeParse(input);
  if (!result.success) throw new DomainError(result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(' '));
  return result.data;
}
export function createTask(input: NewTask, options: {id: string; owner: string; ownerName?: string; source: BoardMode; now?: number}): Task {
  const value = validateNewTask(input);
  const now = options.now ?? Date.now();
  const {durationHours, ...content} = value;
  return {...content, id: options.id, owner: options.owner, ownerName: options.ownerName ?? value.ownerName, source: options.source, assignee: null, status: 'open', createdAt: now, expiresAt: now + durationHours * 3600000};
}
export function sameIdentity(a: string | null | undefined, b: string | null | undefined) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}
export function transitionTask(task: Task, action: 'claim' | 'complete', actor: string, now = Date.now()): Task {
  if (!actor) throw new DomainError('Connect an identity before changing a task.', 401);
  if (task.expiresAt <= now) throw new DomainError('This task has expired.', 410);
  if (action === 'claim') {
    if (task.status !== 'open') throw new DomainError('This task has already been claimed or completed.', 409);
    if (sameIdentity(task.owner, actor)) throw new DomainError('You cannot claim your own task.', 403);
    return {...task, status: 'claimed', assignee: actor};
  }
  if (action !== 'complete') throw new DomainError('Choose claim or complete.');
  if (task.status !== 'claimed') throw new DomainError('Only a claimed task can be completed.', 409);
  if (!sameIdentity(task.owner, actor) && !sameIdentity(task.assignee, actor)) throw new DomainError('Only the task owner or assigned builder can complete this task.', 403);
  return {...task, status: 'completed'};
}
