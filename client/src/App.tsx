import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { Spinner } from './components/ui';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import Editor from './pages/Editor';
import type { ReactNode } from 'react';

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? null : user ? <Navigate to="/" replace /> : <AuthPage />}
      />
      <Route
        path="/"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/workspace/:type"
        element={
          <Protected>
            <Workspace />
          </Protected>
        }
      />
      <Route
        path="/project/:id"
        element={
          <Protected>
            <Editor />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
