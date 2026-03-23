import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useProjects } from '../context/ProjectContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import LoadingOverlay from '../components/ui/LoadingOverlay';

interface DeploymentFormState {
  deployedOn: string;
  date: string;
  cost: string;
  term: string;
  benefits: string;
}

const emptyForm: DeploymentFormState = {
  deployedOn: '',
  date: '',
  cost: '',
  term: '',
  benefits: '',
};

export default function DeploymentInformationPage() {
  const { projectId } = useParams();
  const { projects, isLoading, actionLoading, updateDeploymentInfo } = useProjects();

  const project = useMemo(() => projects.find((item) => item.id === projectId), [projects, projectId]);

  const [form, setForm] = useState<DeploymentFormState>(emptyForm);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!project) return;
    setForm({
      deployedOn: project.deploymentInfo?.deployedOn ?? '',
      date: project.deploymentInfo?.date ?? '',
      cost: project.deploymentInfo?.cost ?? '',
      term: project.deploymentInfo?.term ?? '',
      benefits: project.deploymentInfo?.benefits ?? '',
    });
  }, [project]);

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

  const onChange =
    (key: keyof DeploymentFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
      if (message) setMessage('');
    };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await updateDeploymentInfo(project.id, form);
    setMessage('Deployment information saved.');
  };

  return (
    <div className="space-y-4">
      <LoadingOverlay visible={actionLoading} />
      <Card className="border-sky-300 bg-sky-100 dark:border-sky-700/60 dark:bg-slate-900/95">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{project.name} — Deployment Information</h1>
          <Link to={`/project/${project.id}`} className="text-sm underline">Back to Project</Link>
        </div>

        <form className="grid gap-3" onSubmit={onSubmit}>
          <Input
            label="Deployed On"
            value={form.deployedOn}
            onChange={onChange('deployedOn')}
            placeholder="e.g. Render, Firebase, Firestore"
          />
          <Input
            type="date"
            label="Date"
            value={form.date}
            onChange={onChange('date')}
          />
          <Input
            label="Cost"
            value={form.cost}
            onChange={onChange('cost')}
            placeholder="e.g. $7/month"
          />
          <Input
            label="Term"
            value={form.term}
            onChange={onChange('term')}
            placeholder="e.g. Monthly, Annual"
          />
          <Input
            as="textarea"
            label="Deployed Benefits"
            value={form.benefits}
            onChange={onChange('benefits')}
            placeholder="Describe reliability, scaling, uptime, cost savings, etc."
          />
          {message ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
          <div>
            <Button type="submit">Save Deployment Information</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
