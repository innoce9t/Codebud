import { useEffect, useState } from 'react';
import { Check, Copy, Globe, Lock, RefreshCw, Trash2, UserPlus } from 'lucide-react';
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
  const [linkSharing, setLinkSharing] = useState(false);
  const [shareToken, setShareToken] = useState<string | undefined>();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    collaboratorApi.list(projectId).then((d) => {
      setOwner(d.owner);
      setList(d.collaborators);
      setLinkSharing(d.linkSharing);
      setShareToken(d.shareToken);
    });
  }, [projectId]);

  const shareUrl = shareToken
    ? `${window.location.origin}/project/${projectId}?join=${shareToken}`
    : '';

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

  async function toggleLink(enabled: boolean) {
    const res = await collaboratorApi.setLinkSharing(projectId, enabled);
    setLinkSharing(res.linkSharing);
    setShareToken(res.shareToken);
    setList(res.collaborators);
  }

  async function regenerate() {
    setShareToken(await collaboratorApi.regenerate(projectId));
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal open onClose={onClose} title="Share project">
      {/* People */}
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

      <div className="mt-3 max-h-44 space-y-1 overflow-auto">
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
        ) : (
          list.map((c) => (
            <div key={c._id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-100">
              <span className="text-sm text-slate-700">
                {c.name} <span className="text-slate-400">· {c.email}</span>
                {c.via === 'link' && (
                  <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400">via link</span>
                )}
              </span>
              <button onClick={() => remove(c._id)} className="text-slate-400 hover:text-red-500" title="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* General access (link sharing) */}
      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="mb-2 text-sm font-medium text-slate-700">General access</p>
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              linkSharing ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {linkSharing ? <Globe className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <select
              value={linkSharing ? 'link' : 'restricted'}
              onChange={(e) => toggleLink(e.target.value === 'link')}
              className="rounded-md border border-slate-300 bg-surface px-2 py-1 text-sm font-medium text-slate-800 outline-none focus:border-brand-500"
            >
              <option value="restricted">Restricted</option>
              <option value="link">Anyone with the link</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {linkSharing
                ? 'Anyone with the link who signs in can open and edit this project.'
                : 'Only people added above can access.'}
            </p>
          </div>
        </div>

        {linkSharing && shareUrl && (
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 truncate rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none"
            />
            <Button variant="subtle" className="!py-2 text-xs" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button variant="ghost" className="!py-2 text-xs" onClick={regenerate} title="Generate a new link (revokes the old one)">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
