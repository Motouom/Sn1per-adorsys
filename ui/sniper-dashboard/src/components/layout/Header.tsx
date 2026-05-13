'use client';

import { useTheme } from '@/hooks/useTheme';
import { Sun, Moon, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function Header({ activeTab = 'dashboard', onTabChange }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { label: 'Dashboard', tab: 'dashboard' },
    { label: 'Vulnerabilities', tab: 'vulnerabilities' },
    { label: 'Network', tab: 'network' },
    { label: 'Web', tab: 'web' },
    { label: 'Reports', tab: 'reports' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border glass-effect">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 blur-lg opacity-50 animate-pulse" />
            <Crosshair className="relative h-8 w-8 text-red-500" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-red-500">Sn1per</span>
              <span className="text-muted-foreground ml-2">Security Dashboard</span>
            </h1>
            <span className="text-xs text-muted-foreground">Professional Edition 2026</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.tab}
                onClick={() => onTabChange?.(item.tab)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === item.tab
                    ? 'bg-red-500/10 text-red-500'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="h-6 w-px bg-border" />

          <button
            onClick={toggleTheme}
            className="relative p-2 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <div className="relative h-5 w-5 overflow-hidden">
              <Sun
                className={cn(
                  'absolute h-5 w-5 transition-transform duration-300',
                  theme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'
                )}
              />
              <Moon
                className={cn(
                  'absolute h-5 w-5 transition-transform duration-300',
                  theme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'
                )}
              />
            </div>
          </button>

          <div className="flex items-center gap-2 pl-4 border-l border-border">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">System Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
