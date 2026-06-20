import { useEffect, useState } from 'react';
import { fileApi } from '../api';
import { Button, Spinner } from './ui';
import type { FileNode, FileVersion } from '../types';

interface Props {
  projectId: string;
  file: FileNode;
  onClose: () => void;
  onRestored: () => void;
}

export default function VersionHistory({ projectId, file, onClose, onRestored }: Props) {
  const [versions, setVersions] = useState<FileVersion[] | null>(null);
  const [current, setCurrent] = useState('');
  const [selected, setSelected] = useState<FileVersion | null>(null);

  useEffect(() => {
    fileApi.versions(projectId, file._id).then((res) => {
      setVersions(res.versions);
      setCurrent(res.current);
    });
  }, [projectId, file._id]);

  async function restore(index: number) {
    await fileApi.restore(projectId, file._id, index);
    onRestored();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex h-[80vh] w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-64 shrink-0 overflow-auto border-r border-slate-200">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="font-semibold text-slate-900">History</h3>
            <p className="truncate text-xs text-slate-400">{file.path}</p>
          </div>
          {versions === null ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : versions.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-400">No previous versions yet. Versions are saved on every edit.</p>
          ) : (
            <ul>
              {versions.map((v) => (
                <li key={v.index}>
                  <button
                    onClick={() => setSelected(v)}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-100 ${
                      selected?.index === v.index ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
                    }`}
                  >
                    {new Date(v.savedAt).toLocaleString()}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="text-sm text-slate-500">
              {selected ? 'Previous version preview' : 'Select a version to preview'}
            </span>
            <div className="flex gap-2">
              {selected && (
                <Button onClick={() => restore(selected.index)}>Restore this version</Button>
              )}
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
          <pre className="flex-1 overflow-auto bg-slate-50 p-4 font-mono text-xs text-slate-800">
            {selected ? selected.content : current}
          </pre>
        </div>
      </div>
    </div>
  );
}
