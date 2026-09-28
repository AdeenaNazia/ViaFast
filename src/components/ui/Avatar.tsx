import React from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  /** Green presence dot (online / on duty) */
  presence?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 rounded-lg text-[9px]',
  md: 'w-9 h-9 rounded-xl text-xs',
  lg: 'w-14 h-14 rounded-2xl text-base',
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', presence = false, className = '' }) => (
  <span className={`relative inline-block shrink-0 ${className}`}>
    {src ? (
      <img
        src={src}
        alt={name}
        className={`${sizeClasses[size]} object-cover border border-line-strong bg-surface-2`}
      />
    ) : (
      <span
        aria-label={name}
        className={`${sizeClasses[size]} inline-flex items-center justify-center bg-surface-2 border border-line-strong text-slate-200 font-bold`}
      >
        {initials(name)}
      </span>
    )}
    {presence && (
      <span
        aria-hidden="true"
        className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-ok-500 rounded-full ring-1 ring-canvas"
      />
    )}
  </span>
);
