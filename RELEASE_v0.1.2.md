## JT Dev Tracker v0.1.2

### Summary
Feature release focused on project detail workflows: snapshots, deployment tracking, and readability polish.

### Features
- [x] Added `Project Snapshots` page linked from Project Details.
- [x] Snapshots now store captured project screen-state data (purpose, deploy status, tags, actions, last action notes, tech stack).
- [x] Added `Deployment Information` page linked from Project Details.
- [x] Deployment fields added per project: deployed on, date, cost, term, and deployed benefits.

### Improvements
- [x] Removed count badges from `Tech Stack` and `Project Snapshots` links in Project Details.
- [x] Updated Tech Stack page formatting for clearer vertical readability.
- [x] Applied unified soft sky theme accents with stronger contrast on:
  - Project Details
  - Tech Stack
  - Project Snapshots

### Validation
- [x] Tests passing: 9 / 9
- [x] Build successful (`npm run build`)
- [x] App smoke-tested on `http://localhost:5173`

### Notes
- Base tag: `v0.1.1`
- Release commit: `23f68f8`
- Release tag: `v0.1.2`
- Snapshot schema changed from page-path metadata to captured screen-state; legacy entries are normalized with fallback values.
- Official stack: React 19 + TypeScript + Vite frontend, Tailwind CSS 4 styling, Node.js + Express API, and Vitest + Testing Library for tests.

---

### Publish commands

```bash
git add RELEASE_v0.1.2.md
git commit -m "Docs: add v0.1.2 release notes"
git push origin main

gh release create v0.1.2 --target main --title "JT Dev Tracker v0.1.2" --notes-file RELEASE_v0.1.2.md
```
