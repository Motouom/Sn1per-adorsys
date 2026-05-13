'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Trash2,
  Eye,
  Calendar,
  Globe,
  Network,
  Filter,
  Search,
} from 'lucide-react';

interface ScanSession {
  id: string;
  target: string;
  mode: 'webapp' | 'network';
  scanType: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'running' | 'completed' | 'failed';
  outputCount: number;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  notes?: string;
}

export default function ScansPage() {
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'running' | 'completed' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions?action=list');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scan?')) return;
    
    try {
      await fetch(`/api/sessions?id=${id}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return `${hours}h ${remainMins}m`;
    }
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredSessions = sessions.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (searchQuery && !s.target.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalVulns = sessions.reduce((acc, s) => 
    acc + s.vulnerabilities.critical + s.vulnerabilities.high + s.vulnerabilities.medium, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Scan History</h1>
            <p className="text-muted-foreground text-sm">
              {sessions.length} scans • {totalVulns} total vulnerabilities found
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">
              <Play className="h-4 w-4 mr-2" />
              New Scan
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-6 flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search scans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'running', 'completed', 'failed'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 border-2 border-red-500/30 border-t-red-500 animate-spin rounded-full" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No Scans Found</p>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filter !== 'all' 
                  ? 'No scans match your filters'
                  : 'Start your first scan to see results here'}
              </p>
              <Link href="/">
                <Button variant="primary">Start New Scan</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <Card key={session.id} className="hover:border-red-500/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        session.status === 'running' ? 'bg-yellow-500/20 text-yellow-500' :
                        session.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {session.status === 'running' ? (
                          <Play className="h-5 w-5 animate-pulse" />
                        ) : session.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <XCircle className="h-5 w-5" />
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{session.target}</h3>
                          <Badge variant={session.mode === 'webapp' ? 'info' : 'default'} size="sm">
                            {session.mode === 'webapp' ? (
                              <><Globe className="h-3 w-3 mr-1" /> Web App</>
                            ) : (
                              <><Network className="h-3 w-3 mr-1" /> Network</>
                            )}
                          </Badge>
                          <Badge variant="default" size="sm">{session.scanType}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatTime(session.startTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(session.duration)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {session.status === 'completed' && (
                        <div className="flex items-center gap-4">
                          {session.vulnerabilities.critical > 0 && (
                            <span className="text-red-500 text-sm font-medium">
                              {session.vulnerabilities.critical} Critical
                            </span>
                          )}
                          {session.vulnerabilities.high > 0 && (
                            <span className="text-orange-500 text-sm font-medium">
                              {session.vulnerabilities.high} High
                            </span>
                          )}
                          {session.vulnerabilities.medium > 0 && (
                            <span className="text-yellow-500 text-sm font-medium">
                              {session.vulnerabilities.medium} Medium
                            </span>
                          )}
                          {session.vulnerabilities.critical === 0 && 
                           session.vulnerabilities.high === 0 && 
                           session.vulnerabilities.medium === 0 && (
                            <span className="text-green-500 text-sm">No major issues</span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Link href={`/scans/${session.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(session.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
