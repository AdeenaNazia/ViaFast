import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'full';
export type TileTone = 'accent' | 'brand' | 'violet' | 'danger';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  iconTone?: TileTone;
  size?: ModalSize;
  /** Extra controls rendered in the header (e.g. print / export buttons) */
  headerActions?: React.ReactNode;
  /** Sticky action bar at the bottom of the panel */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-4xl',
  xxl: 'max-w-5xl',
  full: 'max-w-6xl',
};

const tileClasses: Record<TileTone, string> = {
  accent: 'bg-cyan-950 text-accent-400 border-cyan-800/60',
  brand: 'bg-brand-600 text-white border-brand-500/40 shadow-glow-brand',
  violet: 'bg-purple-950 text-purple-400 border-purple-800/60',
  danger: 'bg-danger-500/15 text-danger-300 border-danger-500/40',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconTone = 'accent',
  size = 'md',
  headerActions,
  footer,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes; body scroll is locked while open
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
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
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={`relative w-full ${sizeClasses[size]} bg-surface border border-slate-700/80 rounded-panel shadow-panel overflow-hidden my-6 outline-none flex flex-col max-h-[calc(100vh-3rem)]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-line bg-canvas/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className={`p-2 rounded-xl border shrink-0 ${tileClasses[iconTone]}`}>
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white leading-tight truncate">{title}</h3>
              {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <IconButton label={`Close ${title}`} icon={<X className="w-4 h-4" />} size="sm" onClick={onClose} />
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-5 sm:px-6 py-4 border-t border-line bg-canvas/60 shrink-0">{footer}</div>
        )}
      </motion.div>
    </div>
  );
};
