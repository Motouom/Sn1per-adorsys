'use client';

import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'critical' | 'high' | 'medium' | 'low' | 'info';
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  variant = 'default',
  className,
}: StatCardProps) {
  const variantColors = {
    default: 'from-muted/50 to-muted/30',
    critical: 'from-red-500/20 to-red-500/5 border-red-500/20',
    high: 'from-orange-500/20 to-orange-500/5 border-orange-500/20',
    medium: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20',
    low: 'from-blue-500/20 to-blue-500/5 border-blue-500/20',
    info: 'from-gray-500/20 to-gray-500/5 border-gray-500/20',
  };

  const valueColors = {
    default: 'text-foreground',
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-blue-500',
    info: 'text-gray-400',
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-gradient-to-br p-5 overflow-hidden',
        variantColors[variant],
        className
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn('text-3xl font-bold mt-1', valueColors[variant])}>
              {value}
            </p>
          </div>
          {icon && (
            <div className={cn('p-2 rounded-lg bg-muted/50', valueColors[variant])}>
              {icon}
            </div>
          )}
        </div>
        
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-3">
            {trend && (
              <span
                className={cn(
                  'text-xs font-medium',
                  trend === 'up' && 'text-green-500',
                  trend === 'down' && 'text-red-500',
                  trend === 'neutral' && 'text-muted-foreground'
                )}
              >
                {trend === 'up' && '↑'}
                {trend === 'down' && '↓'}
                {trend === 'neutral' && '→'}
                {trendValue}
              </span>
            )}
            {subtitle && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
