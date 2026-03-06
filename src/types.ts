export interface Project {
  id: string;
  name: string;
  initiationDate: Date;
  purpose: string;
  colorCode: string;
  tags: string[];
  actions: ProjectAction[];
}

export interface ProjectAction {
  id: string;
  date: Date;
  lastAction?: string;
  lastActionNotes?: string;
  todayAction: string;
  todayActionNotes: string;
}

export type SortOrder = 'newest' | 'oldest';
