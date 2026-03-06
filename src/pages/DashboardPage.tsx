import { Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useProjects } from '../context/ProjectContext';
import { filterProjects, sortProjects } from '../utils/projectUtils';
import { calculateProjectStats, getStaleProjects } from '../utils/stats';
import type { SortOrder } from '../types';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import LoadingOverlay from '../components/ui/LoadingOverlay';

interface ProjectFormState {
  name: string;
  initiationDate: string;
  purpose: string;
  tagsInput: string;
}

const emptyForm: ProjectFormState = { name: '', initiationDate: '', purpose: '', tagsInput: '' };

const parseTags = (raw: string): string[] => {
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, all) => all.findIndex((value) => value.toLowerCase() === tag.toLowerCase()) === index);
};

export default function DashboardPage() {
  const { projects, isLoading, actionLoading, storageMode, addProject, updateProject, deleteProject, importProjects } = useProjects();
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<ProjectFormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<ProjectFormState>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const notificationSupported = typeof Notification !== 'undefined';
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    notificationSupported ? Notification.permission : 'unsupported',
  );

  const filtered = useMemo(() => {
    return sortProjects(filterProjects(projects, searchTerm), sortOrder);
  }, [projects, searchTerm, sortOrder]);

  const stats = useMemo(() => calculateProjectStats(projects), [projects]);
  const staleProjectsList = useMemo(() => getStaleProjects(projects), [projects]);

  useEffect(() => {
    if (!notificationSupported || notificationPermission !== 'granted' || staleProjectsList.length === 0) return;

    const todayKey = new Date().toISOString().slice(0, 10);
    const lastReminderDate = localStorage.getItem('jt-last-reminder-date');
    if (lastReminderDate === todayKey) return;

    const title = `JT Dev Tracker Reminder`;
    const body = `${staleProjectsList.length} project(s) need updates: ${staleProjectsList
      .slice(0, 3)
      .map((project) => project.name)
      .join(', ')}${staleProjectsList.length > 3 ? '...' : ''}`;

    new Notification(title, { body });
    localStorage.setItem('jt-last-reminder-date', todayKey);
  }, [notificationPermission, notificationSupported, staleProjectsList]);

  const enableNotifications = async () => {
    if (!notificationSupported) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const validate = (): boolean => {
    const nextErrors: Partial<ProjectFormState> = {};
    if (!form.name.trim()) nextErrors.name = 'Project name is required';
    if (!form.initiationDate) nextErrors.initiationDate = 'Initiation date is required';
    if (!form.purpose.trim()) nextErrors.purpose = 'Purpose is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    const payload = {
      name: form.name,
      initiationDate: form.initiationDate,
      purpose: form.purpose,
      tags: parseTags(form.tagsInput),
    };
    if (editingId) {
      await updateProject(editingId, payload);
      setEditingId(null);
    } else {
      await addProject(payload);
    }
    setForm(emptyForm);
    setErrors({});
  };

  const onInputChange =
    (key: keyof ProjectFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
    };

  const startEdit = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    setEditingId(project.id);
    setForm({
      name: project.name,
      initiationDate: project.initiationDate.toISOString().slice(0, 10),
      purpose: project.purpose,
      tagsInput: project.tags.join(', '),
    });
  };

  const doExport = () => {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `jt-projects-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openImportPicker = () => {
    fileInputRef.current?.click();
  };

  const onImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as unknown;
      await importProjects(parsed);
      setImportError(null);
      setSearchTerm('');
      setEditingId(null);
      setDeleteId(null);
      setForm(emptyForm);
      setErrors({});
    } catch {
      setImportError('Import failed. Please use a valid exported JSON file.');
    }
  };

  if (isLoading) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Loading projects...</p>;
  }

  return (
    <div className="space-y-6">
      <LoadingOverlay visible={actionLoading} />
      <Card>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Project Dashboard</h1>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-100">
            Storage: {storageMode === 'remote' ? 'Shared Sync' : 'Local Only'}
          </span>
        </div>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
          <Input
            label="Project Name"
            value={form.name}
            onChange={onInputChange('name')}
            error={errors.name}
          />
          <Input
            type="date"
            label="Initiation Date"
            value={form.initiationDate}
            onChange={onInputChange('initiationDate')}
            error={errors.initiationDate}
          />
          <Input
            as="textarea"
            label="Purpose"
            className="md:col-span-2"
            value={form.purpose}
            onChange={onInputChange('purpose')}
            error={errors.purpose}
          />
          <Input
            label="Tags (comma-separated)"
            className="md:col-span-2"
            value={form.tagsInput}
            onChange={onInputChange('tagsInput')}
            placeholder="frontend, api, urgent"
            error={errors.tagsInput}
          />
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit">{editingId ? 'Update Project' : 'Add Project'}</Button>
            {editingId ? (
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel Edit
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          label="Search by name or purpose"
          value={searchTerm}
          onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSearchTerm(event.target.value)}
          placeholder="Search projects"
        />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setSortOrder((current) => (current === 'newest' ? 'oldest' : 'newest'))}
          >
            Sort: {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
          </Button>
          <Button variant="secondary" onClick={doExport}>Export JSON</Button>
          <Button variant="secondary" onClick={openImportPicker}>Import JSON</Button>
          {searchTerm ? (
            <Button variant="secondary" onClick={() => setSearchTerm('')}>Clear Filter</Button>
          ) : null}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={onImportFile}
      />
      {importError ? <p className="text-sm text-red-600">{importError}</p> : null}

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-slate-500">Total Projects</p>
          <p className="text-2xl font-semibold">{stats.totalProjects}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Total Actions</p>
          <p className="text-2xl font-semibold">{stats.totalActions}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Active Today</p>
          <p className="text-2xl font-semibold">{stats.activeToday}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Stale (7+ days)</p>
          <p className="text-2xl font-semibold">{stats.staleProjects}</p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Project Reminders</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {staleProjectsList.length === 0
                ? 'All projects are recently updated.'
                : `${staleProjectsList.length} project(s) have no recent actions in the last 7 days.`}
            </p>
          </div>
          <Button
            variant="secondary"
            type="button"
            onClick={enableNotifications}
            disabled={!notificationSupported || notificationPermission === 'granted'}
          >
            {!notificationSupported
              ? 'Notifications Unsupported'
              : notificationPermission === 'granted'
                ? 'Notifications Enabled'
                : 'Enable Notifications'}
          </Button>
        </div>
        {staleProjectsList.length > 0 ? (
          <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            {staleProjectsList.map((project) => (
              <li key={project.id} className="rounded border border-slate-200 px-3 py-2 dark:border-slate-700">
                <span className="font-medium">{project.name}</span>
                <span className="text-slate-600 dark:text-slate-300"> — last update: {project.actions.at(-1)?.date.toLocaleDateString() ?? 'none'}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600 dark:text-slate-300">No projects match your search.</p>
          </Card>
        ) : (
          filtered.map((project, index) => (
            <Card key={project.id} className="border-0" >
              <div className="rounded-md p-4" style={{ backgroundColor: project.colorCode }}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-700">#{index + 1}</p>
                    <h2 className="text-lg font-semibold text-slate-900">{project.name}</h2>
                    <p className="text-sm text-slate-700">Initiated: {project.initiationDate.toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => startEdit(project.id)}>Edit</Button>
                    <Button variant="danger" onClick={() => setDeleteId(project.id)}>Delete</Button>
                  </div>
                </div>
                <p className="mb-3 text-sm text-slate-800">{project.purpose}</p>
                {project.tags.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSearchTerm(tag)}
                        className="rounded-full bg-slate-900/10 px-2 py-1 text-xs text-slate-900 transition hover:bg-slate-900/20"
                        title={`Filter by tag: ${tag}`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                ) : null}
                <Link className="text-sm font-medium text-slate-900 underline" to={`/project/${project.id}`}>
                  View Details
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal title="Delete Project" open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
        <p className="mb-4 text-sm">Are you sure you want to delete this project?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!deleteId) return;
              await deleteProject(deleteId);
              setDeleteId(null);
            }}
          >
            Confirm Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
