'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function SidebarItem({ icon: Icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
        active
          ? 'bg-red-500/10 text-red-500 border border-red-500/20'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
      )}
    >
      <Icon className={cn('h-4 w-4', active && 'text-red-500')} />
      <span>{label}</span>
      {active && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500" />
      )}
    </button>
  );
}
