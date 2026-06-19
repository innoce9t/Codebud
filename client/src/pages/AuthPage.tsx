import { useState } from 'react';
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-5xl">🧠</div>
          <h1 className="mt-2 text-3xl font-bold text-white">CodeBud</h1>
          <p className="mt-1 text-sm text-slate-400">Your AI-powered coding workspace</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur"
        >
          <div className="flex rounded-lg bg-slate-800 p-1 text-sm">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md py-1.5 font-medium capitalize transition ${
                  mode === m ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
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

          {error && <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">
          Sessions are secured with httpOnly JWT cookies.
        </p>
      </div>
    </div>
  );
}
