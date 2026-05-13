'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Credential } from '@/types';
import { cn, getSeverityColor } from '@/lib/utils';
import {
  Key,
  Shield,
  Lock,
  Unlock,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useState, useMemo } from 'react';

interface CredentialsPanelProps {
  credentials?: Credential[];
}

export function CredentialsPanel({ credentials }: CredentialsPanelProps) {
  const [filter, setFilter] = useState<string>('all');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  if (!credentials || credentials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-red-500" />
            <CardTitle>Credentials</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <Shield className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-medium text-green-500">No Credentials Found</p>
              <p className="text-sm text-muted-foreground mt-1">
                No exposed credentials were discovered during the scan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const severityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    credentials.forEach((c) => {
      counts[c.severity]++;
    });
    return counts;
  }, [credentials]);

  const filteredCreds = useMemo(() => {
    if (filter === 'all') return credentials;
    return credentials.filter((c) => c.severity === filter);
  }, [credentials, filter]);

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'password':
        return <Lock className="h-4 w-4" />;
      case 'api_key':
        return <Key className="h-4 w-4" />;
      case 'token':
        return <Shield className="h-4 w-4" />;
      case 'certificate':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Key className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-red-500" />
            <CardTitle>Credentials Summary</CardTitle>
          </div>
          <Badge variant="critical">{credentials.length} credentials found</Badge>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-6">
            {(['critical', 'high', 'medium', 'low'] as const).map((severity) => (
              <button
                key={severity}
                onClick={() => setFilter(filter === severity ? 'all' : severity)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all',
                  filter === severity
                    ? getSeverityColor(severity)
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                <span className="font-bold">{severityCounts[severity]}</span>
                <span className="text-sm capitalize">{severity}</span>
              </button>
            ))}
          </div>

          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-500">Security Alert</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Exposed credentials were found during the scan. Immediate remediation is required
                  to prevent unauthorized access.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredCreds.map((cred) => (
          <Card key={cred.id} padding="none" className="overflow-hidden">
            <div
              className={cn(
                'flex items-start gap-4 p-4 border-l-4',
                cred.severity === 'critical' && 'border-l-red-500 bg-red-500/5',
                cred.severity === 'high' && 'border-l-orange-500 bg-orange-500/5',
                cred.severity === 'medium' && 'border-l-yellow-500 bg-yellow-500/5',
                cred.severity === 'low' && 'border-l-blue-500 bg-blue-500/5'
              )}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="p-2 rounded-lg bg-muted/50">{getTypeIcon(cred.type)}</div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{cred.service}</span>
                    <Badge variant={cred.severity === 'critical' ? 'critical' : cred.severity === 'high' ? 'high' : 'warning'}>
                      {cred.severity.toUpperCase()}
                    </Badge>
                    {cred.verified && (
                      <Badge variant="success" size="sm">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    {cred.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground min-w-[80px]">Email:</span>
                        <span className="font-mono">{cred.email}</span>
                      </div>
                    )}
                    {cred.username && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground min-w-[80px]">Username:</span>
                        <span className="font-mono">{cred.username}</span>
                      </div>
                    )}
                    {cred.password && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground min-w-[80px]">Password:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {visiblePasswords.has(cred.id) ? cred.password : '••••••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(cred.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {visiblePasswords.has(cred.id) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    {cred.token && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground min-w-[80px]">Token:</span>
                        <span className="font-mono text-xs truncate max-w-[300px]">
                          {visiblePasswords.has(cred.id)
                            ? cred.token
                            : cred.token.substring(0, 20) + '...'}
                        </span>
                      </div>
                    )}
                    {cred.url && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground min-w-[80px]">URL:</span>
                        <a
                          href={cred.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline truncate flex items-center gap-1"
                        >
                          {cred.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="px-4 py-2 bg-muted/20 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Discovered: {formatTimestamp(cred.discoveredAt)}</span>
              </div>
              <Badge variant="default" size="sm">
                {cred.type.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}
