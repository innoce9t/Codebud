import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button } from './ui';

export default function TopBar({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <button onClick={() => nav('/')} className="flex items-center gap-2 text-lg font-bold text-white">
          <span>🧠</span> CodeBud
        </button>
        {children}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-slate-400 sm:inline">{user?.email}</span>
        <Button
          variant="subtle"
          onClick={async () => {
            await logout();
            nav('/login');
          }}
        >
          Log out
        </Button>
      </div>
    </header>
  );
}
