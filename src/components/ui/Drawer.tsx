import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import type { TileTone } from './Modal';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  iconTone?: TileTone;
  width?: 'md' | 'lg';
  /** Extra controls rendered in the header before the close button */
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const tileClasses: Record<TileTone, string> = {
  accent: 'bg-cyan-950 text-accent-400 border-cyan-800/60',
  brand: 'bg-brand-600 text-white border-brand-500/40 shadow-glow-brand',
  violet: 'bg-purple-950 text-purple-400 border-purple-800/60',
  danger: 'bg-danger-500/15 text-danger-300 border-danger-500/40',
};

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconTone = 'accent',
  width = 'md',
  headerActions,
  footer,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ x: 48, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={`relative w-full ${width === 'md' ? 'max-w-md' : 'max-w-xl'} h-full bg-surface border-l border-line shadow-panel flex flex-col overflow-hidden outline-none`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-line bg-canvas/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <div className={`p-2 rounded-xl border shrink-0 ${tileClasses[iconTone]}`}>
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white leading-tight truncate">{title}</h3>
              {subtitle && <div className="text-[11px] text-slate-400 mt-0.5">{subtitle}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <IconButton label={`Close ${title}`} icon={<X className="w-4 h-4" />} size="sm" onClick={onClose} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer && <div className="px-5 sm:px-6 py-4 border-t border-line bg-canvas/60 shrink-0">{footer}</div>}
      </motion.div>
    </div>
  );
};
