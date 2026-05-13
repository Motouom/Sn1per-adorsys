'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Vulnerability, Workspace } from '@/types';
import { calculateRiskScore, getRiskLevel } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  AreaChart,
} from 'recharts';
import {
  Shield,
  AlertTriangle,
  Server,
  Globe,
  Activity,
  TrendingUp,
  Clock,
  Target,
} from 'lucide-react';

interface DashboardOverviewProps {
  workspace: Workspace;
  vulnerabilities: Vulnerability[];
}

export function DashboardOverview({ workspace, vulnerabilities }: DashboardOverviewProps) {
  const score = calculateRiskScore(workspace.vulnerabilities);
  const riskLevel = getRiskLevel(score);

  const severityData = [
    { name: 'Critical', value: workspace.vulnerabilities.critical, color: '#ef4444' },
    { name: 'High', value: workspace.vulnerabilities.high, color: '#f97316' },
    { name: 'Medium', value: workspace.vulnerabilities.medium, color: '#eab308' },
    { name: 'Low', value: workspace.vulnerabilities.low, color: '#3b82f6' },
    { name: 'Info', value: workspace.vulnerabilities.info, color: '#6b7280' },
  ].filter(d => d.value > 0);

  const attackSurface = [
    { name: 'Ports', value: workspace.ports.length },
    { name: 'Domains', value: workspace.domains.length },
    { name: 'Hosts', value: workspace.hostnames.length },
    { name: 'IPs', value: workspace.ips.length },
  ];

  const topVulns = vulnerabilities
    .filter(v => ['critical', 'high', 'medium'].includes(v.severity))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{workspace.target}</h1>
          <p className="text-muted-foreground mt-1">
            Workspace: {workspace.name} • Mode: {workspace.scanMode}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={workspace.status === 'completed' ? 'success' : 'warning'} size="lg">
            {workspace.status}
          </Badge>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Last scan</p>
            <p className="text-sm font-medium">{formatTimestamp(workspace.updatedAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Risk Score"
          value={score}
          subtitle={riskLevel.level}
          icon={<Shield className="h-5 w-5" />}
          variant="critical"
        />
        <StatCard
          title="Vulnerabilities"
          value={workspace.vulnerabilities.total}
          subtitle={`${workspace.vulnerabilities.critical} critical`}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={workspace.vulnerabilities.critical > 0 ? 'critical' : 'high'}
        />
        <StatCard
          title="Open Ports"
          value={workspace.ports.filter(p => p.state === 'open').length}
          subtitle={`${workspace.ips.length} IP(s)`}
          icon={<Server className="h-5 w-5" />}
          variant="info"
        />
        <StatCard
          title="Attack Surface"
          value={workspace.domains.length + workspace.hostnames.length}
          subtitle={`${workspace.ips.length} IP(s)`}
          icon={<Globe className="h-5 w-5" />}
          variant="info"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-red-500" />
              <CardTitle>Vulnerability Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={severityData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-red-500" />
              <CardTitle>Severity Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {severityData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-red-500" />
              <CardTitle>Attack Surface Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attackSurface}>
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle>Top Findings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topVulns.map((vuln, index) => (
                <div
                  key={vuln.id || index}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <div
                    className={`h-2 w-2 rounded-full ${
                      vuln.severity === 'critical'
                        ? 'bg-red-500'
                        : vuln.severity === 'high'
                        ? 'bg-orange-500'
                        : 'bg-yellow-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{vuln.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{vuln.target}</p>
                  </div>
                  <Badge
                    variant={
                      vuln.severity === 'critical'
                        ? 'critical'
                        : vuln.severity === 'high'
                        ? 'high'
                        : 'medium'
                    }
                    size="sm"
                  >
                    {vuln.severity.toUpperCase()}
                  </Badge>
                </div>
              ))}
              {topVulns.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No critical or high severity vulnerabilities found.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-red-500" />
            <CardTitle>Risk Assessment</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Overall Risk</p>
              <p className={`text-2xl font-bold ${riskLevel.color}`}>{riskLevel.level}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Risk Score</p>
              <p className="text-2xl font-bold">{score}/100</p>
              <ProgressBar value={score} variant="critical" size="sm" className="mt-2" />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Exploitable</p>
              <p className="text-2xl font-bold text-red-500">
                {workspace.vulnerabilities.critical + workspace.vulnerabilities.high}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Remediation Priority</p>
              <p className="text-2xl font-bold text-orange-500">
                {workspace.vulnerabilities.critical > 0 ? 'Critical' : workspace.vulnerabilities.high > 0 ? 'High' : 'Medium'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
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
