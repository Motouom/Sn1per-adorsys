'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Search, Loader2, Terminal, X, Play, AlertCircle, CheckCircle2, Network, Radar, Server, Bug } from 'lucide-react';

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
  stage?: string;
  progress?: number;
  message?: string;
  code?: number;
  error?: string;
  totalLines?: number;
  simulation?: boolean;
  timestamp: string;
}

interface NetworkScanFormProps {
  onScanStart: (target: string, mode: string) => void;
  onScanOutput: (output: ScanOutput) => void;
  onScanComplete: (target: string) => void;
  isScanning: boolean;
  currentTarget: string | null;
}

export function NetworkScanForm({ onScanStart, onScanOutput, onScanComplete, isScanning, currentTarget }: NetworkScanFormProps) {
  const [target, setTarget] = useState('');
  const [scanType, setScanType] = useState<'discovery' | 'portscan' | 'fullportscan' | 'vulnscan'>('discovery');
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedTarget = target.trim();
    if (!trimmedTarget) {
      setError('Please enter a domain, IP address, or CIDR range');
      return;
    }

    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    
    if (!domainRegex.test(trimmedTarget) && !ipRegex.test(trimmedTarget) && !cidrRegex.test(trimmedTarget)) {
      setError('Invalid target format. Use domain, IP, or CIDR notation.');
      return;
    }

    setError(null);
    
    console.log('%c══════════════════════════════════════════════════════════════', 'color: #4488ff');
    console.log(`%c[NETWORK SCAN STARTED]`, 'color: #00ff00; font-weight: bold; font-size: 14px');
    console.log(`%cTarget: ${trimmedTarget} | Type: ${scanType} | Debug: ${debug}`, 'color: #00aaff');
    console.log('%c══════════════════════════════════════════════════════════════', 'color: #4488ff');
    
    onScanStart(trimmedTarget, scanType);

    try {
      console.log('[FRONTEND] Sending network scan request to API...');
      
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: trimmedTarget, mode: scanType, type: 'network', debug }),
      });

      console.log('[FRONTEND] Response status:', response.status);

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
              
              const timestamp = new Date(data.timestamp).toLocaleTimeString();
              
              switch (data.type) {
                case 'start':
                  console.log('%c[NETWORK SCAN START]', 'color: #0088ff; font-weight: bold', data);
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
                  console.log(`%c[NETWORK SCAN COMPLETE]`, 'color: #00ff00; font-weight: bold; font-size: 14px', data);
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

  const scanTypes = [
    { id: 'discovery', label: 'Host Discovery', icon: <Radar className="h-4 w-4" />, description: 'Discover live hosts on the network' },
    { id: 'portscan', label: 'Port Scan', icon: <Server className="h-4 w-4" />, description: 'Scan common ports on discovered hosts' },
    { id: 'fullportscan', label: 'Full Port Scan', icon: <Network className="h-4 w-4" />, description: 'Scan all 65535 ports' },
    { id: 'vulnscan', label: 'Vulnerability Scan', icon: <Bug className="h-4 w-4" />, description: 'Detect vulnerabilities on open ports' },
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Network className="h-5 w-5 text-blue-500" />
          <CardTitle>Network Scan</CardTitle>
        </div>
        {isScanning && (
          <Badge variant="warning" className="animate-pulse">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Scanning...
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Enter IP, CIDR range (e.g., 192.168.1.0/24), or domain"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                disabled={isScanning}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={isScanning}
              className="min-w-[120px] bg-blue-500 hover:bg-blue-600"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Scan
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {scanTypes.map((type) => (
              <div
                key={type.id}
                onClick={() => !isScanning && setScanType(type.id as any)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  scanType === type.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-border hover:border-blue-500/50 hover:bg-muted/30'
                } ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {type.icon}
                  <span className="font-medium text-sm">{type.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={debug}
                onChange={(e) => setDebug(e.target.checked)}
                className="rounded border-border"
                disabled={isScanning}
              />
              <Bug className="h-4 w-4 text-yellow-500" />
              <span>Debug/Simulation Mode</span>
            </label>
            <span className="text-xs text-muted-foreground">(Use if sniper requires root access)</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
