'use client';
import { useState, type FormEvent } from 'react';
import { ArrowUpRight, LoaderCircle } from 'lucide-react';
import { CATEGORIES, type NewTask, type BoardMode, type Category } from '@/lib/types';
import Modal from './modal';
export default function TaskForm({ mode, onClose, onSubmit }: { mode: BoardMode; onClose: () => void; onSubmit: (task: NewTask) => Promise<void> }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true); const data = new FormData(event.currentTarget);
    try { await onSubmit({ title: String(data.get('title')).trim(), description: String(data.get('description')).trim(), category: String(data.get('category')) as Category, skills: String(data.get('skills')).split(',').map(x => x.trim()).filter(Boolean), bounty: Number(data.get('bounty') || 0), bountyCurrency: 'USDC', durationHours: Number(data.get('duration')), ownerName: String(data.get('name') || 'You').trim() }); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not publish. Please try again.'); } finally { setBusy(false); }
  }
  return <Modal title="A little help starts here." onClose={onClose} wide><p className="modal-intro">Make the ask specific. The right builder will know what to do.</p><form onSubmit={submit} className="task-form">
    <label>What do you need?<input name="title" placeholder="e.g. Review our smart contract before judging" minLength={5} maxLength={100} required autoFocus /></label>
    <label>The details<textarea name="description" rows={4} placeholder="What are you building? What would a good result look like? Add a contact handle or project link." minLength={12} maxLength={2000} required /></label>
    <div className="form-grid"><label>Category<select name="category">{CATEGORIES.map(x => <option key={x}>{x}</option>)}</select></label><label>Expires in<select name="duration" defaultValue="24"><option value="1">1 hour</option><option value="6">6 hours</option><option value="24">24 hours</option><option value="72">3 days</option><option value="168">7 days</option></select></label></div>
    <label>Skills, separated by commas<input name="skills" placeholder="Solidity, React, good taste" maxLength={150} /></label>
    <div className="form-grid"><label>Your display name<input name="name" placeholder="You" maxLength={40} /></label><label>Optional bounty · USDC<input name="bounty" type="number" min="0" max="100000" step="0.01" placeholder="0.00" /></label></div>
    <p className="form-note">Bounties are offers arranged between builders. Sidequest does not hold or transfer funds.</p>{mode === 'live' && <div className="notice">Your wallet owns this task on Arkiv. Publishing requires test tGLM. Task details are public.</div>}{error && <p className="form-error" role="alert">{error}</p>}
    <button className="primary-button full-button" disabled={busy} type="submit">{busy ? <><LoaderCircle className="spin" size={17} />Publishing…</> : <>Post {mode === 'demo' ? 'practice ' : ''}task <ArrowUpRight size={17} /></>}</button>
  </form></Modal>;
}
