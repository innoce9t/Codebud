import { useNavigate } from 'react-router-dom';
import { Code2, LogOut } from 'lucide-react';
import { useAuth } from '../auth';
import { Button } from './ui';

export default function TopBar({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
      <div className="flex items-center gap-3">
        <button onClick={() => nav('/')} className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Code2 className="h-4 w-4" />
          </span>
          CodeBud
        </button>
        {children}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-slate-500 sm:inline">{user?.email}</span>
        <Button
          variant="subtle"
          onClick={async () => {
            await logout();
            nav('/login');
          }}
        >
          <LogOut className="h-4 w-4" /> Log out
        </Button>
      </div>
    </header>
  );
}
