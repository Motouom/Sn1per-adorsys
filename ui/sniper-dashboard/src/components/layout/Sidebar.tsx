'use client';

import { useState, useEffect } from 'react';
import { SidebarItem } from './SidebarItem';
import {
  LayoutDashboard,
  ShieldAlert,
  Network,
  Globe,
  FileText,
  Settings,
  Bug,
  Lock,
  Search,
  Database,
  Key,
  Camera,
  FileSearch,
  StickyNote,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pentestMode?: 'webapp' | 'network';
}

const webAppMenuItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'vulnerabilities', icon: ShieldAlert, label: 'Vulnerabilities' },
  { id: 'network', icon: Network, label: 'Network & Ports' },
  { id: 'web', icon: Globe, label: 'Web & Technologies' },
  { id: 'ssl', icon: Lock, label: 'SSL/TLS' },
  { id: 'dns', icon: Search, label: 'DNS Records' },
  { id: 'whois', icon: Database, label: 'WHOIS' },
  { id: 'osint', icon: FileSearch, label: 'OSINT' },
  { id: 'credentials', icon: Key, label: 'Credentials' },
  { id: 'notes', icon: StickyNote, label: 'Notes' },
  { id: 'screenshots', icon: Camera, label: 'Screenshots' },
  { id: 'reports', icon: FileText, label: 'Reports' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

const networkMenuItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'vulnerabilities', icon: ShieldAlert, label: 'Vulnerabilities' },
  { id: 'network', icon: Network, label: 'Network Overview' },
  { id: 'hosts', icon: Database, label: 'Hosts Discovery' },
  { id: 'os', icon: Bug, label: 'OS Detection' },
  { id: 'notes', icon: StickyNote, label: 'Notes' },
  { id: 'reports', icon: FileText, label: 'Reports' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ activeTab, onTabChange, pentestMode = 'webapp' }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const menuItems = pentestMode === 'network' ? networkMenuItems : webAppMenuItems;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) setIsOpen(false);
  }, [isMobile]);

  const handleItemClick = (id: string) => {
    onTabChange(id);
    if (isMobile) setIsOpen(false);
  };

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-4 left-4 z-50 p-3 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors lg:hidden"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}

        <aside
          className={`fixed left-0 top-16 bottom-0 w-72 border-r border-border bg-card z-50 overflow-y-auto transform transition-transform duration-300 lg:hidden ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {pentestMode === 'network' ? 'Network Assessment' : 'Web App Assessment'}
              </span>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-muted rounded">
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <SidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={activeTab === item.id}
                  onClick={() => handleItemClick(item.id)}
                />
              ))}
            </nav>
          </div>
        </aside>
      </>
    );
  }

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-56 xl:w-64 border-r border-border bg-card overflow-y-auto hidden lg:block">
      <div className="p-3 xl:p-4">
        <div className="mb-3 xl:mb-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {pentestMode === 'network' ? 'Network Assessment' : 'Web App Assessment'}
          </span>
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => handleItemClick(item.id)}
            />
          ))}
        </nav>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 xl:p-4 border-t border-border">
        <div className="flex items-center gap-2 xl:gap-3 p-2 xl:p-3 rounded-lg bg-muted/50">
          <div className="h-7 w-7 xl:h-8 xl:w-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs xl:text-sm font-bold">S</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs xl:text-sm font-medium truncate">Security Team</p>
            <p className="text-[10px] xl:text-xs text-muted-foreground truncate">Pentester</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
