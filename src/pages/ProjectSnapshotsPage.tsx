import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import Card from '../components/ui/Card';

const triggerLabel: Record<string, string> = {
  'project-created': 'Project Created',
  'project-updated': 'Project Updated',
  'action-added': 'Action Added',
  'action-deleted': 'Action Deleted',
  'deploy-toggled': 'Deploy Toggled',
};

export default function ProjectSnapshotsPage() {
  const { projectId } = useParams();
  const { projects, isLoading } = useProjects();

  const project = useMemo(() => projects.find((item) => item.id === projectId), [projects, projectId]);

  if (isLoading) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Loading project...</p>;
  }

  if (!project) {
    return (
      <Card>
        <p className="mb-3 text-sm">Project not found.</p>
        <Link to="/" className="text-sm underline">Back to dashboard</Link>
      </Card>
    );
  }

  const orderedSnapshots = [...(project.snapshots ?? [])].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-4">
      <Card className="border-sky-300 bg-sky-100 dark:border-sky-700/60 dark:bg-slate-900/95">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{project.name} — Project Snapshots</h1>
          <Link to={`/project/${project.id}`} className="text-sm underline">Back to Project</Link>
        </div>

        {orderedSnapshots.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No snapshots yet.</p>
        ) : (
          <div className="space-y-2">
            {orderedSnapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="rounded-md border border-sky-300 bg-white p-3 dark:border-sky-700/50 dark:bg-slate-800/85"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {triggerLabel[snapshot.trigger] ?? 'Saved'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{snapshot.date.toLocaleString()}</p>
                <div className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  <p><span className="font-medium">Purpose:</span> {snapshot.screen.purpose || '-'}</p>
                  <p><span className="font-medium">Program Deploy:</span> {snapshot.screen.programDeployed ? 'Yes' : 'No'}</p>
                  <p><span className="font-medium">Tags:</span> {snapshot.screen.tags.length > 0 ? snapshot.screen.tags.join(', ') : '-'}</p>
                  <p><span className="font-medium">Total Actions:</span> {snapshot.screen.totalActions}</p>
                  <p><span className="font-medium">Last Action:</span> {snapshot.screen.lastAction || '-'}</p>
                  <p><span className="font-medium">Last Action Notes:</span> {snapshot.screen.lastActionNotes || '-'}</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Tech Stack</p>
                  {snapshot.screen.techStack.length === 0 ? (
                    <p className="text-sm text-slate-700 dark:text-slate-300">-</p>
                  ) : (
                    <ul className="mt-1 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                      {snapshot.screen.techStack.map((tech) => (
                        <li key={tech}>• {tech}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
