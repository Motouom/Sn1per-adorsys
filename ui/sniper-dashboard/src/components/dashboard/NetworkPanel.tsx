'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Port } from '@/types';
import { cn, getPortStateColor, getServiceIcon } from '@/lib/utils';
import { Server, Circle } from 'lucide-react';

interface NetworkPanelProps {
  ports: Port[];
  ip: string;
  osFingerprint: string;
  hostname?: string;
}

export function NetworkPanel({ ports, ip, osFingerprint, hostname }: NetworkPanelProps) {
  const openPorts = ports.filter(p => p.state === 'open');
  const tcpPorts = ports.filter(p => p.protocol === 'tcp');
  const udpPorts = ports.filter(p => p.protocol === 'udp');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Target IP</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-bold">{ip}</p>
            {hostname && (
              <p className="text-sm text-muted-foreground mt-1">{hostname}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Open Ports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{openPorts.length}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {tcpPorts.length} TCP / {udpPorts.length} UDP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">OS Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{osFingerprint || 'Unknown'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-red-500" />
            <CardTitle>Port Scan Results</CardTitle>
          </div>
          <Badge variant="success">{ports.length} total ports</Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Port</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Protocol</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">State</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Service</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Banner</th>
                </tr>
              </thead>
              <tbody>
                {ports.map((port, index) => (
                  <tr
                    key={`${port.number}-${port.protocol}-${index}`}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getServiceIcon(port.service)}</span>
                        <span className="font-mono font-medium">{port.number}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="default">{port.protocol.toUpperCase()}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Circle
                          className={cn(
                            'h-2 w-2 fill-current',
                            getPortStateColor(port.state)
                          )}
                        />
                        <span className={cn('capitalize', getPortStateColor(port.state))}>
                          {port.state}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{port.service}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-muted-foreground font-mono truncate block max-w-xs">
                        {port.banner || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Port Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-10 gap-2">
            {Array.from({ length: 100 }, (_, i) => {
              const portNum = i + 1;
              const port = ports.find(p => p.number === portNum && p.protocol === 'tcp');
              return (
                <div
                  key={portNum}
                  className={cn(
                    'h-8 rounded flex items-center justify-center text-xs font-mono transition-all',
                    port?.state === 'open'
                      ? 'bg-green-500/20 border border-green-500/50 text-green-500'
                      : 'bg-muted/30 border border-border text-muted-foreground'
                  )}
                  title={port ? `Port ${portNum} - ${port.service} (${port.state})` : `Port ${portNum}`}
                >
                  {portNum}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-green-500/20 border border-green-500/50" />
              <span className="text-muted-foreground">Open</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-muted/30 border border-border" />
              <span className="text-muted-foreground">Closed/Filtered</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
