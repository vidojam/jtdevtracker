import type { Project, SortOrder } from '../types';

const projectColors = [
  '#E0F2FE',
  '#DCFCE7',
  '#FCE7F3',
  '#FEF3C7',
  '#EDE9FE',
  '#FEE2E2',
  '#CCFBF1',
  '#F3E8FF',
];

export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const getProjectColor = (index: number): string => projectColors[index % projectColors.length];

export const sortProjects = (projects: Project[], sortOrder: SortOrder): Project[] => {
  return [...projects].sort((a, b) => {
    const value = a.initiationDate.getTime() - b.initiationDate.getTime();
    return sortOrder === 'newest' ? -value : value;
  });
};

export const filterProjects = (projects: Project[], searchTerm: string): Project[] => {
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) return projects;

  return projects.filter((project) => {
    return (
      project.name.toLowerCase().includes(normalized) ||
      project.purpose.toLowerCase().includes(normalized) ||
      project.tags.some((tag) => tag.toLowerCase().includes(normalized))
    );
  });
};
