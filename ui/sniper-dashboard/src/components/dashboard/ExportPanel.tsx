'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Vulnerability, Workspace } from '@/types';
import { cn } from '@/lib/utils';
import {
  Download,
  FileText,
  FileJson,
  FileSpreadsheet,
  FileCode,
  Copy,
  CheckCircle,
  Loader2,
  X,
} from 'lucide-react';

interface ExportPanelProps {
  workspace: Workspace;
  vulnerabilities: Vulnerability[];
  onClose?: () => void;
}

type ExportFormat = 'json' | 'csv' | 'html' | 'markdown' | 'pdf';

export function ExportPanel({ workspace, vulnerabilities, onClose }: ExportPanelProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const formats: { id: ExportFormat; label: string; icon: typeof FileText; description: string }[] = [
    {
      id: 'json',
      label: 'JSON',
      icon: FileJson,
      description: 'Structured data format for APIs and tools',
    },
    {
      id: 'csv',
      label: 'CSV',
      icon: FileSpreadsheet,
      description: 'Spreadsheet-compatible format',
    },
    {
      id: 'html',
      label: 'HTML',
      icon: FileCode,
      description: 'Interactive web report',
    },
    {
      id: 'markdown',
      label: 'Markdown',
      icon: FileText,
      description: 'Documentation-friendly format',
    },
    {
      id: 'pdf',
      label: 'PDF',
      icon: FileText,
      description: 'Print-ready report',
    },
  ];

  const generateJSON = () => {
    const data = {
      workspace: {
        name: workspace.name,
        target: workspace.target,
        scanDate: workspace.updatedAt,
        status: workspace.status,
        score: workspace.score,
      },
      summary: {
        vulnerabilities: workspace.vulnerabilities,
        ports: workspace.ports.length,
        domains: workspace.domains.length,
        hostnames: workspace.hostnames.length,
      },
      vulnerabilities: vulnerabilities.map((v) => ({
        id: v.id,
        priority: v.priority,
        severity: v.severity,
        title: v.title,
        target: v.target,
        cve: v.cve,
        cvss: v.cvss,
        reference: v.reference,
      })),
      ports: workspace.ports,
      generatedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  };

  const generateCSV = () => {
    const headers = ['Priority', 'Severity', 'Title', 'Target', 'CVE', 'CVSS', 'Reference'];
    const rows = vulnerabilities.map((v) => [
      v.priority,
      v.severity,
      `"${v.title.replace(/"/g, '""')}"`,
      v.target,
      v.cve || '',
      v.cvss?.toString() || '',
      v.reference || '',
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  const generateHTML = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sn1per Report - ${workspace.target}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .header { border-bottom: 2px solid #dc2626; padding-bottom: 1rem; margin-bottom: 2rem; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; }
    .critical { color: #dc2626; }
    .high { color: #ea580c; }
    .medium { color: #ca8a04; }
    .low { color: #2563eb; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #eee; }
    th { background: #f5f5f5; }
    tr:hover { background: #fafafa; }
    .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .badge-critical { background: #fee2e2; color: #dc2626; }
    .badge-high { background: #ffedd5; color: #ea580c; }
    .badge-medium { background: #fef9c3; color: #ca8a04; }
    .badge-low { background: #dbeafe; color: #2563eb; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Sn1per Security Report</h1>
    <p><strong>Target:</strong> ${workspace.target}</p>
    <p><strong>Scan Date:</strong> ${workspace.updatedAt}</p>
    <p><strong>Risk Score:</strong> ${workspace.score}</p>
  </div>
  
  <div class="summary">
    <div class="card">
      <h3>Critical</h3>
      <p class="critical" style="font-size: 2rem; font-weight: bold;">${workspace.vulnerabilities.critical}</p>
    </div>
    <div class="card">
      <h3>High</h3>
      <p class="high" style="font-size: 2rem; font-weight: bold;">${workspace.vulnerabilities.high}</p>
    </div>
    <div class="card">
      <h3>Medium</h3>
      <p class="medium" style="font-size: 2rem; font-weight: bold;">${workspace.vulnerabilities.medium}</p>
    </div>
    <div class="card">
      <h3>Low</h3>
      <p class="low" style="font-size: 2rem; font-weight: bold;">${workspace.vulnerabilities.low}</p>
    </div>
  </div>
  
  <h2>Vulnerabilities</h2>
  <table>
    <thead>
      <tr>
        <th>Severity</th>
        <th>Title</th>
        <th>Target</th>
        <th>CVE</th>
        <th>CVSS</th>
      </tr>
    </thead>
    <tbody>
      ${vulnerabilities
        .map(
          (v) => `
        <tr>
          <td><span class="badge badge-${v.severity}">${v.severity.toUpperCase()}</span></td>
          <td>${v.title}</td>
          <td>${v.target}</td>
          <td>${v.cve || '-'}</td>
          <td>${v.cvss || '-'}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
  
  <h2>Open Ports</h2>
  <table>
    <thead>
      <tr><th>Port</th><th>Protocol</th><th>State</th><th>Service</th></tr>
    </thead>
    <tbody>
      ${workspace.ports
        .map(
          (p) => `
        <tr>
          <td>${p.number}</td>
          <td>${p.protocol.toUpperCase()}</td>
          <td>${p.state}</td>
          <td>${p.service}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
  
  <footer style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #eee; text-align: center; color: #666;">
    Generated by Sn1per Security Scanner on ${new Date().toISOString()}
  </footer>
</body>
</html>`;
  };

  const generateMarkdown = () => {
    return `# Sn1per Security Report

## Target: ${workspace.target}

**Scan Date:** ${workspace.updatedAt}  
**Status:** ${workspace.status}  
**Risk Score:** ${workspace.score}

## Vulnerability Summary

| Severity | Count |
|----------|-------|
| Critical | ${workspace.vulnerabilities.critical} |
| High | ${workspace.vulnerabilities.high} |
| Medium | ${workspace.vulnerabilities.medium} |
| Low | ${workspace.vulnerabilities.low} |
| Info | ${workspace.vulnerabilities.info} |

## Vulnerabilities

| Priority | Severity | Title | Target | CVE | CVSS |
|----------|----------|-------|--------|-----|------|
${vulnerabilities
  .map((v) => `| ${v.priority} | ${v.severity} | ${v.title} | ${v.target} | ${v.cve || '-'} | ${v.cvss || '-'} |`)
  .join('\n')}

## Open Ports

| Port | Protocol | State | Service |
|------|----------|-------|---------|
${workspace.ports
  .map((p) => `| ${p.number} | ${p.protocol.toUpperCase()} | ${p.state} | ${p.service} |`)
  .join('\n')}

---
*Generated by Sn1per Security Scanner on ${new Date().toISOString()}*
`;
  };

  const handleExport = async () => {
    setExporting(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    let content: string;
    let mimeType: string;
    let extension: string;

    switch (selectedFormat) {
      case 'json':
        content = generateJSON();
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'csv':
        content = generateCSV();
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'html':
        content = generateHTML();
        mimeType = 'text/html';
        extension = 'html';
        break;
      case 'markdown':
        content = generateMarkdown();
        mimeType = 'text/markdown';
        extension = 'md';
        break;
      case 'pdf':
        content = generateHTML();
        mimeType = 'text/html';
        extension = 'html';
        break;
      default:
        content = generateJSON();
        mimeType = 'application/json';
        extension = 'json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sniper-report-${workspace.target}-${new Date().toISOString().split('T')[0]}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExporting(false);
  };

  const handleCopy = async () => {
    let content: string;
    switch (selectedFormat) {
      case 'json':
        content = generateJSON();
        break;
      case 'csv':
        content = generateCSV();
        break;
      case 'markdown':
        content = generateMarkdown();
        break;
      default:
        content = generateJSON();
    }

    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-red-500" />
            <CardTitle>Export Report</CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {formats.map((format) => (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all',
                  selectedFormat === format.id
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                <format.icon
                  className={cn(
                    'h-6 w-6',
                    selectedFormat === format.id ? 'text-red-500' : 'text-muted-foreground'
                  )}
                />
                <span
                  className={cn(
                    'font-medium',
                    selectedFormat === format.id ? 'text-red-500' : ''
                  )}
                >
                  {format.label}
                </span>
                <span className="text-xs text-muted-foreground text-center">
                  {format.description}
                </span>
              </button>
            ))}
          </div>

          <div className="p-4 rounded-lg bg-muted/30 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Preview</span>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <pre className="text-xs text-muted-foreground overflow-auto max-h-32 p-3 bg-background rounded border border-border">
              {selectedFormat === 'json' && generateJSON().slice(0, 500) + '...'}
              {selectedFormat === 'csv' && generateCSV().slice(0, 500) + '...'}
              {selectedFormat === 'html' && '<!DOCTYPE html>...'}
              {selectedFormat === 'markdown' && generateMarkdown().slice(0, 500) + '...'}
              {selectedFormat === 'pdf' && 'PDF will be generated from HTML format'}
            </pre>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <p>
                Exporting <strong>{vulnerabilities.length}</strong> vulnerabilities from{' '}
                <strong>{workspace.target}</strong>
              </p>
            </div>
            <Button variant="primary" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download {selectedFormat.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
