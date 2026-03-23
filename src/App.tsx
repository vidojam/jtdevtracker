import { Link, Navigate, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import DeploymentInformationPage from './pages/DeploymentInformationPage.tsx';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import ProjectSnapshotsPage from './pages/ProjectSnapshotsPage';
import TechStackPage from './pages/TechStackPage';
import { useEffect, useState } from 'react';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('jt-theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('jt-theme', theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-800/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-semibold">JT Dev Tracker</Link>
          <button
            onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white transition hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900"
          >
            {theme === 'light' ? 'Dark' : 'Light'} Mode
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-6">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/project/:projectId" element={<ProjectDetailsPage />} />
          <Route path="/project/:projectId/deployment-information" element={<DeploymentInformationPage />} />
          <Route path="/project/:projectId/snapshots" element={<ProjectSnapshotsPage />} />
          <Route path="/project/:projectId/tech-stack" element={<TechStackPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
