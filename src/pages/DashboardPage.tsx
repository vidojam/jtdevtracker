import { Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useProjects } from '../context/ProjectContext';
import { filterProjects, sortProjects } from '../utils/projectUtils';
import { calculateProjectStats, getStaleProjects } from '../utils/stats';
import type { SortOrder, TechStackEntry } from '../types';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import LoadingOverlay from '../components/ui/LoadingOverlay';

interface ProjectFormState {
  name: string;
  initiationDate: string;
  purpose: string;
  programDeployed: boolean;
  techStack: TechStackEntry[];
  techStackInput: string;
  tagsInput: string;
}

const emptyForm: ProjectFormState = {
  name: '',
  initiationDate: '',
  purpose: '',
  programDeployed: false,
  techStack: [],
  techStackInput: '',
  tagsInput: '',
};

const parseTags = (raw: string): string[] => {
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, all) => all.findIndex((value) => value.toLowerCase() === tag.toLowerCase()) === index);
};

const buildTechEntryFromInputs = (rawText: string): TechStackEntry | null => {
  const text = rawText.trim();
  if (!text) return null;
  return { name: text, url: '' };
};

const dedupeTechStack = (entries: TechStackEntry[]): TechStackEntry[] => {
  const seen = new Set<string>();
  const unique: TechStackEntry[] = [];

  for (const entry of entries) {
    const name = entry.name.trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ name, url: '' });
  }

  return unique;
};

export default function DashboardPage() {
  const { projects, isLoading, actionLoading, storageMode, addProject, updateProject, deleteProject, toggleDeploy, importProjects } = useProjects();
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<ProjectFormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<ProjectFormState>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);
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
    const pendingEntry = buildTechEntryFromInputs(form.techStackInput);
    const nextTechStack = dedupeTechStack(
      pendingEntry ? [...form.techStack, pendingEntry] : form.techStack,
    );
    const payload = {
      name: form.name,
      initiationDate: form.initiationDate,
      purpose: form.purpose,
      programDeployed: form.programDeployed,
      techStack: nextTechStack,
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

  const addTechEntry = () => {
    const entry = buildTechEntryFromInputs(form.techStackInput);
    if (!entry) return;
    setForm((current) => ({
      ...current,
      techStack: dedupeTechStack([...current.techStack, entry]),
      techStackInput: '',
    }));
  };

  const removeTechEntry = (index: number) => {
    setForm((current) => ({ ...current, techStack: current.techStack.filter((_, i) => i !== index) }));
  };

  const startEdit = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    setEditingId(project.id);
    setForm({
      name: project.name,
      initiationDate: project.initiationDate.toISOString().slice(0, 10),
      purpose: project.purpose,
      programDeployed: project.programDeployed,
      techStack: project.techStack,
      techStackInput: '',
      tagsInput: project.tags.join(', '),
    });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
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
      <div ref={formRef}>
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
          <div className="md:col-span-2">
            <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">Tech Stack</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. React, Node.js, PostgreSQL, etc."
                value={form.techStackInput}
                onChange={(e) => setForm((c) => ({ ...c, techStackInput: e.target.value }))}
                className="flex-1 rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <Button type="button" variant="secondary" onClick={addTechEntry}>Add</Button>
            </div>
            {form.techStack.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {form.techStack.map((entry, index) => (
                  <li key={index} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/40">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 flex-1 break-words text-sm text-slate-700 dark:text-slate-300">
                        {entry.name}
                      </span>
                      <Button type="button" variant="danger" className="mt-0.5 shrink-0 px-2 py-0.5 text-xs" onClick={() => removeTechEntry(index)}>×</Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={form.programDeployed}
              onChange={(event) => setForm((current) => ({ ...current, programDeployed: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-400 text-slate-800 focus:ring-slate-500 dark:border-slate-700"
            />
            Program Deploy: Yes/No
          </label>
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
      </div>

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
              <div className="flex flex-col gap-1.5 rounded-md p-1.5" style={{ backgroundColor: project.colorCode }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-slate-900" title={project.name}>{project.name}</h2>
                    <p className="text-xs text-slate-700">#{index + 1} • Initiated: {project.initiationDate.toLocaleDateString()}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button className="px-2 py-1 text-xs" variant="secondary" onClick={() => startEdit(project.id)}>Edit</Button>
                    <Button className="px-2 py-1 text-xs" variant="danger" onClick={() => setDeleteId(project.id)}>Delete</Button>
                  </div>
                </div>
                <p className="mt-1 truncate text-xs text-slate-800" title={project.purpose}>{project.purpose}</p>
                <button
                  type="button"
                  onClick={() => void toggleDeploy(project.id)}
                  className={`mt-0.5 self-start rounded px-1.5 py-0.5 text-[11px] font-medium transition ${
                    project.programDeployed
                      ? 'bg-green-600/20 text-green-900 hover:bg-green-600/30'
                      : 'bg-slate-900/10 text-slate-800 hover:bg-slate-900/20'
                  }`}
                  title="Click to toggle deploy status"
                >
                  Deploy: {project.programDeployed ? 'Yes ✓' : 'No'}
                </button>
                <div className="mt-1 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap gap-1">
                    {project.tags.slice(0, 3).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSearchTerm(tag)}
                        className="rounded-full bg-slate-900/10 px-1.5 py-0.5 text-[11px] text-slate-900 transition hover:bg-slate-900/20"
                        title={`Filter by tag: ${tag}`}
                      >
                        #{tag}
                      </button>
                    ))}
                    {project.tags.length > 3 ? <span className="text-[11px] text-slate-700">+{project.tags.length - 3}</span> : null}
                  </div>
                  <div className="min-w-0 flex flex-1 justify-end">
                    <Link className="text-xs font-medium text-slate-900 underline" to={`/project/${project.id}`}>
                      Details
                    </Link>
                  </div>
                </div>
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
