import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { Spinner } from './components/ui';
import AppLayout from './components/AppLayout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import NewProject from './pages/NewProject';
import Workspace from './pages/Workspace';
import Workspaces from './pages/Workspaces';
import AiModels from './pages/AiModels';
import Theme from './pages/Theme';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Editor from './pages/Editor';
import type { ReactNode } from 'react';

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
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

      {/* App shell with collapsible sidebar */}
      <Route
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<NewProject />} />
        <Route path="/workspaces" element={<Workspaces />} />
        <Route path="/workspace/:type" element={<Workspace />} />
        <Route path="/ai-models" element={<AiModels />} />
        <Route path="/theme" element={<Theme />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        {/* IDE lives in the shell too, but the sidebar shows collapsed there */}
        <Route path="/project/:id" element={<Editor />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
