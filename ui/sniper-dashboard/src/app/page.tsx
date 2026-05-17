'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeProvider } from '@/hooks/useTheme';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { LandingPage } from '@/components/dashboard/LandingPage';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { VulnerabilityPanel } from '@/components/dashboard/VulnerabilityPanel';
import { NetworkPanel } from '@/components/dashboard/NetworkPanel';
import { WebPanel } from '@/components/dashboard/WebPanel';
import { SSLPanel, DNSPanel } from '@/components/dashboard/SSLPanel';
import { OSINTPanel } from '@/components/dashboard/OSINTPanel';
import { CredentialsPanel } from '@/components/dashboard/CredentialsPanel';
import { NotesPanel } from '@/components/dashboard/NotesPanel';
import { ScreenshotsPanel } from '@/components/dashboard/ScreenshotsPanel';
import { SettingsPanel } from '@/components/dashboard/SettingsPanel';
import { SearchPanel } from '@/components/dashboard/SearchPanel';
import { ExportPanel } from '@/components/dashboard/ExportPanel';
import { ScanForm, ScanOutputPanel, ScanOutput, ScanStatus } from '@/components/dashboard/ScanForm';
import { NetworkScanForm } from '@/components/dashboard/NetworkScanForm';
import { ScanData, Vulnerability, Workspace, Port, Technology, HttpHeaders, DomainInfo, SSLInfo, DNSRecord, EmailConfig } from '@/types';
import { calculateRiskScore } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FileText, Download, Search, RefreshCw, FolderOpen, X, Zap, ArrowLeft } from 'lucide-react';

type PentestMode = 'landing' | 'webapp' | 'network';

export default function Home() {
  const [pentestMode, setPentestMode] = useState<PentestMode>('landing');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [workspace, setWorkspace] = useState<string>('adorsys.com');
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [data, setData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [currentScanTarget, setCurrentScanTarget] = useState<string | null>(null);
  const [scanOutputs, setScanOutputs] = useState<ScanOutput[]>([]);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [scanStartTime, setScanStartTime] = useState<string | null>(null);
  const [scanEndTime, setScanEndTime] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scanStartRef = useRef<Date | null>(null);

  interface ScanSession {
    id: string;
    target: string;
    mode: 'webapp' | 'network';
    startTime: string;
    endTime?: string;
    status: 'running' | 'completed' | 'failed';
    outputCount: number;
  }

  useEffect(() => {
    const savedSessions = localStorage.getItem('sniper_sessions');
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sniper_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    fetch('/api/workspace')
      .then(res => res.json())
      .then(res => {
        if (res.workspaces) {
          setWorkspaces(res.workspaces);
          if (res.workspaces.length > 0) {
            setWorkspace(res.workspaces[0]);
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!workspace || pentestMode === 'landing') return;
    
    setLoading(true);
    setError(null);
    
    fetch(`/api/workspace?workspace=${encodeURIComponent(workspace)}`)
      .then(res => res.json())
      .then(res => {
        if (res.error) {
          setError(res.error);
        } else {
          setData(res as ScanData);
        }
      })
      .catch(err => {
        setError('Failed to load workspace data');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [workspace, pentestMode]);

  const handleModeSelect = (mode: 'webapp' | 'network') => {
    setPentestMode(mode);
    setActiveTab('dashboard');
    setLoading(true);
  };

  const formatElapsedTime = (startDate: Date): string => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - startDate.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isScanning && scanStartRef.current) {
      timerIntervalRef.current = setInterval(() => {
        if (scanStartRef.current) {
          setElapsedTime(formatElapsedTime(scanStartRef.current));
        }
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isScanning]);

  const handleBackToLanding = () => {
    setPentestMode('landing');
    setIsScanning(false);
    setIsStopping(false);
    setCurrentScanTarget(null);
    setScanOutputs([]);
    setScanStatus(null);
    setScanStartTime(null);
    setScanEndTime(null);
    setElapsedTime('00:00:00');
    scanStartRef.current = null;
  };

  const handleStopScan = async () => {
    if (!currentScanTarget) return;
    
    setIsStopping(true);
    try {
      const response = await fetch(`/api/scan?target=${encodeURIComponent(currentScanTarget)}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setIsScanning(false);
        setIsStopping(false);
        setCurrentScanTarget(null);
        // Add a message to output
        handleScanOutput({
          type: 'error',
          line: 'Scan stopped by user',
          timestamp: new Date().toISOString()
        });
      } else {
        const err = await response.json();
        console.error('Failed to stop scan:', err.error);
        setIsStopping(false);
      }
    } catch (err) {
      console.error('Error stopping scan:', err);
      setIsStopping(false);
    }
  };

  const handleDeleteWorkspace = async (wsName: string) => {
    if (!confirm(`Are you sure you want to delete workspace "${wsName}"? All data will be permanently removed.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/workspace?workspace=${encodeURIComponent(wsName)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setWorkspaces(prev => prev.filter(w => w !== wsName));
        setSessions(prev => prev.filter(s => s.target !== wsName));
        if (workspace === wsName) {
          if (workspaces.length > 1) {
            const nextWs = workspaces.find(w => w !== wsName) || '';
            setWorkspace(nextWs);
          } else {
            setPentestMode('landing');
          }
        }
      } else {
        const err = await response.json();
        alert(`Failed to delete workspace: ${err.error}`);
      }
    } catch (err) {
      console.error('Error deleting workspace:', err);
      alert('Failed to delete workspace due to a network error');
    }
  };

  const handleScanStart = useCallback((target: string, mode: string) => {
    setIsScanning(true);
    setCurrentScanTarget(target);
    setScanOutputs([]);
    setScanStatus(null);
    setWorkspace(target);
    const startTime = new Date();
    setScanStartTime(startTime.toISOString());
    setScanEndTime(null);
    setElapsedTime('00:00:00');
    scanStartRef.current = startTime;
    
    console.log('%c══════════════════════════════════════════════════════════════', 'color: #ff4444');
    console.log(`%c[SNIPER SCAN STARTED]`, 'color: #00ff00; font-weight: bold; font-size: 14px');
    console.log(`%cTarget: ${target} | Mode: ${mode} | Type: ${pentestMode}`, 'color: #00aaff');
    console.log('%c══════════════════════════════════════════════════════════════', 'color: #ff4444');
    
    const newSession: ScanSession = {
      id: `session-${Date.now()}`,
      target,
      mode: pentestMode as 'webapp' | 'network',
      startTime: startTime.toISOString(),
      status: 'running',
      outputCount: 0,
    };
    setSessions(prev => [newSession, ...prev.slice(0, 49)]);
  }, [pentestMode]);

  const handleScanOutput = useCallback((output: ScanOutput) => {
    // Log all output to browser console
    const timestamp = new Date(output.timestamp).toLocaleTimeString();
    
    switch (output.type) {
      case 'output':
        console.log(`%c[${timestamp}]`, 'color: #888888', output.line || '');
        break;
      case 'status':
        console.log(`%c[${timestamp}] [STATUS]`, 'color: #ffff00; font-weight: bold', 
          `${output.stage}: ${output.progress}%`);
        break;
      case 'error':
        console.error(`%c[${timestamp}] [ERROR]`, 'color: #ff0000; font-weight: bold', 
          output.line || output.error || '');
        break;
      case 'complete':
        console.log('%c══════════════════════════════════════════════════════════════', 'color: #00ff00');
        console.log(`%c[SCAN COMPLETE]`, 'color: #00ff00; font-weight: bold; font-size: 14px', output);
        console.log('%c══════════════════════════════════════════════════════════════', 'color: #00ff00');
        break;
    }
    
    setScanOutputs(prev => [...prev.slice(-1000), output]);
    if (output.type === 'status' && output.stage && output.progress !== undefined) {
      setScanStatus({
        stage: output.stage,
        progress: output.progress,
        message: output.message || '',
        timestamp: output.timestamp,
      });
    }
  }, []);

  const handleScanComplete = useCallback((target: string) => {
    setIsScanning(false);
    setCurrentScanTarget(null);
    const endTime = new Date();
    setScanEndTime(endTime.toISOString());
    scanStartRef.current = null;
    setWorkspaces(prev => {
      if (!prev.includes(target)) {
        return [target, ...prev];
      }
      return prev;
    });
    
    setSessions(prev => prev.map(s => 
      s.target === target && s.status === 'running'
        ? { ...s, status: 'completed', endTime: new Date().toISOString(), outputCount: scanOutputs.length }
        : s
    ));
    
    // Check if this was a simulation scan
    const isSimulation = scanOutputs.some(o => o.simulation);
    
    // Parse vulnerabilities from scan outputs for display
    const parsedVulns = parseVulnerabilitiesFromOutputs(scanOutputs);
    
    setTimeout(() => {
      fetch(`/api/workspace?workspace=${encodeURIComponent(target)}`)
        .then(res => res.json())
        .then(res => {
          if (!res.error) {
            const scanData = res as ScanData;
            
            // If we parsed vulnerabilities from stream but workspace has fewer, use parsed ones
            if (parsedVulns.length > 0 && parsedVulns.length > scanData.vulnerabilities.length) {
              const vulnCounts = {
                critical: parsedVulns.filter(v => v.severity === 'critical').length,
                high: parsedVulns.filter(v => v.severity === 'high').length,
                medium: parsedVulns.filter(v => v.severity === 'medium').length,
                low: parsedVulns.filter(v => v.severity === 'low').length,
                info: parsedVulns.filter(v => v.severity === 'info').length,
                total: parsedVulns.length,
              };
              
              setData({
                ...scanData,
                vulnerabilities: parsedVulns,
                workspace: {
                  ...scanData.workspace,
                  vulnerabilities: vulnCounts,
                  score: calculateRiskScore(vulnCounts),
                },
              });
            } else {
              setData(scanData);
            }
          } else if (isSimulation && parsedVulns.length > 0) {
            // No workspace files but we have parsed vulnerabilities from simulation
            const vulnCounts = {
              critical: parsedVulns.filter(v => v.severity === 'critical').length,
              high: parsedVulns.filter(v => v.severity === 'high').length,
              medium: parsedVulns.filter(v => v.severity === 'medium').length,
              low: parsedVulns.filter(v => v.severity === 'low').length,
              info: parsedVulns.filter(v => v.severity === 'info').length,
              total: parsedVulns.length,
            };
            
            setData({
              workspace: {
                name: target,
                target: target,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                scanMode: 'normal',
                status: 'completed',
                score: calculateRiskScore(vulnCounts),
                vulnerabilities: vulnCounts,
                ips: [],
                ports: [],
                domains: [target],
                hostnames: [],
                screenshotCount: 0,
                credentialCount: 0,
                noteCount: 0,
              },
              vulnerabilities: parsedVulns,
              domainInfo: {
                domain: target,
                registrar: 'Unknown',
                registrationDate: '',
                expirationDate: '',
                lastChangeDate: '',
                nameservers: [],
                status: [],
                secureDNS: false,
                registrarEmail: '',
                registrarUrl: '',
                registrarPhone: '',
              },
              sslInfo: { issuer: '', dnsNames: [], tlsVersions: [] },
              dnsRecords: [],
              emailConfig: { mxRecords: [], dkim: [], spf: '', dmarc: '' },
              webInfo: { title: '', technologies: [], headers: [], cookies: [], forms: [], urls: [] },
              osFingerprint: '',
              rawOutput: '',
              ip: '',
              hostname: '',
            } as ScanData);
          }
        })
        .catch(console.error);
    }, 2000);
  }, [scanOutputs]);

  const handleClearScanOutputs = useCallback(() => {
    setScanOutputs([]);
    setScanStatus(null);
  }, []);

  useEffect(() => {
    if (isScanning && currentScanTarget) {
      refreshIntervalRef.current = setInterval(() => {
        fetch(`/api/workspace?workspace=${encodeURIComponent(currentScanTarget)}`)
          .then(res => res.json())
          .then(res => {
            if (!res.error) {
              setData(res as ScanData);
            }
          })
          .catch(() => {});
      }, 5000);
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isScanning, currentScanTarget]);

  const handleSearchResult = (type: string, item: any) => {
    switch (type) {
      case 'vulnerability':
        setActiveTab('vulnerabilities');
        break;
      case 'port':
        setActiveTab('network');
        break;
      case 'technology':
        setActiveTab('web');
        break;
      case 'url':
        setActiveTab('web');
        break;
    }
  };

  const renderContent = () => {
    if (loading && !isScanning) {
      return (
        <div className="flex items-center justify-center h-[600px]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-red-500/30 border-t-red-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 rounded-full bg-red-500/20 animate-pulse" />
              </div>
            </div>
            <p className="text-muted-foreground animate-pulse">Loading scan data...</p>
          </div>
        </div>
      );
    }

    if (error && !isScanning) {
      return (
        <Card className="max-w-lg mx-auto mt-20">
          <CardContent className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (!data && !isScanning) {
      return (
        <Card className="max-w-lg mx-auto mt-20">
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No workspace selected. Start a new scan above.</p>
          </CardContent>
        </Card>
      );
    }

    if (showExport && data) {
      return (
        <ExportPanel
          workspace={data.workspace}
          vulnerabilities={data.vulnerabilities}
          onClose={() => setShowExport(false)}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return data ? <DashboardOverview workspace={data.workspace} vulnerabilities={data.vulnerabilities} isScanning={isScanning} currentScanTarget={currentScanTarget} /> : null;
      case 'vulnerabilities':
        return data ? <VulnerabilityPanel vulnerabilities={data.vulnerabilities} score={data.workspace.score} /> : null;
      case 'network':
        return data ? (
          <NetworkPanel
            ports={data.workspace.ports}
            ip={data.ip}
            osFingerprint={data.osFingerprint}
            hostname={data.hostname}
          />
        ) : null;
      case 'web':
        return data ? (
          <WebPanel
            technologies={data.webInfo?.technologies || []}
            headers={data.webInfo?.headers || []}
            title={data.webInfo?.title}
            urls={data.webInfo?.urls}
          />
        ) : null;
      case 'ssl':
        return data ? <SSLPanel sslInfo={data.sslInfo} domainInfo={data.domainInfo} /> : null;
      case 'dns':
        return data ? <DNSPanel records={data.dnsRecords} emailConfig={data.emailConfig} /> : null;
      case 'whois':
        return data ? <SSLPanel domainInfo={data.domainInfo} /> : null;
      case 'osint':
        return data ? <OSINTPanel data={data.osint} target={data.workspace.target} /> : null;
      case 'credentials':
        return data ? <CredentialsPanel credentials={data.credentials} /> : null;
      case 'notes':
        return data ? <NotesPanel notes={data.notes} workspaceName={data.workspace.name} /> : null;
      case 'screenshots':
        return data ? <ScreenshotsPanel screenshots={data.screenshots} workspacePath={`/usr/share/sniper/loot/workspace/${workspace}`} /> : null;
      case 'settings':
        return <SettingsPanel />;
      case 'reports':
        return <ReportsPanel workspace={workspace} onExport={() => setShowExport(true)} />;
      default:
        return data ? <DashboardOverview workspace={data.workspace} vulnerabilities={data.vulnerabilities} isScanning={isScanning} currentScanTarget={currentScanTarget} /> : null;
    }
  };

  if (pentestMode === 'landing') {
    return (
      <ThemeProvider>
        <LandingPage onSelectMode={handleModeSelect} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        <Header activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} pentestMode={pentestMode} />
          <main className="flex-1 lg:ml-56 xl:ml-64 p-4 sm:p-6">
            <div className="mb-3 sm:mb-4">
              <Button variant="ghost" size="sm" onClick={handleBackToLanding} className="hover:bg-muted/50">
                <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Home</span>
              </Button>
            </div>
            
            {pentestMode === 'webapp' ? (
              <ScanForm
                onScanStart={handleScanStart}
                onScanOutput={handleScanOutput}
                onScanComplete={handleScanComplete}
                isScanning={isScanning}
                currentTarget={currentScanTarget}
              />
            ) : (
              <NetworkScanForm
                onScanStart={handleScanStart}
                onScanOutput={handleScanOutput}
                onScanComplete={handleScanComplete}
                isScanning={isScanning}
                currentTarget={currentScanTarget}
              />
            )}
            
            <ScanOutputPanel
              outputs={scanOutputs}
              status={scanStatus}
              isScanning={isScanning}
              isStopping={isStopping}
              onStop={handleStopScan}
              onClear={handleClearScanOutputs}
              scanStartTime={scanStartTime}
              scanEndTime={scanEndTime}
              elapsedTime={elapsedTime}
            />
            
            <SessionHistory sessions={sessions} onSelectSession={(s) => setWorkspace(s.target)} onDeleteSession={(id) => setSessions(prev => prev.filter(s => s.id !== id))} />
            
            <WorkspaceSelector 
              workspace={workspace} 
              workspaces={workspaces}
              onSelect={setWorkspace}
              onDelete={handleDeleteWorkspace}
            />
            {renderContent()}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}

interface WorkspaceSelectorProps {
  workspace: string;
  workspaces: string[];
  onSelect: (w: string) => void;
  onDelete: (w: string) => void;
}

function WorkspaceSelector({ workspace, workspaces, onSelect, onDelete }: WorkspaceSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2 sm:gap-4">
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setOpen(!open)}
          className="min-w-[160px] sm:min-w-[200px] justify-between"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="truncate max-w-[100px] sm:max-w-none">{workspace}</span>
          </div>
          <svg
            className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
        
        {open && (
          <div className="absolute top-full left-0 mt-1 w-[200px] sm:w-[240px] rounded-lg border border-border bg-card shadow-lg z-50">
            <div className="p-1.5 sm:p-2">
              <p className="text-xs text-muted-foreground px-2 py-1">Workspaces</p>
              {workspaces.map((w) => (
                <div key={w} className="flex items-center group">
                  <button
                    onClick={() => {
                      onSelect(w);
                      setOpen(false);
                    }}
                    className={`flex-1 text-left px-2 py-1 sm:py-1.5 rounded text-xs sm:text-sm truncate ${
                      w === workspace ? 'bg-red-500/10 text-red-500' : 'hover:bg-muted'
                    }`}
                  >
                    {w}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(w);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                    title="Delete workspace"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {workspaces.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-2">No workspaces found</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline ml-1">Refresh</span>
      </Button>
      <Button variant="primary" size="sm" onClick={() => window.open('/api/workspace?workspace=' + encodeURIComponent(workspace), '_blank')}>
        <Download className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline ml-1">Export</span>
      </Button>
    </div>
  );
}

interface SessionHistoryProps {
  sessions: Array<{
    id: string;
    target: string;
    mode: 'webapp' | 'network';
    startTime: string;
    endTime?: string;
    status: 'running' | 'completed' | 'failed';
    outputCount: number;
  }>;
  onSelectSession: (session: any) => void;
  onDeleteSession: (id: string) => void;
}

function SessionHistory({ sessions, onSelectSession, onDeleteSession }: SessionHistoryProps) {
  if (sessions.length === 0) return null;

  return (
    <Card className="mb-4 sm:mb-6">
      <CardHeader>
        <div className="flex items-center gap-2 sm:gap-3">
          <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
          <CardTitle className="text-base sm:text-lg">Recent Sessions</CardTitle>
        </div>
        <Badge variant="info" size="sm">{sessions.length}</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5 sm:space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
          {sessions.slice(0, 10).map((session) => (
            <div
              key={session.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors group"
              onClick={() => onSelectSession(session)}
              style={{ cursor: 'pointer' }}
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-0">
                <Badge variant={session.status === 'completed' ? 'success' : session.status === 'running' ? 'warning' : 'critical'} size="sm">
                  {session.status}
                </Badge>
                <span className="font-medium text-sm sm:text-base truncate">{session.target}</span>
                <Badge variant="default" size="sm" className="hidden sm:inline">{session.mode}</Badge>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 text-xs text-muted-foreground pl-7 sm:pl-0">
                <span>{session.outputCount} outputs</span>
                <span>{new Date(session.startTime).toLocaleTimeString()}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                  title="Delete session"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReportsPanel({ workspace, onExport }: { workspace: string; onExport: () => void }) {
  const reports = [
    { name: 'Vulnerability Report', file: `vulnerabilities/vulnerability-report-${workspace}.txt`, type: 'txt' },
    { name: 'NMap Report', file: `nmap/nmapreport-${workspace}.html`, type: 'html' },
    { name: 'Port Scan', file: `nmap/nmap-${workspace}.txt`, type: 'txt' },
    { name: 'HTTP Headers', file: `web/headers-https-${workspace}-443.txt`, type: 'txt' },
    { name: 'Nuclei Scan', file: `web/nuclei-https-${workspace}-port443.txt`, type: 'txt' },
    { name: 'All Vulnerabilities', file: `vulnerabilities/sc0pe-all-vulnerabilities-sorted.txt`, type: 'txt' },
    { name: 'Spider Results', file: `web/spider-${workspace}.txt`, type: 'txt' },
    { name: 'Wayback URLs', file: `web/waybackurls-${workspace}.txt`, type: 'txt' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-red-500" />
            <CardTitle>Quick Export</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Generate a comprehensive report in various formats for sharing or documentation.
          </p>
          <Button variant="primary" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Full Report
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-red-500" />
            <CardTitle>Available Reports</CardTitle>
          </div>
          <Badge variant="info">{reports.length} reports</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.file}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{report.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">{report.file}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">{report.type.toUpperCase()}</Badge>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function parseVulnerabilitiesFromOutputs(outputs: ScanOutput[]): Vulnerability[] {
  const vulns: Vulnerability[] = [];
  const severityKeywords: Record<string, { keywords: string[], severity: 'critical' | 'high' | 'medium' | 'low' | 'info' }> = {
    critical: { keywords: ['CRITICAL', 'CVE-2021-44228', 'Log4j', 'RCE', 'Remote Code Execution'], severity: 'critical' },
    high: { keywords: ['HIGH', 'CVE-2022-22965', 'Spring4Shell', 'SQL Injection', 'XSS', 'Authentication Bypass'], severity: 'high' },
    medium: { keywords: ['MEDIUM', 'IDOR', 'Information Disclosure', 'Session Management', 'CSRF'], severity: 'medium' },
    low: { keywords: ['LOW', 'Clickjacking', 'Missing Header', 'Cookie'], severity: 'low' },
    info: { keywords: ['INFO', 'detected', 'found', 'identified', 'enumeration'], severity: 'info' },
  };

  for (const output of outputs) {
    if (output.type !== 'output' || !output.line) continue;
    
    const line = output.line;
    
    // Check for CVE patterns
    const cveMatch = line.match(/(CVE-\d{4}-\d+)/);
    const cvssMatch = line.match(/(\d+\.\d+)\s+(?:https:|CVSS)/);
    
    // Determine severity from content
    let severity: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'info';
    for (const [level, config] of Object.entries(severityKeywords)) {
      if (config.keywords.some(kw => line.toUpperCase().includes(kw.toUpperCase()))) {
        severity = config.severity;
        break;
      }
    }
    
    // Parse vulnerability from line patterns
    if (line.includes('[+]') && (line.includes('CVE') || line.includes('vulnerability') || line.includes('VULNERABILITY'))) {
      const titleMatch = line.match(/\[\+\]\s*(.+?)(?:\s*\(.*?\))?$/);
      if (titleMatch) {
        vulns.push({
          id: `vuln-${vulns.length}`,
          priority: severity === 'critical' ? 'P1' : severity === 'high' ? 'P2' : severity === 'medium' ? 'P3' : 'P5',
          severity,
          title: titleMatch[1].trim(),
          target: '',
          details: line,
          cve: cveMatch?.[1] || '',
          cvss: cvssMatch ? parseFloat(cvssMatch[1]) : 0,
          reference: '',
        });
      }
    }
  }
  
  return vulns;
}
