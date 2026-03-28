## JT Dev Tracker v0.1.3

### Summary
Patch release focused on Render deployment durability and persistent data storage.

### Improvements
- [x] Added configurable server storage directory via `DATA_DIR`.
- [x] Updated Render blueprint to set `DATA_DIR=/var/data`.
- [x] Added persistent disk configuration in `render.yaml` (mount path `/var/data`, 1 GB).
- [x] Updated deployment docs with persistent disk and env var requirements.

### Validation
- [x] Tests passing: 9 / 9
- [x] Build successful (`npm run build`)

### Notes
- Base tag: `v0.1.2`
- Release commit: `6f8c9ea`
- This release prevents JSON project data loss across Render restarts/redeploys when disk mount is enabled.

---

### Publish commands

```bash
git add RELEASE_v0.1.3.md
git commit -m "Docs: add v0.1.3 release notes"
git push origin main

gh release create v0.1.3 --target main --title "JT Dev Tracker v0.1.3" --notes-file RELEASE_v0.1.3.md
```
