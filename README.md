# JT Dev Tracker

A production-ready React + TypeScript application to track software projects and daily project actions.

## Tech Stack

- React + TypeScript (Vite)
- React Router
- React Context for state management
- Tailwind CSS
- localStorage persistence
- Local sync API with shared JSON storage (automatic multi-window sync)
- Vitest + React Testing Library

## Features

- Project dashboard with sequential list and color-coded project cards
- Sort by initiation date (newest/oldest toggle)
- Search by project name or purpose
- Tag system for project categorization
- Quick-click tag chips to apply dashboard filters
- Add/edit/delete projects with required-field validation
- Project details page with chronological action history
- Add/delete action entries with confirmation dialogs
- JSON export of all project data
- JSON import to restore/sync project data between environments
- Automatic shared sync between VS Code webview and http://localhost:5173 when API is running
- Loading states during data operations
- Error boundary fallback UI
- Responsive layout for desktop and mobile
- Bonus: dark/light theme toggle
- Bonus: project statistics dashboard (total projects/actions, active today, stale projects)
- Bonus: reminder notifications for projects without recent actions

## Data Model

```ts
interface Project {
  id: string;
  name: string;
  initiationDate: Date;
  purpose: string;
  colorCode: string;
  tags: string[];
  actions: ProjectAction[];
}

interface ProjectAction {
  id: string;
  date: Date;
  lastAction?: string;
  lastActionNotes?: string;
  todayAction: string;
  todayActionNotes: string;
}
```

## Setup

```bash
npm install
npm run dev
```

App URL (default): `http://localhost:5173`

The `dev` script now starts both:
- Vite client (`http://localhost:5173`)
- Sync API server (`http://localhost:4000`)

Dashboard shows `Storage: Shared Sync` when both windows are using the same synced dataset.

## Build and Test

```bash
npm run build
npm run test:run
```
