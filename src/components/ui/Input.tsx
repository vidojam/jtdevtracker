import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface SharedProps {
  label: string;
  error?: string;
  as?: 'input' | 'textarea';
}

type InputProps = SharedProps & InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = SharedProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function Input(props: InputProps | TextareaProps) {
  const { label, error, as = 'input', className = '', ...rest } = props;
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      {as === 'textarea' ? (
        <textarea
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          className={`min-h-[88px] rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${className}`}
        />
      ) : (
        <input
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          className={`rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${className}`}
        />
      )}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
