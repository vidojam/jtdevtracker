import { describe, expect, it } from 'vitest';
import { calculateProjectStats, getStaleProjects } from './stats';
import type { Project } from '../types';

const makeProject = (name: string, actionDates: string[], initiationDate: string = '2026-01-01'): Project => ({
  id: name,
  name,
  initiationDate: new Date(initiationDate),
  purpose: 'purpose',
  colorCode: '#ffffff',
  tags: [],
  actions: actionDates.map((value, index) => ({
    id: `${name}-${index}`,
    date: new Date(value),
    todayAction: 'Work',
    todayActionNotes: 'Done',
  })),
});

describe('calculateProjectStats', () => {
  it('computes totals and stale projects', () => {
    const now = new Date('2026-03-06T10:00:00Z');
    const projects = [
      makeProject('A', ['2026-03-06T09:00:00Z']),
      makeProject('B', ['2026-02-20T09:00:00Z']),
      makeProject('C', [], '2026-03-06T00:00:00Z'),
    ];

    const result = calculateProjectStats(projects, now);

    expect(result.totalProjects).toBe(3);
    expect(result.totalActions).toBe(2);
    expect(result.activeToday).toBe(1);
    expect(result.staleProjects).toBe(1);
  });

  it('returns stale projects list', () => {
    const now = new Date('2026-03-06T10:00:00Z');
    const projects = [
      makeProject('Fresh', ['2026-03-05T09:00:00Z']),
      makeProject('Stale', ['2026-02-20T09:00:00Z']),
      makeProject('NoActionsOld', [], '2026-02-10T00:00:00Z'),
      makeProject('NoActionsNew', [], '2026-03-06T00:00:00Z'),
    ];

    const stale = getStaleProjects(projects, now);
    expect(stale.map((project) => project.name)).toEqual(['Stale', 'NoActionsOld']);
  });
});
