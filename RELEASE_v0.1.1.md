## JT Dev Tracker v0.1.1

### Summary
Patch release for targeted fixes and polish after `v0.1.0`.

### Fixes
- [ ] Fix 1
- [ ] Fix 2

### Improvements
- [ ] Improvement 1

### Validation
- [ ] Tests passing: __ / __
- [ ] App smoke-tested on `http://localhost:5173`

### Notes
- Base tag: `v0.1.0`
- Latest shipped commit before this release plan: `629700d`
- Add any migration/compatibility notes here (if needed).
- Official stack: React 19 + TypeScript + Vite frontend, Tailwind CSS 4 styling, Node.js + Express API, and Vitest + Testing Library for tests.

---

### Publish commands

```bash
git add .
git commit -m "Patch: v0.1.1 updates"
git push origin main

git tag -a v0.1.1 -m "Release v0.1.1"
git push origin v0.1.1

gh release create v0.1.1 --target main --title "JT Dev Tracker v0.1.1" --notes-file RELEASE_v0.1.1.md
```
