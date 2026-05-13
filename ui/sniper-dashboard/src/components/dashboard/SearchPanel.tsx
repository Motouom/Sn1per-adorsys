'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Vulnerability, Port, Technology } from '@/types';
import { cn, getSeverityColor } from '@/lib/utils';
import {
  Search,
  Filter,
  X,
  AlertTriangle,
  Server,
  Globe,
  FileText,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

interface SearchPanelProps {
  vulnerabilities: Vulnerability[];
  ports: { number: number; service: string; state: string }[];
  technologies: Technology[];
  urls: string[];
  onResultClick?: (type: string, item: any) => void;
}

type SearchResult = {
  id: string;
  type: 'vulnerability' | 'port' | 'technology' | 'url';
  title: string;
  subtitle: string;
  severity?: string;
  data: any;
};

export function SearchPanel({
  vulnerabilities,
  ports,
  technologies,
  urls,
  onResultClick,
}: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results: SearchResult[] = useMemo(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const allResults: SearchResult[] = [];

    vulnerabilities.forEach((v, i) => {
      if (
        v.title.toLowerCase().includes(q) ||
        v.target.toLowerCase().includes(q) ||
        v.cve?.toLowerCase().includes(q) ||
        v.severity.includes(q)
      ) {
        allResults.push({
          id: `vuln-${i}`,
          type: 'vulnerability',
          title: v.title,
          subtitle: v.target,
          severity: v.severity,
          data: v,
        });
      }
    });

    ports.forEach((p, i) => {
      if (
        p.service.toLowerCase().includes(q) ||
        p.number.toString().includes(q) ||
        p.state.toLowerCase().includes(q)
      ) {
        allResults.push({
          id: `port-${i}`,
          type: 'port',
          title: `Port ${p.number} - ${p.service}`,
          subtitle: `State: ${p.state}`,
          data: p,
        });
      }
    });

    technologies.forEach((t, i) => {
      if (
        t.name.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.version?.toLowerCase().includes(q)
      ) {
        allResults.push({
          id: `tech-${i}`,
          type: 'technology',
          title: t.name,
          subtitle: t.category || 'Technology',
          data: t,
        });
      }
    });

    urls.slice(0, 100).forEach((url, i) => {
      if (url.toLowerCase().includes(q)) {
        allResults.push({
          id: `url-${i}`,
          type: 'url',
          title: url,
          subtitle: 'URL',
          data: url,
        });
      }
    });

    if (selectedType !== 'all') {
      return allResults.filter((r) => r.type === selectedType);
    }

    return allResults.slice(0, 50);
  }, [query, vulnerabilities, ports, technologies, urls, selectedType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
        }
        if (e.key === 'Enter' && results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const handleResultClick = (result: SearchResult) => {
    onResultClick?.(result.type, result.data);
    setIsOpen(false);
    setQuery('');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'vulnerability':
        return <AlertTriangle className="h-4 w-4" />;
      case 'port':
        return <Server className="h-4 w-4" />;
      case 'technology':
        return <Globe className="h-4 w-4" />;
      case 'url':
        return <FileText className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-4 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-sm"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Search...</span>
        <kbd className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-xs text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search vulnerabilities, ports, technologies..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-muted"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
              {['all', 'vulnerability', 'port', 'technology', 'url'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedType(type);
                    setSelectedIndex(0);
                  }}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize',
                    selectedType === type
                      ? 'bg-red-500 text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {results.length > 0 ? (
                <div className="py-2">
                  {results.map((result, index) => (
                    <div
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className={cn(
                        'flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors',
                        index === selectedIndex ? 'bg-red-500/10' : 'hover:bg-muted/30'
                      )}
                    >
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          result.type === 'vulnerability' &&
                            result.severity === 'critical'
                            ? 'bg-red-500/20 text-red-500'
                            : result.type === 'vulnerability' &&
                              result.severity === 'high'
                            ? 'bg-orange-500/20 text-orange-500'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {getTypeIcon(result.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {result.severity && (
                          <Badge
                            variant={
                              result.severity === 'critical'
                                ? 'critical'
                                : result.severity === 'high'
                                ? 'high'
                                : result.severity === 'medium'
                                ? 'medium'
                                : 'default'
                            }
                            size="sm"
                          >
                            {result.severity.toUpperCase()}
                          </Badge>
                        )}
                        <Badge variant="default" size="sm">
                          {result.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : query ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No results found for "{query}"</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Start typing to search across all data
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <kbd className="px-2 py-0.5 rounded bg-muted">↑</kbd>
                      <kbd className="px-2 py-0.5 rounded bg-muted">↓</kbd>
                      <span>to navigate</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <kbd className="px-2 py-0.5 rounded bg-muted">↵</kbd>
                      <span>to select</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <kbd className="px-2 py-0.5 rounded bg-muted">esc</kbd>
                      <span>to close</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>{results.length} results</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-muted">⌘K</kbd>
                <span>to open</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
