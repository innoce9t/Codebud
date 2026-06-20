import { useState } from 'react';
import { Code2 } from 'lucide-react';
import { useAuth } from '../auth';
import { Button, Field } from '../components/ui';

export default function AuthPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await signup(name, email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="force-light flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-brand-50 p-4 text-slate-900">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
            <Code2 className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">CodeBud</h1>
          <p className="mt-1 text-sm text-slate-500">Your AI-powered coding workspace</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm"
        >
          <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md py-1.5 font-medium capitalize transition ${
                  mode === m ? 'bg-surface text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          {mode === 'signup' && (
            <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
          )}
          <Field
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Field
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Sessions are secured with httpOnly JWT cookies.
        </p>
      </div>
    </div>
  );
}
