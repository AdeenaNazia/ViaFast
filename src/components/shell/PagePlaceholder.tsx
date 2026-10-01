import React from 'react';
import { Hammer } from 'lucide-react';

interface PagePlaceholderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  /** What this page will contain once implemented — keeps the stub honest. */
  planned?: string[];
  actions?: React.ReactNode;
}

/**
 * Consistent stand-in for shell pages that are scaffolded but not yet built.
 * States plainly what is planned rather than pretending to render data.
 */
export const PagePlaceholder: React.FC<PagePlaceholderProps> = ({
  title,
  description,
  icon,
  planned,
  actions,
}) => (
  <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
    <div className="rounded-panel border border-dashed border-line-strong bg-surface/50 px-6 py-12 text-center">
      <span
        className="inline-flex p-3 rounded-2xl bg-surface-2 border border-line text-slate-400"
        aria-hidden="true"
      >
        {icon ?? <Hammer className="w-6 h-6" />}
      </span>

      <h1 className="mt-4 text-lg font-bold text-white">{title}</h1>
      <p className="mt-1.5 text-xs text-slate-400 max-w-md mx-auto leading-relaxed">{description}</p>

      {planned && planned.length > 0 && (
        <ul className="mt-6 mx-auto max-w-sm space-y-2 text-left">
          {planned.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-slate-300">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-brand-500 shrink-0" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      )}

      {actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  </section>
);
