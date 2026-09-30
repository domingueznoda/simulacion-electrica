import React from 'react';

interface IconProps {
  className?: string;
}

export const SwitchSimpleIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="18" rx="4" className="stroke-slate-600 fill-slate-800/80" />
    <rect x="6" y="6" width="12" height="12" rx="2" className="stroke-amber-400/80 fill-slate-900" />
    <line x1="12" y1="8" x2="12" y2="11" strokeLinecap="round" className="stroke-amber-400 stroke-[2.5]" />
    <circle cx="12" cy="15" r="1.5" className="fill-slate-500 stroke-slate-500" />
  </svg>
);

export const SwitchTwoWayIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="18" rx="4" className="stroke-slate-600 fill-slate-800/80" />
    <circle cx="6" cy="12" r="1.5" className="fill-amber-400 stroke-amber-400" />
    <circle cx="18" cy="8" r="1.5" className="fill-indigo-400 stroke-indigo-400" />
    <circle cx="18" cy="16" r="1.5" className="fill-indigo-400 stroke-indigo-400" />
    <path d="M7.5 12L16.5 8.5" strokeLinecap="round" className="stroke-indigo-400 stroke-[2.5]" />
  </svg>
);

export const SwitchIntermediateIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="18" rx="4" className="stroke-slate-600 fill-slate-800/80" />
    <circle cx="6" cy="7" r="1.5" className="fill-violet-400 stroke-violet-400" />
    <circle cx="6" cy="17" r="1.5" className="fill-violet-400 stroke-violet-400" />
    <circle cx="18" cy="7" r="1.5" className="fill-violet-400 stroke-violet-400" />
    <circle cx="18" cy="17" r="1.5" className="fill-violet-400 stroke-violet-400" />
    <path d="M7.5 7.5L16.5 16.5" strokeLinecap="round" className="stroke-violet-400 stroke-[2]" />
    <path d="M7.5 16.5L16.5 7.5" strokeLinecap="round" className="stroke-violet-400 stroke-[2]" />
  </svg>
);

export const SwitchPushbuttonIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="18" rx="4" className="stroke-slate-600 fill-slate-800/80" />
    <circle cx="12" cy="12" r="5.5" className="stroke-yellow-400/80 fill-slate-900" />
    <circle cx="12" cy="12" r="3" className="fill-yellow-400 stroke-yellow-400" />
    <path d="M12 4v2.5" strokeLinecap="round" className="stroke-yellow-400 stroke-[2]" />
  </svg>
);
