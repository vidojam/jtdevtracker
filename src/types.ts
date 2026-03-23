export interface TechStackEntry {
  name: string;
  url: string;
}

export interface Project {
  id: string;
  name: string;
  initiationDate: Date;
  purpose: string;
  programDeployed: boolean;
  deploymentInfo?: DeploymentInfo;
  techStack: TechStackEntry[];
  colorCode: string;
  tags: string[];
  actions: ProjectAction[];
  snapshots?: ProjectSnapshot[];
}

export interface DeploymentInfo {
  deployedOn: string;
  date: string;
  cost: string;
  term: string;
  benefits: string;
}

export interface ProjectAction {
  id: string;
  date: Date;
  lastAction?: string;
  lastActionNotes?: string;
  todayAction: string;
  todayActionNotes: string;
}

export interface ProjectSnapshot {
  id: string;
  date: Date;
  trigger: 'project-created' | 'project-updated' | 'action-added' | 'action-deleted' | 'deploy-toggled';
  screen: ProjectSnapshotScreen;
}

export interface ProjectSnapshotScreen {
  purpose: string;
  programDeployed: boolean;
  techStack: string[];
  tags: string[];
  totalActions: number;
  lastAction?: string;
  lastActionNotes?: string;
}

export type SortOrder = 'newest' | 'oldest';
