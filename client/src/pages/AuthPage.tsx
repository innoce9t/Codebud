import { useState } from 'react';
import { ArrowLeft, Code2 } from 'lucide-react';
import { useAuth } from '../auth';
import { authApi } from '../api';
import { Button, Field } from '../components/ui';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';

export default function AuthPage() {
  const { login, signup, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setNotice('');
    setPassword('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'signup') {
        await signup(name, email, password);
      } else if (mode === 'forgot') {
        const res = await authApi.forgotPassword(email);
        // No mail service in this demo — surface the token and jump to the reset step.
        if (res.demoToken) {
          setToken(res.demoToken);
          setMode('reset');
          setNotice(
            `For this demo, your reset link isn't emailed — we've filled in your reset code below. It expires in ${res.expiresInMinutes ?? 30} minutes.`,
          );
        } else {
          setNotice('If an account exists for that email, a reset link has been sent.');
        }
      } else if (mode === 'reset') {
        await resetPassword(token.trim(), password);
        // resetPassword signs the user in; the router will redirect into the app.
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === 'forgot' ? 'Reset your password' : mode === 'reset' ? 'Choose a new password' : 'CodeBud';
  const subtitle =
    mode === 'forgot'
      ? 'Enter your email to get a reset code.'
      : mode === 'reset'
      ? 'Enter the reset code and your new password.'
      : 'Your AI-powered coding workspace';

  return (
    <div className="force-light relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-brand-50 p-4 text-slate-900">
      <video
        autoPlay
        muted
        loop
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-white/80" />
      <div className="relative w-full max-w-sm z-10">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
            <Code2 className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm"
        >
          {(mode === 'login' || mode === 'signup') && (
            <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
              {(['login', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 rounded-md py-1.5 font-medium capitalize transition ${
                    mode === m ? 'bg-surface text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {m === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" /> Back to log in
            </button>
          )}

          {mode === 'signup' && (
            <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
          )}

          {mode !== 'reset' && (
            <Field
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          )}

          {mode === 'reset' && (
            <Field
              label="Reset code"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your reset code"
            />
          )}

          {mode !== 'forgot' && (
            <Field
              label={mode === 'reset' ? 'New password' : 'Password'}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          )}

          {mode === 'login' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          {notice && (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{notice}</p>
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={busy} className="w-full">
            {busy
              ? 'Please wait…'
              : mode === 'login'
              ? 'Log in'
              : mode === 'signup'
              ? 'Create account'
              : mode === 'forgot'
              ? 'Send reset code'
              : 'Reset password'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Sessions are secured with httpOnly JWT cookies.
        </p>
      </div>
    </div>
  );
}
