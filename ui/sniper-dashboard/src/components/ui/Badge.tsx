'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'critical' | 'high' | 'medium' | 'low' | 'info' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  const variantClasses = {
    default: 'bg-muted text-muted-foreground',
    critical: 'bg-red-500/10 text-red-500 border border-red-500/30',
    high: 'bg-orange-500/10 text-orange-500 border border-orange-500/30',
    medium: 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/30',
    low: 'bg-blue-500/10 text-blue-500 border border-blue-500/30',
    info: 'bg-gray-500/10 text-gray-400 border border-gray-500/30',
    success: 'bg-green-500/10 text-green-500 border border-green-500/30',
    warning: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30',
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
}
