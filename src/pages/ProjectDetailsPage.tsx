import { Link, useParams } from 'react-router-dom';
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useProjects } from '../context/ProjectContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import LoadingOverlay from '../components/ui/LoadingOverlay';

export default function ProjectDetailsPage() {
  const { projectId } = useParams();
  const { projects, addAction, deleteAction, actionLoading, isLoading } = useProjects();
  const [todayAction, setTodayAction] = useState('');
  const [todayActionNotes, setTodayActionNotes] = useState('');
  const [error, setError] = useState('');
  const [deleteActionId, setDeleteActionId] = useState<string | null>(null);

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

  const orderedActions = [...project.actions].sort((a, b) => a.date.getTime() - b.date.getTime());

  const submitAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!todayAction.trim() || !todayActionNotes.trim()) {
      setError('Today\'s action and notes are required');
      return;
    }
    setError('');
    await addAction(project.id, { todayAction, todayActionNotes });
    setTodayAction('');
    setTodayActionNotes('');
  };

  return (
    <div className="space-y-4">
      <LoadingOverlay visible={actionLoading} />
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <Link to="/" className="text-sm underline">Back</Link>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">Purpose: {project.purpose}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">Program Deploy: {project.programDeployed ? 'Yes' : 'No'}</p>
        {project.techStack.length > 0 ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Tech Stack:</span>
            <span className="ml-1 inline-flex flex-wrap gap-x-3 gap-y-1">
              {project.techStack.map((entry) => (
                <a key={entry.name} href={entry.url} className="underline" target="_blank" rel="noreferrer">
                  {entry.name}
                </a>
              ))}
            </span>
          </div>
        ) : null}
        {project.tags.length > 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Tags: {project.tags.join(', ')}</p>
        ) : null}
        <p className="text-sm text-slate-600 dark:text-slate-300">Initiation Date: {project.initiationDate.toLocaleDateString()}</p>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Add Daily Action</h2>
        <form className="grid gap-3" onSubmit={submitAction}>
          <Input
            label="Today's Action"
            as="textarea"
            value={todayAction}
            onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setTodayAction(event.target.value)}
          />
          <Input
            label="Today's Action Notes"
            as="textarea"
            value={todayActionNotes}
            onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setTodayActionNotes(event.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div>
            <Button type="submit">Add Action</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Project History</h2>
        <div className="space-y-3">
          {orderedActions.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">No actions logged yet.</p>
          ) : (
            orderedActions.map((action) => (
              <div key={action.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">Date: {action.date.toLocaleString()}</p>
                  <Button variant="danger" onClick={() => setDeleteActionId(action.id)}>Delete</Button>
                </div>
                <p className="text-sm"><span className="font-medium">Last Action:</span> {action.lastAction || '-'}</p>
                <p className="text-sm"><span className="font-medium">Last Action Notes:</span> {action.lastActionNotes || '-'}</p>
                <p className="text-sm"><span className="font-medium">Today's Action:</span> {action.todayAction}</p>
                <p className="text-sm"><span className="font-medium">Today's Action Notes:</span> {action.todayActionNotes}</p>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal title="Delete Action" open={Boolean(deleteActionId)} onClose={() => setDeleteActionId(null)}>
        <p className="mb-4 text-sm">Delete this action entry?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteActionId(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!deleteActionId) return;
              await deleteAction(project.id, deleteActionId);
              setDeleteActionId(null);
            }}
          >
            Confirm Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
