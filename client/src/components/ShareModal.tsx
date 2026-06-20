import { useEffect, useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { Modal, Button, Spinner } from './ui';
import { collaboratorApi } from '../api';
import type { Collaborator } from '../types';

interface Props {
  projectId: string;
  onClose: () => void;
}

export default function ShareModal({ projectId, onClose }: Props) {
  const [owner, setOwner] = useState<Collaborator | null>(null);
  const [list, setList] = useState<Collaborator[] | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    collaboratorApi.list(projectId).then((d) => {
      setOwner(d.owner);
      setList(d.collaborators);
    });
  }, [projectId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setBusy(true);
    setError('');
    try {
      setList(await collaboratorApi.add(projectId, value));
      setEmail('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string) {
    setList(await collaboratorApi.remove(projectId, userId));
  }

  return (
    <Modal open onClose={onClose} title="Share project">
      <form onSubmit={add} className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Invite by email"
          className="flex-1 rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
        <Button type="submit" disabled={busy || !email.trim()}>
          <UserPlus className="h-4 w-4" /> {busy ? 'Adding…' : 'Invite'}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-1 text-xs text-slate-400">
        The person must already have a CodeBud account. They get full edit access.
      </p>

      <div className="mt-4 space-y-1">
        {owner && (
          <div className="flex items-center justify-between rounded-lg px-2 py-2">
            <span className="text-sm text-slate-700">
              {owner.name} <span className="text-slate-400">· {owner.email}</span>
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Owner</span>
          </div>
        )}
        {list === null ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : list.length === 0 ? (
          <p className="px-2 py-2 text-sm text-slate-400">No collaborators yet.</p>
        ) : (
          list.map((c) => (
            <div key={c._id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-100">
              <span className="text-sm text-slate-700">
                {c.name} <span className="text-slate-400">· {c.email}</span>
              </span>
              <button onClick={() => remove(c._id)} className="text-slate-400 hover:text-red-500" title="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
