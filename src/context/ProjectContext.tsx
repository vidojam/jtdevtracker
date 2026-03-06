import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Project, ProjectAction } from '../types';
import { generateId, getProjectColor } from '../utils/projectUtils';

const STORAGE_KEY = 'jt-dev-tracker-projects';
const API_ENDPOINT = '/api/projects';

interface ProjectInput {
  name: string;
  initiationDate: string;
  purpose: string;
  tags: string[];
}

interface ActionInput {
  todayAction: string;
  todayActionNotes: string;
}

interface ProjectContextValue {
  projects: Project[];
  isLoading: boolean;
  actionLoading: boolean;
  storageMode: 'remote' | 'local';
  addProject: (payload: ProjectInput) => Promise<void>;
  updateProject: (projectId: string, payload: ProjectInput) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  addAction: (projectId: string, payload: ActionInput) => Promise<void>;
  deleteAction: (projectId: string, actionId: string) => Promise<void>;
  importProjects: (payload: unknown) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

const normalizeImportedProjects = (payload: unknown): Project[] => {
  if (!Array.isArray(payload)) {
    throw new Error('Invalid JSON format: expected an array of projects.');
  }

  return payload.map((project, projectIndex) => {
    const item = project as Partial<Project> & {
      initiationDate?: string | Date;
      actions?: Array<Partial<ProjectAction> & { date?: string | Date }>;
    };

    const actions = Array.isArray(item.actions)
      ? item.actions.map((action) => ({
          id: typeof action.id === 'string' ? action.id : generateId(),
          date: new Date(action.date ?? new Date()),
          lastAction: typeof action.lastAction === 'string' ? action.lastAction : undefined,
          lastActionNotes: typeof action.lastActionNotes === 'string' ? action.lastActionNotes : undefined,
          todayAction: typeof action.todayAction === 'string' ? action.todayAction : '',
          todayActionNotes: typeof action.todayActionNotes === 'string' ? action.todayActionNotes : '',
        }))
      : [];

    return {
      id: typeof item.id === 'string' ? item.id : generateId(),
      name: typeof item.name === 'string' ? item.name : `Imported Project ${projectIndex + 1}`,
      initiationDate: new Date(item.initiationDate ?? new Date()),
      purpose: typeof item.purpose === 'string' ? item.purpose : '',
      colorCode: typeof item.colorCode === 'string' ? item.colorCode : getProjectColor(projectIndex),
      tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      actions,
    };
  });
};

const parseProjects = (raw: string | null): Project[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<Omit<Project, 'initiationDate' | 'actions'> & { initiationDate: string; actions: Array<Omit<ProjectAction, 'date'> & { date: string }>; }>;
    return parsed.map((project) => ({
      ...project,
      tags: Array.isArray(project.tags) ? project.tags : [],
      initiationDate: new Date(project.initiationDate),
      actions: project.actions.map((action) => ({ ...action, date: new Date(action.date) })),
    }));
  } catch {
    return [];
  }
};

const parseProjectsFromUnknown = (payload: unknown): Project[] => {
  if (!Array.isArray(payload)) return [];
  return payload.map((project) => {
    const item = project as Partial<Project> & {
      initiationDate?: string | Date;
      actions?: Array<Partial<ProjectAction> & { date?: string | Date }>;
    };

    return {
      id: typeof item.id === 'string' ? item.id : generateId(),
      name: typeof item.name === 'string' ? item.name : 'Untitled Project',
      initiationDate: new Date(item.initiationDate ?? new Date()),
      purpose: typeof item.purpose === 'string' ? item.purpose : '',
      colorCode: typeof item.colorCode === 'string' ? item.colorCode : '#E0F2FE',
      tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      actions: Array.isArray(item.actions)
        ? item.actions.map((action) => ({
            id: typeof action.id === 'string' ? action.id : generateId(),
            date: new Date(action.date ?? new Date()),
            lastAction: typeof action.lastAction === 'string' ? action.lastAction : undefined,
            lastActionNotes: typeof action.lastActionNotes === 'string' ? action.lastActionNotes : undefined,
            todayAction: typeof action.todayAction === 'string' ? action.todayAction : '',
            todayActionNotes: typeof action.todayActionNotes === 'string' ? action.todayActionNotes : '',
          }))
        : [],
    };
  });
};

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [storageMode, setStorageMode] = useState<'remote' | 'local'>('local');
  const remoteUpdatedAtRef = useRef(0);
  const skipNextRemotePushRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const response = await fetch(API_ENDPOINT);
        if (!response.ok) {
          throw new Error('Remote sync unavailable');
        }
        const payload = (await response.json()) as { updatedAt?: number; projects?: unknown[] };
        if (!mounted) return;
        setProjects(parseProjectsFromUnknown(payload.projects));
        const updatedAt = typeof payload.updatedAt === 'number' ? payload.updatedAt : 0;
        remoteUpdatedAtRef.current = updatedAt;
        setStorageMode('remote');
        setIsLoading(false);
      } catch {
        if (!mounted) return;
        const stored = localStorage.getItem(STORAGE_KEY);
        setProjects(parseProjects(stored));
        setStorageMode('local');
        setIsLoading(false);
      }
    };

    void initialize();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (storageMode === 'remote') {
      if (skipNextRemotePushRef.current) {
        skipNextRemotePushRef.current = false;
        return;
      }

      const syncRemote = async () => {
        try {
          const response = await fetch(API_ENDPOINT, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projects }),
          });
          if (!response.ok) return;
          const payload = (await response.json()) as { updatedAt?: number };
          const updatedAt = typeof payload.updatedAt === 'number' ? payload.updatedAt : Date.now();
          remoteUpdatedAtRef.current = updatedAt;
        } catch {
          setStorageMode('local');
          localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        }
      };
      void syncRemote();
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects, isLoading, storageMode]);

  useEffect(() => {
    if (isLoading || storageMode !== 'remote') return;

    const timer = setInterval(async () => {
      try {
        const response = await fetch(API_ENDPOINT);
        if (!response.ok) return;
        const payload = (await response.json()) as { updatedAt?: number; projects?: unknown[] };
        const updatedAt = typeof payload.updatedAt === 'number' ? payload.updatedAt : 0;
        if (updatedAt <= remoteUpdatedAtRef.current) return;

        skipNextRemotePushRef.current = true;
        setProjects(parseProjectsFromUnknown(payload.projects));
        remoteUpdatedAtRef.current = updatedAt;
      } catch {
        setStorageMode('local');
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [isLoading, storageMode]);

  const runAction = async (handler: () => void): Promise<void> => {
    setActionLoading(true);
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        handler();
        resolve();
      }, 150);
    });
    setActionLoading(false);
  };

  const addProject = async (payload: ProjectInput) => {
    await runAction(() => {
      setProjects((current) => [
        {
          id: generateId(),
          name: payload.name.trim(),
          initiationDate: new Date(payload.initiationDate),
          purpose: payload.purpose.trim(),
          colorCode: getProjectColor(current.length),
          tags: payload.tags,
          actions: [],
        },
        ...current,
      ]);
    });
  };

  const updateProject = async (projectId: string, payload: ProjectInput) => {
    await runAction(() => {
      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? {
                ...project,
                name: payload.name.trim(),
                initiationDate: new Date(payload.initiationDate),
                purpose: payload.purpose.trim(),
                tags: payload.tags,
              }
            : project,
        ),
      );
    });
  };

  const deleteProject = async (projectId: string) => {
    await runAction(() => {
      setProjects((current) => current.filter((project) => project.id !== projectId));
    });
  };

  const addAction = async (projectId: string, payload: ActionInput) => {
    await runAction(() => {
      setProjects((current) =>
        current.map((project) => {
          if (project.id !== projectId) return project;
          const previous = project.actions[project.actions.length - 1];
          const entry: ProjectAction = {
            id: generateId(),
            date: new Date(),
            lastAction: previous?.todayAction,
            lastActionNotes: previous?.todayActionNotes,
            todayAction: payload.todayAction.trim(),
            todayActionNotes: payload.todayActionNotes.trim(),
          };
          return {
            ...project,
            actions: [...project.actions, entry],
          };
        }),
      );
    });
  };

  const deleteAction = async (projectId: string, actionId: string) => {
    await runAction(() => {
      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? { ...project, actions: project.actions.filter((action) => action.id !== actionId) }
            : project,
        ),
      );
    });
  };

  const importProjects = async (payload: unknown) => {
    await runAction(() => {
      const normalized = normalizeImportedProjects(payload);
      setProjects(normalized);
    });
  };

  const value = useMemo<ProjectContextValue>(() => {
    return {
      projects,
      isLoading,
      actionLoading,
      storageMode,
      addProject,
      updateProject,
      deleteProject,
      addAction,
      deleteAction,
      importProjects,
    };
  }, [projects, isLoading, actionLoading, storageMode]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within ProjectProvider');
  }
  return context;
}
