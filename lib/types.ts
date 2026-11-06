export type Category = 'Development' | 'Design' | 'Research' | 'Community';
export type TaskStatus = 'open' | 'claimed' | 'completed';
export type BoardMode = 'demo' | 'live';
export interface Task {
  id: string;
  title: string;
  description: string;
  category: Category;
  skills: string[];
  bounty: number;
  bountyCurrency: string;
  owner: string;
  ownerName: string;
  assignee: string | null;
  status: TaskStatus;
  createdAt: number;
  expiresAt: number;
  source: BoardMode;
  entityKey?: string;
  txHash?: string;
}
export interface NewTask {
  title: string;
  description: string;
  category: Category;
  skills: string[];
  bounty: number;
  bountyCurrency: string;
  durationHours: number;
  ownerName: string;
}
export interface TaskListResponse { tasks: Task[]; mode: BoardMode; wallet?: string; warning?: string; }
export const CATEGORIES: Category[] = ['Development', 'Design', 'Research', 'Community'];
