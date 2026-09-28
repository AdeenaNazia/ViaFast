import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Right-aligned action slot (buttons, tabs, links) */
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  className = '',
}) => (
  <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
    <div className="flex items-center gap-2.5 min-w-0">
      {icon && <span className="text-accent-400 shrink-0">{icon}</span>}
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-bold text-white leading-tight truncate">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
  </div>
);
