import type { ReactNode } from 'react';

export default function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800 ${className}`}>
      {children}
    </div>
  );
}
