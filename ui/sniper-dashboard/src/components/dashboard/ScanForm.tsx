'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Search, Loader2, Terminal, X, Play, AlertCircle, CheckCircle2, Bug, ArrowDown } from 'lucide-react';

export interface ScanStatus {
  stage: string;
  progress: number;
  message: string;
  timestamp: string;
}

export interface ScanOutput {
  type: 'start' | 'output' | 'status' | 'error' | 'complete';
  target?: string;
  mode?: string;
  line?: string;
  lineNumber?: number;
  stage?: string;
  progress?: number;
  message?: string;
  code?: number;
  error?: string;
  totalLines?: number;
  simulation?: boolean;
  timestamp: string;
}

interface ScanFormProps {
  onScanStart: (target: string, mode: string) => void;
  onScanOutput: (output: ScanOutput) => void;
  onScanComplete: (target: string) => void;
  isScanning: boolean;
  currentTarget: string | null;
}

export function ScanForm({ onScanStart, onScanOutput, onScanComplete, isScanning, currentTarget }: ScanFormProps) {
  const [target, setTarget] = useState('');
  const [mode, setMode] = useState('normal');
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedTarget = target.trim();
    if (!trimmedTarget) {
      setError('Please enter a domain or IP address');
      return;
    }

    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    
    if (!domainRegex.test(trimmedTarget) && !ipRegex.test(trimmedTarget) && !cidrRegex.test(trimmedTarget)) {
      setError('Invalid domain, IP address, or CIDR format');
      return;
    }

    setError(null);
    
    console.log('%c══════════════════════════════════════════════════════════════', 'color: #ff4444');
    console.log(`%c[SNIPER SCAN STARTED]`, 'color: #00ff00; font-weight: bold; font-size: 14px');
    console.log(`%cTarget: ${trimmedTarget} | Mode: ${mode} | Debug: ${debug}`, 'color: #00aaff');
    console.log('%c══════════════════════════════════════════════════════════════', 'color: #ff4444');
    
    onScanStart(trimmedTarget, mode);

    try {
      console.log('[FRONTEND] Sending scan request to API...');
      
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: trimmedTarget, mode, type: 'webapp', debug }),
      });

      console.log('[FRONTEND] Response status:', response.status);
      console.log('[FRONTEND] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errData = await response.json();
        console.error('[FRONTEND] API error:', errData);
        setError(errData.error || 'Failed to start scan');
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        console.error('[FRONTEND] No reader available');
        setError('Failed to get response stream');
        return;
      }

      console.log('[FRONTEND] Starting to read stream...');
      
      const decoder = new TextDecoder();
      let buffer = '';
      let eventCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('[FRONTEND] Stream complete. Total events:', eventCount);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log('[FRONTEND] Received chunk:', chunk.substring(0, 100) + '...');
        buffer += chunk;
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            
            try {
              const data = JSON.parse(jsonStr) as ScanOutput;
              eventCount++;
              
              // Log to browser console based on type
              const timestamp = new Date(data.timestamp).toLocaleTimeString();
              
              switch (data.type) {
                case 'start':
                  console.log('%c[SCAN START]', 'color: #00ff00; font-weight: bold', data);
                  if (data.simulation) {
                    console.log('%c[!] Running in SIMULATION mode - sniper requires root access', 'color: #ffaa00');
                  }
                  break;
                case 'output':
                  console.log(`%c[${timestamp}]`, 'color: #888888', data.line || '');
                  break;
                case 'status':
                  console.log(`%c[${timestamp}] [STATUS]`, 'color: #ffff00; font-weight: bold', 
                    `${data.stage}: ${data.progress}%`);
                  break;
                case 'error':
                  console.error(`%c[${timestamp}] [ERROR]`, 'color: #ff0000; font-weight: bold', 
                    data.error || data.line || '');
                  break;
                case 'complete':
                  console.log('%c══════════════════════════════════════════════════════════════', 'color: #00ff00');
                  console.log(`%c[SCAN COMPLETE]`, 'color: #00ff00; font-weight: bold; font-size: 14px', data);
                  console.log('%c══════════════════════════════════════════════════════════════', 'color: #00ff00');
                  break;
              }
              
              onScanOutput(data);
              
              if (data.type === 'complete') {
                onScanComplete(trimmedTarget);
              }
            } catch (parseError) {
              console.error('[FRONTEND] Parse error:', parseError, 'for line:', jsonStr);
            }
          }
        }
      }
    } catch (err) {
      console.error('[FRONTEND] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Scan failed');
    }
  };

  const modes = [
    { value: 'normal', label: 'Normal', description: 'Full assessment' },
    { value: 'stealth', label: 'Stealth', description: 'Passive scan' },
    { value: 'discover', label: 'Discover', description: 'Host discovery' },
    { value: 'web', label: 'Web Only', description: 'Web scanning only' },
    { value: 'webscan', label: 'Webscan', description: 'Deep web scan' },
  ];

  return (
    <Card className="mb-4 sm:mb-6">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Search className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
          <CardTitle className="text-base sm:text-lg">Web Application Scan</CardTitle>
        </div>
        {isScanning && (
          <Badge variant="warning" className="animate-pulse mt-2 sm:mt-0">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            <span className="hidden sm:inline">Scanning </span>{currentTarget}...
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Enter domain (e.g., example.com) or IP"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-border bg-background text-foreground text-sm sm:text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                disabled={isScanning}
              />
            </div>
            <div className="flex gap-3">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                disabled={isScanning}
              >
                {modes.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <Button
                type="submit"
                variant="primary"
                disabled={isScanning}
                className="min-w-[100px] sm:min-w-[120px]"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline ml-1">Scanning</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Start</span>
                    <span className="sm:hidden ml-1">Scan</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs text-muted-foreground">
            {modes.map(m => (
              <div 
                key={m.value}
                className={`px-2 py-1 rounded transition-colors ${mode === m.value ? 'bg-red-500/10 text-red-400' : 'hover:bg-muted/50'}`}
              >
                {m.description}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer hover:opacity-80 transition-opacity">
              <input
                type="checkbox"
                checked={debug}
                onChange={(e) => setDebug(e.target.checked)}
                className="rounded border-border w-4 h-4"
                disabled={isScanning}
              />
              <Bug className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
              <span>Debug/Simulation Mode</span>
            </label>
            <span className="text-xs text-muted-foreground hidden sm:inline">(Use if sniper requires root access)</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-xs sm:text-sm animate-shake">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              {error}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

interface ScanOutputPanelProps {
  outputs: ScanOutput[];
  status: ScanStatus | null;
  isScanning: boolean;
  onClear: () => void;
}

export function ScanOutputPanel({ outputs, status, isScanning, onClear }: ScanOutputPanelProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<'all' | 'error' | 'status'>('all');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when new content arrives and auto-scroll is enabled
  useEffect(() => {
    if (autoScroll && outputRef.current && !isUserScrolling.current) {
      const container = outputRef.current;
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (container && autoScroll) {
          container.scrollTop = container.scrollHeight;
        }
      }, 0);
    }
  }, [outputs, autoScroll]);

  // Re-enable auto-scroll when user scrolls to bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 30;
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Show scroll button if not at bottom
    setShowScrollButton(!isAtBottom);
    
    // If user scrolled to bottom, re-enable auto-scroll
    if (isAtBottom) {
      setAutoScroll(true);
      isUserScrolling.current = false;
    } else {
      // User is scrolling away from bottom
      isUserScrolling.current = true;
      // Set a timeout to check if they stopped scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrolling.current = false;
      }, 150);
    }
  };

  // Manual scroll to bottom
  const scrollToBottom = () => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
      setAutoScroll(true);
      isUserScrolling.current = false;
      setShowScrollButton(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  if (outputs.length === 0 && !isScanning) return null;

  const filteredOutputs = outputs.filter(o => {
    if (filter === 'error') return o.type === 'error';
    if (filter === 'status') return o.type === 'status';
    return true;
  });

  const isSimulation = outputs.some(o => o.simulation);

  const stageLabels: Record<string, string> = {
    discovery: 'Host Discovery',
    tcp_scan: 'TCP Port Scan',
    udp_scan: 'UDP Port Scan',
    port_found: 'Port Detection',
    nmap: 'Nmap Scan',
    webscan: 'Web Application Scan',
    vulnscan: 'Vulnerability Scan',
    osint: 'OSINT Gathering',
    os_fingerprint: 'OS Fingerprinting',
    complete: 'Scan Complete',
    error: 'Error',
    init: 'Initializing',
    dns: 'DNS Enumeration',
  };

  return (
    <Card className="mb-4 sm:mb-6">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Terminal className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
          <CardTitle className="text-base sm:text-lg">Real-time Scan Output</CardTitle>
          {isSimulation && (
            <Badge variant="warning" size="sm">SIMULATION</Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
          {status && (
            <Badge variant={
              status.stage === 'complete' ? 'success' :
              status.stage === 'error' ? 'critical' : 'info'
            }>
              {stageLabels[status.stage] || status.stage} - {status.progress}%
            </Badge>
          )}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-xs px-2 py-1 rounded border border-border bg-background"
          >
            <option value="all">All</option>
            <option value="status">Status</option>
            <option value="error">Errors</option>
          </select>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline ml-1">Clear</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {status && status.progress > 0 && status.progress < 100 && (
          <div className="mb-3 sm:mb-4">
            <div className="flex justify-between text-xs sm:text-sm mb-1">
              <span className="text-muted-foreground">{stageLabels[status.stage] || status.stage}</span>
              <span className="text-foreground font-medium">{status.progress}%</span>
            </div>
            <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-300 ease-out"
                style={{ width: `${status.progress}%` }}
              />
            </div>
            {status.message && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{status.message}</p>
            )}
          </div>
        )}

        <div className="relative">
          <div 
            ref={outputRef}
            onScroll={handleScroll}
            className="bg-black rounded-lg p-3 sm:p-4 max-h-[300px] sm:max-h-[400px] overflow-y-auto font-mono text-xs sm:text-sm"
          >
            {filteredOutputs.length === 0 ? (
              <div className="text-gray-400 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Waiting for scan output...
              </div>
            ) : (
              filteredOutputs.map((output, index) => (
                <div 
                  key={index}
                  className={`py-0.5 whitespace-pre-wrap break-all leading-relaxed ${
                    output.type === 'error' ? 'text-red-400' :
                    output.type === 'complete' ? 'text-green-400 font-medium' :
                    output.type === 'status' ? 'text-yellow-400' :
                    output.line?.startsWith('[+]') ? 'text-green-300' :
                    output.line?.startsWith('[-]') ? 'text-red-300' :
                    output.line?.startsWith('[!]') ? 'text-yellow-300' :
                    output.line?.includes('====') ? 'text-red-400' :
                    'text-gray-300'
                  }`}
                >
                  {output.lineNumber !== undefined && (
                    <span className="text-gray-600 mr-1 sm:mr-2 select-none text-[10px] sm:text-xs">{String(output.lineNumber).padStart(3, ' ')}</span>
                  )}
                  {output.line || output.message || (output.type === 'complete' ? <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Scan completed! ({output.totalLines || 0} lines)</span> : '')}
                </div>
              ))
            )}
            {isScanning && (
              <div className="text-yellow-400 animate-pulse py-0.5 mt-1 flex items-center gap-1">
                <span className="text-gray-600 mr-1 sm:mr-2">   </span>
                <Loader2 className="h-3 w-3 animate-spin" />
                Waiting for more output...
              </div>
            )}
          </div>
          
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all animate-bounce"
              title="Scroll to bottom"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{filteredOutputs.length} lines</span>
          <label className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => {
                setAutoScroll(e.target.checked);
                if (e.target.checked) {
                  scrollToBottom();
                }
              }}
              className="rounded w-3 h-3 accent-red-500"
            />
            Auto-scroll
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
