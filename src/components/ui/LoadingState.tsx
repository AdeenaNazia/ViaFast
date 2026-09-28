import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ label = 'Loading…', className = '' }) => (
  <div
    role="status"
    aria-live="polite"
    className={`flex flex-col items-center justify-center gap-3 px-6 py-10 ${className}`}
  >
    <motion.span
      aria-hidden="true"
      className="text-accent-400"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, ease: 'linear', repeat: Infinity }}
    >
      <Loader2 className="w-6 h-6" />
    </motion.span>
    <span className="text-xs font-mono uppercase tracking-widest text-slate-400">{label}</span>
  </div>
);
