import type { Project } from '../types';

export interface ProjectStats {
  totalProjects: number;
  totalActions: number;
  activeToday: number;
  staleProjects: number;
}

const isSameDay = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

export const calculateProjectStats = (projects: Project[], now: Date = new Date()): ProjectStats => {
  const totalProjects = projects.length;
  const totalActions = projects.reduce((sum, project) => sum + project.actions.length, 0);

  const activeToday = projects.filter((project) => {
    const latestAction = project.actions.at(-1);
    return latestAction ? isSameDay(latestAction.date, now) : false;
  }).length;

  const staleCutoff = new Date(now);
  staleCutoff.setDate(staleCutoff.getDate() - 7);

  const staleProjects = projects.filter((project) => {
    const latestAction = project.actions.at(-1);
    const lastRelevantDate = latestAction?.date ?? project.initiationDate;
    return lastRelevantDate < staleCutoff;
  }).length;

  return {
    totalProjects,
    totalActions,
    activeToday,
    staleProjects,
  };
};

export const getStaleProjects = (projects: Project[], now: Date = new Date()): Project[] => {
  const staleCutoff = new Date(now);
  staleCutoff.setDate(staleCutoff.getDate() - 7);

  return projects.filter((project) => {
    const latestAction = project.actions.at(-1);
    const lastRelevantDate = latestAction?.date ?? project.initiationDate;
    return lastRelevantDate < staleCutoff;
  });
};
