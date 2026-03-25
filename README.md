# JT Dev Tracker

A production-ready React + TypeScript application to track software projects and daily project actions.

## Tech Stack

Official stack: React 19 + TypeScript + Vite frontend, Tailwind CSS 4 styling, Node.js + Express API, and Vitest + Testing Library for tests.

- React + TypeScript (Vite)
- React 19 + TypeScript 5 + Vite 7
- React Router 7
- React Context API for state management
- Tailwind CSS 4
- localStorage persistence
- Node.js + Express 5 local sync API with shared JSON storage (automatic multi-window sync)
- Vitest 4 + React Testing Library + user-event + jsdom

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

## Deploy on Render

This project is configured to run as a Render Web Service using the included `render.yaml`.

### Create the service

1. Push this repository to GitHub.
2. In Render, create a new service from the repo.
3. Choose **Blueprint** (or Web Service) and use the values from `render.yaml`:
  - Build command: `npm install && npm run build`
  - Start command: `node server/index.js`

### Data persistence

The API currently stores data in `server/data/projects.json`.
Use a persistent disk in Render and mount it so this file survives restarts and redeployments.
