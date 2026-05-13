import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-black',
    low: 'bg-blue-500 text-white',
    info: 'bg-gray-500 text-white',
  };
  return colors[severity.toLowerCase()] || colors.info;
}

export function getSeverityBgColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'bg-red-500/10 border-red-500/30',
    high: 'bg-orange-500/10 border-orange-500/30',
    medium: 'bg-yellow-500/10 border-yellow-500/30',
    low: 'bg-blue-500/10 border-blue-500/30',
    info: 'bg-gray-500/10 border-gray-500/30',
  };
  return colors[severity.toLowerCase()] || colors.info;
}

export function getSeverityBorderColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'border-red-500',
    high: 'border-orange-500',
    medium: 'border-yellow-500',
    low: 'border-blue-500',
    info: 'border-gray-500',
  };
  return colors[severity.toLowerCase()] || colors.info;
}

export function getPortStateColor(state: string): string {
  const colors: Record<string, string> = {
    open: 'text-green-500',
    closed: 'text-red-500',
    filtered: 'text-yellow-500',
  };
  return colors[state.toLowerCase()] || 'text-gray-500';
}

export function getServiceIcon(service: string): string {
  const icons: Record<string, string> = {
    ssh: '🔑',
    http: '🌐',
    https: '🔒',
    domain: '📡',
    ftp: '📁',
    smtp: '📧',
    mysql: '🗄️',
    postgresql: '🐘',
    mongodb: '🍃',
    redis: '🔴',
  };
  return icons[service.toLowerCase()] || '🔌';
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function parseVulnerabilityLine(line: string) {
  const match = line.match(/^(P\d+)\s+-\s+(\w+),\s+(.+?),\s+(.+?)(?:,\s+(.+))?$/);
  if (!match) return null;
  
  const [, priority, severity, title, target, details] = match;
  const severityMap: Record<string, string> = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    INFO: 'info',
  };
  
  return {
    priority,
    severity: severityMap[severity.toUpperCase()] || severity.toLowerCase(),
    title: title.trim(),
    target: target.trim(),
    details: details?.trim() || '',
  };
}

export function calculateRiskScore(vulns: { critical: number; high: number; medium: number; low: number; info: number }): number {
  return (vulns.critical * 10) + (vulns.high * 7) + (vulns.medium * 4) + (vulns.low * 2) + (vulns.info * 0.5);
}

export function getRiskLevel(score: number): { level: string; color: string } {
  if (score >= 80) return { level: 'Critical', color: 'text-red-500' };
  if (score >= 50) return { level: 'High', color: 'text-orange-500' };
  if (score >= 25) return { level: 'Medium', color: 'text-yellow-500' };
  if (score >= 10) return { level: 'Low', color: 'text-blue-500' };
  return { level: 'Info', color: 'text-gray-500' };
}
