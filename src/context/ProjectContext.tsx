import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { DeploymentInfo, Project, ProjectAction, ProjectSnapshot, ProjectSnapshotScreen, TechStackEntry } from '../types';
import { generateId, getProjectColor } from '../utils/projectUtils';

const STORAGE_KEY = 'jt-dev-tracker-projects';
const API_ENDPOINT = '/api/projects';

interface ProjectInput {
  name: string;
  initiationDate: string;
  purpose: string;
  programDeployed: boolean;
  techStack: TechStackEntry[];
  tags: string[];
}

interface ActionInput {
  todayAction: string;
  todayActionNotes: string;
}

interface DeploymentInfoInput {
  deployedOn: string;
  date: string;
  cost: string;
  term: string;
  benefits: string;
}

interface ProjectContextValue {
  projects: Project[];
  isLoading: boolean;
  actionLoading: boolean;
  storageMode: 'remote' | 'local';
  addProject: (payload: ProjectInput) => Promise<void>;
  updateProject: (projectId: string, payload: ProjectInput) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  toggleDeploy: (projectId: string) => Promise<void>;
  addAction: (projectId: string, payload: ActionInput) => Promise<void>;
  deleteAction: (projectId: string, actionId: string) => Promise<void>;
  updateDeploymentInfo: (projectId: string, payload: DeploymentInfoInput) => Promise<void>;
  importProjects: (payload: unknown) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

const normalizeDeploymentInfo = (payload: unknown): DeploymentInfo | undefined => {
  if (!payload || typeof payload !== 'object') return undefined;
  const item = payload as Partial<DeploymentInfo>;
  return {
    deployedOn: typeof item.deployedOn === 'string' ? item.deployedOn : '',
    date: typeof item.date === 'string' ? item.date : '',
    cost: typeof item.cost === 'string' ? item.cost : '',
    term: typeof item.term === 'string' ? item.term : '',
    benefits: typeof item.benefits === 'string' ? item.benefits : '',
  };
};

const buildSnapshotScreen = (project: Pick<Project, 'purpose' | 'programDeployed' | 'techStack' | 'tags' | 'actions'>): ProjectSnapshotScreen => {
  const lastAction = project.actions.at(-1);
  return {
    purpose: project.purpose,
    programDeployed: project.programDeployed,
    techStack: project.techStack.map((entry) => entry.name),
    tags: [...project.tags],
    totalActions: project.actions.length,
    lastAction: lastAction?.todayAction,
    lastActionNotes: lastAction?.todayActionNotes,
  };
};

const normalizeSnapshotScreen = (
  screen: unknown,
  fallbackProject: Pick<Project, 'purpose' | 'programDeployed' | 'techStack' | 'tags' | 'actions'>,
): ProjectSnapshotScreen => {
  const fallback = buildSnapshotScreen(fallbackProject);
  if (!screen || typeof screen !== 'object') return fallback;

  const item = screen as Partial<ProjectSnapshotScreen>;
  return {
    purpose: typeof item.purpose === 'string' ? item.purpose : fallback.purpose,
    programDeployed: typeof item.programDeployed === 'boolean' ? item.programDeployed : fallback.programDeployed,
    techStack: Array.isArray(item.techStack)
      ? item.techStack.filter((tech): tech is string => typeof tech === 'string')
      : fallback.techStack,
    tags: Array.isArray(item.tags)
      ? item.tags.filter((tag): tag is string => typeof tag === 'string')
      : fallback.tags,
    totalActions: typeof item.totalActions === 'number' ? item.totalActions : fallback.totalActions,
    lastAction: typeof item.lastAction === 'string' ? item.lastAction : fallback.lastAction,
    lastActionNotes: typeof item.lastActionNotes === 'string' ? item.lastActionNotes : fallback.lastActionNotes,
  };
};

const createSnapshot = (project: Project, trigger: ProjectSnapshot['trigger']): ProjectSnapshot => {
  return {
    id: generateId(),
    date: new Date(),
    trigger,
    screen: buildSnapshotScreen(project),
  };
};

const appendSnapshot = (project: Project, trigger: ProjectSnapshot['trigger']): Project => {
  return {
    ...project,
    snapshots: [...(project.snapshots ?? []), createSnapshot(project, trigger)],
  };
};

const normalizeImportedProjects = (payload: unknown): Project[] => {
  if (!Array.isArray(payload)) {
    throw new Error('Invalid JSON format: expected an array of projects.');
  }

  return payload.map((project, projectIndex) => {
    const item = project as Partial<Project> & {
      initiationDate?: string | Date;
      actions?: Array<Partial<ProjectAction> & { date?: string | Date }>;
      techStackLink?: string;
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

    const techStack = Array.isArray(item.techStack)
      ? item.techStack.filter((e): e is TechStackEntry =>
          typeof e === 'object' && e !== null &&
          typeof (e as TechStackEntry).name === 'string' &&
          typeof (e as TechStackEntry).url === 'string'
        )
      : (typeof item.techStackLink === 'string' && item.techStackLink
          ? [{ name: 'Tech Stack', url: item.techStackLink }]
          : []);

    const tags = Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string') : [];

    const snapshotFallbackProject: Pick<Project, 'purpose' | 'programDeployed' | 'techStack' | 'tags' | 'actions'> = {
      purpose: typeof item.purpose === 'string' ? item.purpose : '',
      programDeployed: typeof item.programDeployed === 'boolean' ? item.programDeployed : false,
      techStack,
      tags,
      actions,
    };

    const snapshots = Array.isArray(item.snapshots)
      ? item.snapshots.map((snapshot) => ({
          id: typeof snapshot.id === 'string' ? snapshot.id : generateId(),
          date: new Date(snapshot.date ?? new Date()),
          trigger:
            snapshot.trigger === 'project-created' ||
            snapshot.trigger === 'project-updated' ||
            snapshot.trigger === 'action-added' ||
            snapshot.trigger === 'action-deleted' ||
            snapshot.trigger === 'deploy-toggled'
              ? snapshot.trigger
              : 'project-updated',
          screen: normalizeSnapshotScreen(snapshot.screen, snapshotFallbackProject),
        }))
      : [];

    return {
      id: typeof item.id === 'string' ? item.id : generateId(),
      name: typeof item.name === 'string' ? item.name : `Imported Project ${projectIndex + 1}`,
      initiationDate: new Date(item.initiationDate ?? new Date()),
      purpose: typeof item.purpose === 'string' ? item.purpose : '',
      programDeployed: typeof item.programDeployed === 'boolean' ? item.programDeployed : false,
      deploymentInfo: normalizeDeploymentInfo(item.deploymentInfo),
      techStack,
      colorCode: typeof item.colorCode === 'string' ? item.colorCode : getProjectColor(projectIndex),
      tags,
      actions,
      snapshots,
    };
  });
};

const parseProjects = (raw: string | null): Project[] => {
  if (!raw) return [];
  try {
    type StoredProject = Omit<Project, 'initiationDate' | 'actions' | 'techStack' | 'snapshots'> & {
      initiationDate: string;
      actions: Array<Omit<ProjectAction, 'date'> & { date: string }>;
      snapshots?: Array<Omit<ProjectSnapshot, 'date'> & { date: string }>;
      techStack?: unknown;
      techStackLink?: string;
    };
    const parsed = JSON.parse(raw) as StoredProject[];
    return parsed.map(({ techStackLink, techStack: rawTechStack, ...project }) => {
      const actions = project.actions.map((action) => ({ ...action, date: new Date(action.date) }));
      const techStack = Array.isArray(rawTechStack)
        ? rawTechStack.filter((e): e is TechStackEntry =>
            typeof e === 'object' && e !== null &&
            typeof (e as TechStackEntry).name === 'string' &&
            typeof (e as TechStackEntry).url === 'string'
          )
        : (typeof techStackLink === 'string' && techStackLink
            ? [{ name: 'Tech Stack', url: techStackLink }]
            : []);
      const tags = Array.isArray(project.tags) ? project.tags : [];
      const snapshotFallbackProject: Pick<Project, 'purpose' | 'programDeployed' | 'techStack' | 'tags' | 'actions'> = {
        purpose: typeof project.purpose === 'string' ? project.purpose : '',
        programDeployed: typeof project.programDeployed === 'boolean' ? project.programDeployed : false,
        techStack,
        tags,
        actions,
      };

      return {
        ...project,
        programDeployed: typeof project.programDeployed === 'boolean' ? project.programDeployed : false,
        deploymentInfo: normalizeDeploymentInfo(project.deploymentInfo),
        techStack,
        tags,
        initiationDate: new Date(project.initiationDate),
        actions,
        snapshots: Array.isArray(project.snapshots)
          ? project.snapshots.map((snapshot) => ({
              ...snapshot,
              date: new Date(snapshot.date),
              screen: normalizeSnapshotScreen(snapshot.screen, snapshotFallbackProject),
            }))
          : [],
      };
    });
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
      snapshots?: Array<Partial<ProjectSnapshot> & { date?: string | Date }>;
      techStackLink?: string;
    };

    const techStack = Array.isArray(item.techStack)
      ? item.techStack.filter((e): e is TechStackEntry =>
          typeof e === 'object' && e !== null &&
          typeof (e as TechStackEntry).name === 'string' &&
          typeof (e as TechStackEntry).url === 'string'
        )
      : (typeof item.techStackLink === 'string' && item.techStackLink
          ? [{ name: 'Tech Stack', url: item.techStackLink }]
          : []);

    const tags = Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string') : [];
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
    const snapshotFallbackProject: Pick<Project, 'purpose' | 'programDeployed' | 'techStack' | 'tags' | 'actions'> = {
      purpose: typeof item.purpose === 'string' ? item.purpose : '',
      programDeployed: typeof item.programDeployed === 'boolean' ? item.programDeployed : false,
      techStack,
      tags,
      actions,
    };

    return {
      id: typeof item.id === 'string' ? item.id : generateId(),
      name: typeof item.name === 'string' ? item.name : 'Untitled Project',
      initiationDate: new Date(item.initiationDate ?? new Date()),
      purpose: typeof item.purpose === 'string' ? item.purpose : '',
      programDeployed: typeof item.programDeployed === 'boolean' ? item.programDeployed : false,
      deploymentInfo: normalizeDeploymentInfo(item.deploymentInfo),
      techStack,
      colorCode: typeof item.colorCode === 'string' ? item.colorCode : '#E0F2FE',
      tags,
      actions,
      snapshots: Array.isArray(item.snapshots)
        ? item.snapshots.map((snapshot) => ({
            id: typeof snapshot.id === 'string' ? snapshot.id : generateId(),
            date: new Date(snapshot.date ?? new Date()),
            trigger:
              snapshot.trigger === 'project-created' ||
              snapshot.trigger === 'project-updated' ||
              snapshot.trigger === 'action-added' ||
              snapshot.trigger === 'action-deleted' ||
              snapshot.trigger === 'deploy-toggled'
                ? snapshot.trigger
                : 'project-updated',
            screen: normalizeSnapshotScreen(snapshot.screen, snapshotFallbackProject),
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
        ...current,
        appendSnapshot({
          id: generateId(),
          name: payload.name.trim(),
          initiationDate: new Date(payload.initiationDate),
          purpose: payload.purpose.trim(),
          programDeployed: payload.programDeployed,
          deploymentInfo: undefined,
          techStack: payload.techStack,
          colorCode: getProjectColor(current.length),
          tags: payload.tags,
          actions: [],
          snapshots: [],
        }, 'project-created'),
      ]);
    });
  };

  const updateProject = async (projectId: string, payload: ProjectInput) => {
    await runAction(() => {
      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? appendSnapshot({
                ...project,
                name: payload.name.trim(),
                initiationDate: new Date(payload.initiationDate),
                purpose: payload.purpose.trim(),
                programDeployed: payload.programDeployed,
                techStack: payload.techStack,
                tags: payload.tags,
              }, 'project-updated')
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
          return appendSnapshot({
            ...project,
            actions: [...project.actions, entry],
          }, 'action-added');
        }),
      );
    });
  };

  const deleteAction = async (projectId: string, actionId: string) => {
    await runAction(() => {
      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? appendSnapshot({
                ...project,
                actions: project.actions.filter((action) => action.id !== actionId),
              }, 'action-deleted')
            : project,
        ),
      );
    });
  };

  const toggleDeploy = async (projectId: string) => {
    await runAction(() => {
      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? appendSnapshot({
                ...project,
                programDeployed: !project.programDeployed,
              }, 'deploy-toggled')
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

  const updateDeploymentInfo = async (projectId: string, payload: DeploymentInfoInput) => {
    await runAction(() => {
      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? appendSnapshot({
                ...project,
                deploymentInfo: {
                  deployedOn: payload.deployedOn.trim(),
                  date: payload.date,
                  cost: payload.cost.trim(),
                  term: payload.term.trim(),
                  benefits: payload.benefits.trim(),
                },
              }, 'project-updated')
            : project,
        ),
      );
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
      toggleDeploy,
      addAction,
      deleteAction,
      updateDeploymentInfo,
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
