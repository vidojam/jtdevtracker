import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import Card from '../components/ui/Card';

const SECTION_LABELS = ['Frontend:', 'Backend:', 'Testing:', 'Development Tools:'];

const parseTechLines = (raw: string): Array<{ text: string; isSection?: boolean }> => {
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  let sectionNormalized = normalized;
  for (const label of SECTION_LABELS) {
    sectionNormalized = sectionNormalized.replaceAll(label, `\n${label}`);
  }

  const segments = sectionNormalized
    .split('\n')
    .map((segment) => segment.trim())
    .filter(Boolean);

  const lines: Array<{ text: string; isSection?: boolean }> = [];
  const itemPattern = /([A-Za-z][A-Za-z0-9.+/]*(?:\s[A-Za-z0-9.+/&-]+)*\s(?:\d+(?:\.\d+){1,2})?\s*-\s.+?)(?=\s+[A-Z][A-Za-z0-9.+/]*(?:\s[A-Za-z0-9.+/&-]+)*\s(?:\d+(?:\.\d+){1,2})?\s*-\s|$)/g;

  for (const segment of segments) {
    const sectionMatch = segment.match(/^([^:]+:)\s*(.*)$/);
    if (!sectionMatch) {
      lines.push({ text: segment });
      continue;
    }

    const [, sectionLabel, details] = sectionMatch;
    lines.push({ text: sectionLabel, isSection: true });

    if (!details) continue;

    const items = Array.from(details.matchAll(itemPattern)).map((match) => match[1].trim());
    if (items.length > 0) {
      items.forEach((item) => lines.push({ text: item }));
      const consumed = items.join(' ').trim();
      const remainder = details.replace(consumed, '').trim();
      if (remainder) lines.push({ text: remainder });
      continue;
    }

    lines.push(
      ...details
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => ({ text: item })),
    );
  }

  return lines;
};

export default function TechStackPage() {
  const { projectId } = useParams();
  const { projects, isLoading } = useProjects();

  const project = useMemo(() => projects.find((item) => item.id === projectId), [projects, projectId]);

  if (isLoading) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Loading project...</p>;
  }

  if (!project) {
    return (
      <Card>
        <p className="mb-3 text-sm">Project not found.</p>
        <Link to="/" className="text-sm underline">Back to dashboard</Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-sky-300 bg-sky-100 dark:border-sky-700/60 dark:bg-slate-900/95">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{project.name} — Tech Stack</h1>
          <Link to={`/project/${project.id}`} className="text-sm underline">Back to Project</Link>
        </div>

        {project.techStack.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No tech stack information available for this project.</p>
        ) : (
          <div className="space-y-2">
            {project.techStack.map((entry) => (
              <div
                key={`${entry.name}-${entry.url}`}
                className="rounded-md border border-sky-300 bg-white p-3 dark:border-sky-700/50 dark:bg-slate-800/85"
              >
                <ul className="space-y-1 text-sm text-slate-900 dark:text-slate-100">
                  {parseTechLines(entry.name).map((line, index) => (
                    <li
                      key={`${entry.name}-${index}`}
                      className={line.isSection ? 'break-words pt-1 font-semibold' : 'break-words pl-3'}
                    >
                      {line.isSection ? line.text : `• ${line.text}`}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
