'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Technology, HttpHeaders } from '@/types';
import { Globe, Code, Layers, Zap } from 'lucide-react';

interface WebPanelProps {
  technologies: Technology[];
  headers: HttpHeaders[];
  title?: string;
  urls?: string[];
  forms?: string[];
}

export function WebPanel({ technologies, headers, title, urls, forms }: WebPanelProps) {
  const techCategories = technologies.reduce((acc, tech) => {
    const cat = tech.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tech);
    return acc;
  }, {} as Record<string, Technology[]>);

  return (
    <div className="space-y-6">
      {title && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-red-500" />
              <CardTitle>Website Title</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{title}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-red-500" />
            <CardTitle>Detected Technologies</CardTitle>
          </div>
          <Badge variant="success">{technologies.length} technologies</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {technologies.map((tech, index) => (
              <div
                key={`${tech.name}-${index}`}
                className="flex flex-col p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <TechIcon name={tech.name} />
                  <span className="font-medium">{tech.name}</span>
                </div>
                {tech.version && (
                  <Badge variant="default" size="sm" className="self-start">
                    v{tech.version}
                  </Badge>
                )}
                {tech.category && (
                  <span className="text-xs text-muted-foreground mt-2">{tech.category}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Code className="h-5 w-5 text-red-500" />
            <CardTitle>HTTP Headers</CardTitle>
          </div>
          <Badge variant="info">{headers.length} headers</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {headers.map((header, index) => (
              <div
                key={`${header.name}-${index}`}
                className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 font-mono text-sm"
              >
                <span className="text-red-500 font-semibold min-w-[150px]">{header.name}:</span>
                <span className="text-muted-foreground break-all">{header.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {urls && urls.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-red-500" />
              <CardTitle>Discovered URLs</CardTitle>
            </div>
            <Badge variant="info">{urls.length} URLs</Badge>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {urls.slice(0, 100).map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 text-sm"
                >
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline truncate"
                  >
                    {url}
                  </a>
                </div>
              ))}
              {urls.length > 100 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Showing 100 of {urls.length} URLs
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {forms && forms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Discovered Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {forms.map((form, index) => (
                <div key={`${form}-${index}`} className="p-3 rounded-lg bg-muted/30 font-mono text-sm">
                  {form}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TechIcon({ name }: { name: string }) {
  const iconMap: Record<string, string> = {
    nginx: '⚡',
    gatsby: '🔷',
    contentful: '📦',
    react: '⚛️',
    'react.js': '⚛️',
    nodejs: '💚',
    'node.js': '💚',
    wordpress: '📝',
    drupal: '🔷',
    joomla: '🔶',
    apache: '🪶',
    jquery: '📜',
    bootstrap: '🎨',
    tailwindcss: '🌊',
    typescript: '💙',
    javascript: '💛',
    python: '🐍',
    php: '🐘',
    mysql: '🗄️',
    postgresql: '🐘',
    mongodb: '🍃',
    redis: '🔴',
    aws: '☁️',
    'amazon aws': '☁️',
    google: '🔍',
    cloudflare: '🛡️',
    firebase: '🔥',
    docker: '🐳',
    kubernetes: '☸️',
    github: '🐙',
    gitlab: '🦊',
  };

  return <span className="text-lg">{iconMap[name.toLowerCase()] || '🔧'}</span>;
}
