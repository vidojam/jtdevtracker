import { describe, expect, it } from 'vitest';
import { filterProjects, sortProjects } from './projectUtils';
import type { Project } from '../types';

const createProject = (name: string, date: string, purpose: string, tags: string[] = []): Project => ({
  id: name,
  name,
  initiationDate: new Date(date),
  purpose,
  programDeployed: false,
  techStack: [],
  colorCode: '#fff',
  tags,
  actions: [],
});

describe('project utils', () => {
  it('sorts by newest first (latest added first)', () => {
    const projects = [
      createProject('A', '2024-01-01', 'first'),
      createProject('B', '2025-01-01', 'second'),
    ];
    const sorted = sortProjects(projects, 'newest');
    expect(sorted[0].name).toBe('B');
  });

  it('sorts by oldest initiation date first', () => {
    const projects = [
      createProject('A', '2025-01-01', 'first'),
      createProject('B', '2024-01-01', 'second'),
    ];
    const sorted = sortProjects(projects, 'oldest');
    expect(sorted.map((project) => project.name)).toEqual(['B', 'A']);
  });

  it('filters by name or purpose', () => {
    const projects = [
      createProject('Alpha', '2024-01-01', 'tools', ['frontend']),
      createProject('Bravo', '2025-01-01', 'analytics'),
    ];
    expect(filterProjects(projects, 'alpha')).toHaveLength(1);
    expect(filterProjects(projects, 'analytics')).toHaveLength(1);
    expect(filterProjects(projects, 'frontend')).toHaveLength(1);
  });
});
