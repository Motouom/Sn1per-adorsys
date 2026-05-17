import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Vulnerability, Port, Technology, HttpHeaders, DomainInfo, SSLInfo, DNSRecord, EmailConfig, Workspace, OSINTData, Credential, Note, Screenshot, ScanData, SeverityLevel, SocialProfile } from '@/types';

const LOOT_BASE_PATH = process.env.WORKSPACE_PATH || process.env.LOOT_PATH ? 
  path.join(process.env.LOOT_PATH || '/usr/share/sniper/loot', 'workspace') : 
  '/usr/share/sniper/loot/workspace';

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch {
    return null;
  }
}

function parseVulnerabilityReport(content: string): { vulns: Vulnerability[], counts: { critical: number, high: number, medium: number, low: number, info: number }, score: number } {
  const lines = content.split('\n');
  const vulns: Vulnerability[] = [];
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  let score = 0;

  for (const line of lines) {
    // Parse summary counts
    if (line.includes('Critical:') && line.match(/Critical:\s*\d+/)) {
      counts.critical = parseInt(line.split(':')[1].trim()) || 0;
    } else if (line.includes('High:') && line.match(/High:\s*\d+/)) {
      counts.high = parseInt(line.split(':')[1].trim()) || 0;
    } else if (line.includes('Medium:') && line.match(/Medium:\s*\d+/)) {
      counts.medium = parseInt(line.split(':')[1].trim()) || 0;
    } else if (line.includes('Low:') && line.match(/Low:\s*\d+/)) {
      counts.low = parseInt(line.split(':')[1].trim()) || 0;
    } else if (line.includes('Info:') && line.match(/Info:\s*\d+/)) {
      counts.info = parseInt(line.split(':')[1].trim()) || 0;
    } else if (line.includes('Score:') && line.match(/Score:\s*\d+/)) {
      score = parseInt(line.split(':')[1].trim()) || 0;
    }

    // Parse vulnerability lines: P3 - MEDIUM, Title, Target, Details
    const match = line.match(/^(P\d+)\s+-\s+(CRITICAL|HIGH|MEDIUM|LOW|INFO),\s+(.+?),\s+(.+?)(?:,\s*(.+))?$/);
    if (match) {
      const [, priority, severity, title, target, details] = match;
      const severityMap: Record<string, SeverityLevel> = {
        CRITICAL: 'critical',
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low',
        INFO: 'info',
      };
      
      const sev: SeverityLevel = severityMap[severity.toUpperCase()] || 'info';
      
      let cve = '';
      let cvss = 0;
      let reference = '';
      
      if (details) {
        const cveMatch = details.match(/(CVE-\d{4}-\d+)/);
        if (cveMatch) cve = cveMatch[1];
        
        const cvssMatch = details.match(/(\d+\.\d+)\s+https:/);
        if (cvssMatch) cvss = parseFloat(cvssMatch[1]);
        
        const refMatch = details.match(/(https:\/\/[^\s]+)/);
        if (refMatch) reference = refMatch[1];
      }

      vulns.push({
        id: `vuln-${vulns.length}`,
        priority,
        severity: sev,
        title: title.trim(),
        target: target.trim(),
        details: details?.trim() || '',
        cve,
        cvss,
        reference,
      });
    }
  }

  // If counts are all zero but we parsed vulns, count them
  if (counts.critical === 0 && counts.high === 0 && counts.medium === 0 && counts.low === 0 && counts.info === 0 && vulns.length > 0) {
    for (const vuln of vulns) {
      counts[vuln.severity]++;
    }
  }

  return { vulns, counts, score };
}

function parseNmapOutput(content: string): { ports: Port[], ip: string, hostname: string } {
  const ports: Port[] = [];
  let ip = '';
  let hostname = '';

  const ipMatch = content.match(/Nmap scan report for .+ \((\d+\.\d+\.\d+\.\d+)\)/);
  if (ipMatch) {
    ip = ipMatch[1];
  } else {
    const ipOnlyMatch = content.match(/Nmap scan report for (\d+\.\d+\.\d+\.\d+)/);
    if (ipOnlyMatch) ip = ipOnlyMatch[1];
  }

  const hostnameMatch = content.match(/rDNS record for .+: (.+)/);
  if (hostnameMatch) {
    hostname = hostnameMatch[1];
  }

  const portRegex = /(\d+)\/(tcp|udp)\s+(open|closed|filtered)\s+(\S+)\s*(.*)/g;
  let match;
  while ((match = portRegex.exec(content)) !== null) {
    const service = match[4].trim();
    const extra = match[5].trim();
    let banner = '';
    let version = '';
    
    if (extra) {
      const versionMatch = extra.match(/(\S+\/[\d.]+)/);
      if (versionMatch) version = versionMatch[1];
      banner = extra;
    }

    ports.push({
      number: parseInt(match[1]),
      protocol: match[2] as 'tcp' | 'udp',
      state: match[3] as 'open' | 'closed' | 'filtered',
      service,
      banner: banner || undefined,
      version: version || undefined,
    });
  }

  return { ports, ip, hostname };
}

function parseHeaders(content: string): HttpHeaders[] {
  const headers: HttpHeaders[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const name = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      if (name && value) {
        headers.push({ name, value });
      }
    }
  }

  return headers;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'Unknown';
  // Try to parse ISO format or common date formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString(); // Let the UI format it
  }
  
  // Try to extract date from strings like "2024-05-14T12:00:00Z" or "2024-05-14"
  const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];

  return dateStr;
}

function categorizeTech(name: string): string {
  const lower = name.toLowerCase();
  const categories: Record<string, string[]> = {
    'Web Server': ['nginx', 'apache', 'iis', 'lighttpd', 'caddy', 'tomcat', 'openresty', 'litespeed'],
    'CMS': ['wordpress', 'drupal', 'joomla', 'magento', 'shopify', 'ghost', 'craft', 'concrete5', 'typo3'],
    'Framework': ['react', 'vue', 'angular', 'next.js', 'nuxt', 'svelte', 'django', 'flask', 'rails', 'laravel', 'express', 'spring', 'gatsby', 'fastapi'],
    'JavaScript': ['jquery', 'bootstrap', 'tailwindcss', 'typescript', 'javascript', 'node.js', 'nodejs', 'underscore', 'lodash', 'moment'],
    'Cloud/CDN': ['cloudflare', 'aws', 'amazon', 'azure', 'google', 'firebase', 'vercel', 'netlify', 'heroku', 'digitalocean'],
    'Database': ['mysql', 'postgresql', 'mongodb', 'redis', 'mariadb', 'couchdb', 'elasticsearch', 'mssql', 'oracle'],
    'Container': ['docker', 'kubernetes', 'k8s'],
    'Language': ['php', 'python', 'ruby', 'java', 'go', 'rust', 'swift'],
    'DevOps': ['gitlab', 'github', 'jenkins', 'grafana', 'prometheus'],
    'Security': ['openssl', 'lets-encrypt', 'recaptcha'],
  };

  for (const [category, techs] of Object.entries(categories)) {
    if (techs.some(t => lower.includes(t) || t.includes(lower))) {
      return category;
    }
  }
  return 'Web Technology';
}

function parseWhatwebOutput(content: string): Technology[] {
  const techs: Technology[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const match = line.match(/^(?:https?:\/\/[^\s]+)\s+\[(.+?)\]/);
    if (match) {
      const components = match[1].split(',').map(c => c.trim());
      for (const comp of components) {
        const cleanComp = comp.replace(/^\d+%$/, '').trim();
        if (!cleanComp || cleanComp.length < 2) continue;
        
        const versionMatch = cleanComp.match(/^(.+?)\[([^\]]+)\]$/);
        if (versionMatch) {
          const name = versionMatch[1].trim();
          const version = versionMatch[2].trim();
          if (!techs.find(t => t.name.toLowerCase() === name.toLowerCase())) {
            techs.push({
              name: name.charAt(0).toUpperCase() + name.slice(1),
              version,
              category: categorizeTech(name),
              detected: [],
            });
          }
        } else {
          const name = cleanComp;
          if (!techs.find(t => t.name.toLowerCase() === name.toLowerCase())) {
            techs.push({
              name: name.charAt(0).toUpperCase() + name.slice(1),
              category: categorizeTech(name),
              detected: [],
            });
          }
        }
      }
    }
  }
  
  return techs;
}

function parseWappalyzerOutput(content: string): Technology[] {
  const techs: Technology[] = [];
  
  try {
    const data = JSON.parse(content);
    const technologies = data.technologies || data.technologies || [];
    for (const tech of technologies) {
      if (tech.name) {
        techs.push({
          name: tech.name,
          version: tech.version || undefined,
          category: tech.categories?.[0]?.name || categorizeTech(tech.name),
          confidence: tech.confidence,
          detected: [],
        });
      }
    }
  } catch {
    const lines = content.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 1) {
        const name = parts[0];
        const version = parts.length > 1 ? parts[1] : undefined;
        if (!techs.find(t => t.name.toLowerCase() === name.toLowerCase())) {
          techs.push({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            version,
            category: categorizeTech(name),
            detected: [],
          });
        }
      }
    }
  }
  
  return techs;
}

function detectTechnologiesFromHeaders(headers: HttpHeaders[]): Technology[] {
  const techs: Technology[] = [];
  
  for (const header of headers) {
    const lower = header.name.toLowerCase();
    const value = header.value;
    
    if (lower === 'server') {
      const serverMatch = value.match(/^([a-zA-Z]+)/);
      if (serverMatch) {
        const name = serverMatch[1];
        const versionMatch = value.match(/\/([0-9.]+)/);
        if (!techs.find(t => t.name.toLowerCase() === name.toLowerCase())) {
          techs.push({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            version: versionMatch?.[1] || undefined,
            category: 'Web Server',
            detected: [`Server header: ${value}`],
          });
        }
      }
    }
    
    if (lower === 'x-powered-by') {
      const poweredMatch = value.match(/^([a-zA-Z]+)/);
      if (poweredMatch) {
        const name = poweredMatch[1];
        const versionMatch = value.match(/\/([0-9.]+)/);
        if (!techs.find(t => t.name.toLowerCase() === name.toLowerCase())) {
          techs.push({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            version: versionMatch?.[1] || undefined,
            category: categorizeTech(name),
            detected: [`X-Powered-By header: ${value}`],
          });
        }
      }
    }
    
    if (lower === 'x-aspnet-version') {
      if (!techs.find(t => t.name.toLowerCase() === 'asp.net')) {
        techs.push({
          name: 'ASP.NET',
          version: value,
          category: 'Framework',
          detected: [`X-AspNet-Version header`],
        });
      }
    }

    if (lower === 'cf-ray' || lower === 'cf-cache-status') {
      if (!techs.find(t => t.name.toLowerCase() === 'cloudflare')) {
        techs.push({
          name: 'Cloudflare',
          category: 'Cloud/CDN',
          detected: [`CF-Ray header detected`],
        });
      }
    }
  }
  
  return techs;
}

function parseNucleiVulnerabilities(content: string): Vulnerability[] {
  const vulns: Vulnerability[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;

    const nucleiMatch = line.match(/^\[([^\]]+)\]\s+(https?:\/\/[^\s]+)\s+\[([^\]]+)\]/);
    if (nucleiMatch) {
      const [, templateId, targetUrl, extra] = nucleiMatch;
      
      if (templateId.startsWith('tech-detect') || templateId.startsWith('metatag-cms') || 
          templateId.startsWith('nameserver') || templateId.startsWith('mx-fingerprint') ||
          templateId.startsWith('spf-record') || templateId.startsWith('dmarc-detect') ||
          templateId.startsWith('dkim-record') || templateId.startsWith('ssl-') ||
          templateId.startsWith('tls-version') || templateId.startsWith('dns-detect') ||
          templateId.startsWith('rdap-whois')) {
        continue;
      }

      let severity: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'info';
      const severityMap: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
        critical: 'critical',
        high: 'high',
        medium: 'medium',
        low: 'low',
        info: 'info',
      };

      if (templateId.includes('-')) {
        const parts = templateId.split('-');
        const lastPart = parts[parts.length - 1].toLowerCase();
        if (severityMap[lastPart]) {
          severity = severityMap[lastPart];
        }
      }

      const titleMatch = templateId.match(/^(?:[^-]+-)+(.+)$/);
      const title = titleMatch ? titleMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : templateId;

      let cve = '';
      const cveMatch = line.match(/(CVE-\d{4}-\d+)/);
      if (cveMatch) cve = cveMatch[1];

      let cvss = 0;
      const cvssMatch = line.match(/cvss[:\s]*(\d+\.?\d*)/i) || extra.match(/(\d+\.?\d*)/);
      if (cvssMatch) cvss = parseFloat(cvssMatch[1]);

      const existing = vulns.find(v => v.title === title && v.target === targetUrl && v.severity === severity);
      if (!existing) {
        vulns.push({
          id: `vuln-nuclei-${vulns.length}`,
          priority: severity === 'critical' ? 'P1' : severity === 'high' ? 'P2' : severity === 'medium' ? 'P3' : severity === 'low' ? 'P4' : 'P5',
          severity,
          title,
          target: targetUrl,
          details: line.trim(),
          cve,
          cvss,
          reference: '',
        });
      }
      continue;
    }

    const simpleNucleiMatch = line.match(/^([a-zA-Z0-9_-]+)\s+(https?:\/\/[^\s]+)\s+\[([^\]]+)\]/);
    if (simpleNucleiMatch) {
      const [, templateId, targetUrl, extra] = simpleNucleiMatch;
      
      if (templateId.startsWith('tech-') || templateId.startsWith('meta') || 
          templateId.startsWith('ns') || templateId.startsWith('mx') ||
          templateId.startsWith('spf') || templateId.startsWith('dmarc') ||
          templateId.startsWith('dkim') || templateId.startsWith('ssl') ||
          templateId.startsWith('tls') || templateId.startsWith('dns') ||
          templateId.startsWith('rdap')) {
        continue;
      }

      let severity: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'info';
      const severityKeywords: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
        'critical': 'critical', 'rce': 'critical', 'remote code execution': 'critical',
        'high': 'high', 'xss': 'high', 'sql injection': 'high', 'sqli': 'high',
        'ssrf': 'high', 'authentication bypass': 'high', 'idor': 'high',
        'medium': 'medium', 'csrf': 'medium', 'lfi': 'medium', 'rfi': 'medium',
        'low': 'low', 'info': 'info', 'misconfiguration': 'low', 'disclosure': 'medium',
      };

      const lowerTemplate = templateId.toLowerCase();
      for (const [keyword, sev] of Object.entries(severityKeywords)) {
        if (lowerTemplate.includes(keyword)) {
          severity = sev;
          break;
        }
      }

      const title = templateId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      let cve = '';
      const cveMatch = line.match(/(CVE-\d{4}-\d+)/);
      if (cveMatch) cve = cveMatch[1];

      const existing = vulns.find(v => v.title === title && v.target === targetUrl);
      if (!existing) {
        vulns.push({
          id: `vuln-nuclei-${vulns.length}`,
          priority: severity === 'critical' ? 'P1' : severity === 'high' ? 'P2' : severity === 'medium' ? 'P3' : severity === 'low' ? 'P4' : 'P5',
          severity,
          title,
          target: targetUrl,
          details: line.trim(),
          cve,
          cvss: 0,
          reference: '',
        });
      }
    }
  }

  return vulns;
}

function parseNucleiInfo(content: string, workspaceName: string): { technologies: Technology[], dnsRecords: DNSRecord[], sslInfo: Partial<SSLInfo>, domainInfo: Partial<DomainInfo>, emailConfig: Partial<EmailConfig> } {
  const technologies: Technology[] = [];
  const dnsRecords: DNSRecord[] = [];
  const sslInfo: Partial<SSLInfo> = { dnsNames: [], tlsVersions: [], issuer: '' };
  const domainInfo: Partial<DomainInfo> = { nameservers: [], status: [] };
  const emailConfig: Partial<EmailConfig> = { mxRecords: [], dkim: [], spf: '', dmarc: '' };

  const lines = content.split('\n');

  for (const line of lines) {
    if (line.includes('[tech-detect')) {
      const match = line.match(/\[tech-detect(?::([^\]]+))?\]\s*(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[tech-detect(?::([^\]]+))?\]\s+(https?:\/\/[^\s]+)\s+\[([^\]]+)\]/) ||
                     line.match(/\[tech-detect(?::([^\]]+))?\],\s+(.+?)\s+\[([^\]]+)\]/);
      if (match) {
        const techName = match[1] || match[2];
        const techDetail = match[2] || match[3] || '';
        const existing = technologies.find(t => t.name.toLowerCase() === techName.toLowerCase());
        if (!existing) {
          technologies.push({
            name: techName.charAt(0).toUpperCase() + techName.slice(1),
            category: categorizeTech(techName),
            detected: [techDetail.trim()],
          });
        }
      }
    }

    if (line.includes('[metatag-cms]')) {
      const match = line.match(/\[metatag-cms\]\s+(https?:\/\/[^\s]+)\s+\[([^\]]+)\]/) ||
                     line.match(/\[metatag-cms\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        const cmsInfo = match[2] || match[1];
        const versionMatch = cmsInfo.match(/(.+?)\s+(\d+\.\d+.*)/);
        if (versionMatch) {
          technologies.push({
            name: versionMatch[1].trim(),
            version: versionMatch[2],
            category: 'CMS',
            detected: [],
          });
        } else {
          technologies.push({
            name: cmsInfo,
            category: 'CMS',
            detected: [],
          });
        }
      }
    }

    if (line.includes('[nameserver-fingerprint]')) {
      const match = line.match(/\[nameserver-fingerprint\]\s+(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[nameserver-fingerprint\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        domainInfo.nameservers = match[1].split(',').map(ns => ns.trim());
      }
    }

    if (line.includes('[mx-fingerprint]') || line.includes('[mx-detect]')) {
      const match = line.match(/\[(?:mx-fingerprint|mx-detect)\]\s+(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[mx-fingerprint\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        emailConfig.mxRecords = match[1].split(',').map(mx => mx.trim());
      }
    }

    if (line.includes('[spf-record-detect]') || line.includes('[spf-record]')) {
      const match = line.match(/\[spf-record(?:-detect)?\]\s+(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[spf-record-detect\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        emailConfig.spf = match[1];
      }
    }

    if (line.includes('[dmarc-detect]') || line.includes('[dmarc-record]')) {
      const match = line.match(/\[dmarc(?:-detect|-record)?\]\s+(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[dmarc-detect\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        emailConfig.dmarc = match[1];
      }
    }

    if (line.includes('[dkim-record-detect]') || line.includes('[dkim-record]')) {
      const match = line.match(/\[dkim-record(?:-detect)?\]\s+(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[dkim-record-detect\],\s+(.+?)\s+\[/);
      if (match && emailConfig.dkim) {
        emailConfig.dkim.push(match[1].trim());
      }
    }

    if (line.includes('[ssl-issuer]')) {
      const match = line.match(/\[ssl-issuer\]\s+(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[ssl-issuer\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        sslInfo.issuer = match[1];
      }
    }

    if (line.includes('[ssl-dns-names]')) {
      const match = line.match(/\[ssl-dns-names\]\s+(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[ssl-dns-names\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        sslInfo.dnsNames = match[1].split(',').map(n => n.trim());
      }
    }

    if (line.includes('[tls-version]')) {
      const match = line.match(/\[tls-version\]\s+(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[tls-version\],\s+.+\s+\[([^\]]+)\]/);
      if (match && sslInfo.tlsVersions) {
        sslInfo.tlsVersions.push(match[1]);
      }
    }

    if (line.includes('[rdap-whois:expirationDate]')) {
      const match = line.match(/\[rdap-whois:expirationDate\]\s+(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[rdap-whois:expirationDate\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        domainInfo.expirationDate = formatDate(match[1]);
      }
    }

    if (line.includes('[rdap-whois:registrationDate]')) {
      const match = line.match(/\[rdap-whois:registrationDate\]\s+(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[rdap-whois:registrationDate\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        domainInfo.registrationDate = formatDate(match[1]);
      }
    }

    if (line.includes('[dns-detect]')) {
      const match = line.match(/\[dns-detect\]\s+(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[dns-detect\],\s+(.+?)\s+\[([^\]]+)\]/);
      if (match) {
        if (match[2]) {
          dnsRecords.push({
            type: match[1].toUpperCase(),
            name: workspaceName,
            value: match[2].trim(),
          });
        } else {
          const dnsInfo = match[1];
          const typeMatch = dnsInfo.match(/^([A-Z]+)\s+(.+)/i);
          if (typeMatch) {
            dnsRecords.push({
              type: typeMatch[1].toUpperCase(),
              name: workspaceName,
              value: typeMatch[2].trim(),
            });
          }
        }
      }
    }

    if (line.includes('[ssl-subject]')) {
      const match = line.match(/\[ssl-subject\]\s+(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[ssl-subject\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        sslInfo.subject = match[1];
      }
    }

    if (line.includes('[ssl-valid-until]') || line.includes('[ssl-expiry]')) {
      const match = line.match(/\[ssl-(?:valid-until|expiry)\]\s+(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[ssl-valid-until\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        sslInfo.validTo = formatDate(match[1]);
      }
    }

    if (line.includes('[rdap-whois:registrarUrl]')) {
      const match = line.match(/\[rdap-whois:registrarUrl\]\s+(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[rdap-whois:registrarUrl\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        domainInfo.registrarUrl = match[1];
      }
    }

    if (line.includes('[rdap-whois:registrarEmail]')) {
      const match = line.match(/\[rdap-whois:registrarEmail\]\s+(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[rdap-whois:registrarEmail\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        domainInfo.registrarEmail = match[1];
      }
    }

    if (line.includes('[rdap-whois:status]')) {
      const match = line.match(/\[rdap-whois:status\]\s+(?:https?:\/\/[^\s]+)?\s*\[([^\]]+)\]/) ||
                     line.match(/\[rdap-whois:status\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        domainInfo.status = match[1].split(',').map(s => s.trim());
      }
    }
  }

  return { technologies, dnsRecords, sslInfo, domainInfo, emailConfig };
}

function parseURLs(content: string): string[] {
  return content.split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('http'));
}

async function parseOSINTData(workspacePath: string, workspace: string): Promise<OSINTData | undefined> {
  const osintDir = path.join(workspacePath, 'osint');
  try {
    const emails: string[] = [];
    const usernames: string[] = [];
    const socialProfiles: SocialProfile[] = [];
    const publicDocuments: string[] = [];
    const metadata: Record<string, string> = {};
    const relatedDomains: string[] = [];
    const subdomains: string[] = [];

    // Check if osint directory exists
    try {
      await fs.access(osintDir);
      const files = await fs.readdir(osintDir);
      
      for (const file of files) {
        const filePath = path.join(osintDir, file);
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) continue;

        const content = await readFileIfExists(filePath);
        if (!content) continue;
        
        // Extract emails
        const emailMatches = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        emails.push(...emailMatches);
        
        // Extract URLs/Documents
        const urlMatches = content.match(/https?:\/\/[^\s"'<>]+/g) || [];
        publicDocuments.push(...urlMatches);

        // Subdomains usually look like sub.domain.com
        const subdomainPattern = new RegExp(`(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+${workspace.replace('.', '\\.')}`, 'gi');
        const subMatches = content.match(subdomainPattern) || [];
        subdomains.push(...subMatches);
      }
    } catch (e) {
      // OSINT dir might not exist, that's okay
    }

    // Specific files often created by Sn1per
    const emailFiles = ['emails.txt', `emails-${workspace}.txt`, 'harvester-emails.txt'];
    for (const file of emailFiles) {
      const content = await readFileIfExists(path.join(osintDir, file));
      if (content) {
        const matches = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        emails.push(...matches);
      }
    }

    const subdomainFiles = ['subdomains.txt', `subdomains-${workspace}.txt`, 'theHarvester-subdomains.txt', 'amass-subdomains.txt'];
    for (const file of subdomainFiles) {
      const content = await readFileIfExists(path.join(osintDir, file)) || 
                      await readFileIfExists(path.join(workspacePath, file));
      if (content) {
        const lines = content.split('\n').map(l => l.trim()).filter(l => l && l.includes(workspace));
        subdomains.push(...lines);
      }
    }

    const waybackContent = await readFileIfExists(path.join(workspacePath, 'web', `waybackurls-${workspace}.txt`));
    if (waybackContent) {
      const urls = waybackContent.split('\n').filter(u => u.trim());
      publicDocuments.push(...urls);
    }

    const spiderContent = await readFileIfExists(path.join(workspacePath, 'web', `spider-${workspace}.txt`));
    if (spiderContent) {
      const urls = spiderContent.split('\n').filter(u => u.trim());
      publicDocuments.push(...urls);
    }

    return {
      emails: [...new Set(emails)],
      usernames: [...new Set(usernames)],
      socialProfiles,
      publicDocuments: [...new Set(publicDocuments)].slice(0, 100),
      metadata,
      relatedDomains: [...new Set(relatedDomains)],
      subdomains: [...new Set(subdomains)],
    };
  } catch {
    return undefined;
  }
}

async function parseCredentials(workspacePath: string): Promise<Credential[]> {
  const credentialsDir = path.join(workspacePath, 'credentials');
  const credentials: Credential[] = [];
  
  try {
    await fs.access(credentialsDir);
    const files = await fs.readdir(credentialsDir);
    
    for (const file of files) {
      const content = await readFileIfExists(path.join(credentialsDir, file));
      if (!content) continue;
      
      const lines = content.split('\n').filter(l => l.trim());
      lines.forEach((line, index) => {
        const parts = line.split(/[:\|]/);
        if (parts.length >= 2) {
          credentials.push({
            id: `cred-${credentials.length}`,
            type: 'password',
            service: file.replace(/\.txt$/, ''),
            username: parts[0].trim(),
            password: parts.slice(1).join(':').trim(),
            discoveredAt: new Date().toISOString(),
            severity: 'high',
            verified: false,
          });
        }
      });
    }
  } catch {
  }
  
  return credentials;
}

async function parseNotes(workspacePath: string): Promise<Note[]> {
  const notesDir = path.join(workspacePath, 'notes');
  const notes: Note[] = [];
  
  try {
    await fs.access(notesDir);
    const files = await fs.readdir(notesDir);
    
    for (const file of files) {
      const content = await readFileIfExists(path.join(notesDir, file));
      if (!content) continue;
      
      notes.push({
        id: `note-${notes.length}`,
        title: file.replace(/\.txt$/, ''),
        content: content,
        category: 'General',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
      });
    }
  } catch {
  }
  
  return notes;
}

async function parseScreenshots(workspacePath: string, workspace: string): Promise<Screenshot[]> {
  const screenshotsDir = path.join(workspacePath, 'screenshots');
  const screenshots: Screenshot[] = [];
  
  try {
    await fs.access(screenshotsDir);
    const files = await fs.readdir(screenshotsDir);
    
    for (const file of files) {
      const portMatch = file.match(/port(\d+)/);
      const protocolMatch = file.match(/(https?)/);
      
      screenshots.push({
        id: `screen-${screenshots.length}`,
        url: workspace,
        title: file,
        capturedAt: new Date().toISOString(),
        port: portMatch ? parseInt(portMatch[1]) : 443,
        protocol: (protocolMatch?.[1] as 'http' | 'https') || 'https',
        path: path.join(screenshotsDir, file),
      });
    }
  } catch {
  }
  
  return screenshots;
}

function parseSSLScanOutput(content: string): Partial<SSLInfo> {
  const result: Partial<SSLInfo> = { tlsVersions: [], dnsNames: [] };
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (line.includes('Issuer:')) {
      const match = line.match(/Issuer:\s*(.+)/);
      if (match) result.issuer = match[1].trim();
    }
    if (line.includes('Subject:')) {
      const match = line.match(/Subject:\s*(.+)/);
      if (match) result.subject = match[1].trim();
    }
    if (line.includes('Not After:') || line.includes('Valid Until:') || line.includes('notAfter=')) {
      const match = line.match(/(?:Not After|Valid Until|notAfter)=?\s*(.+)/);
      if (match) result.validTo = formatDate(match[1].trim());
    }
    if (line.match(/TLS\s*[\d.]+|SSLv[\d]+|TLSv[\d.]+/i)) {
      const match = line.match(/(TLS[\d.]+|TLSv[\d.]+|SSLv[\d]+|TLS\s*[\d.]+)/i);
      if (match && result.tlsVersions) {
        const version = match[1].trim();
        if (!result.tlsVersions.includes(version)) {
          result.tlsVersions.push(version);
        }
      }
    }
  }
  
  return result;
}

function parseSSLyzeOutput(content: string): Partial<SSLInfo> {
  const result: Partial<SSLInfo> = { tlsVersions: [], dnsNames: [] };
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (line.includes('Issuer:')) {
      const match = line.match(/Issuer:\s*(.+)/);
      if (match) result.issuer = match[1].trim();
    }
    if (line.includes('Not After:') || line.includes('Valid Until:')) {
      const match = line.match(/(?:Not After|Valid Until):\s*(.+)/);
      if (match) result.validTo = formatDate(match[1].trim());
    }
    if (line.match(/TLS\s*[\d.]+|SSLv[\d]+|TLSv[\d.]+/i)) {
      const match = line.match(/(TLS[\d.]+|TLSv[\d.]+|SSLv[\d]+|TLS\s*[\d.]+)/i);
      if (match && result.tlsVersions) {
        const version = match[1].trim();
        if (!result.tlsVersions.includes(version)) {
          result.tlsVersions.push(version);
        }
      }
    }
  }
  
  return result;
}

function parseSSLFromNmap(nmapOutput: string): Partial<SSLInfo> {
  const result: Partial<SSLInfo> = { tlsVersions: [], dnsNames: [] };
  const lines = nmapOutput.split('\n');
  
  for (const line of lines) {
    if (line.includes('ssl-issuer:') || line.includes('SSL Issuer:')) {
      const match = line.match(/(?:ssl-issuer|SSL Issuer):\s*(.+)/);
      if (match) result.issuer = match[1].trim();
    }
    if (line.includes('ssl-subject:') || line.includes('SSL Subject:')) {
      const match = line.match(/(?:ssl-subject|SSL Subject):\s*(.+)/);
      if (match) result.subject = match[1].trim();
    }
    if (line.match(/TLS[\d.]+|TLSv[\d.]+|SSLv[\d]+/)) {
      const match = line.match(/(TLS[\d.]+|TLSv[\d.]+|SSLv[\d]+)/);
      if (match && result.tlsVersions) {
        const version = match[1].trim();
        if (!result.tlsVersions.includes(version)) {
          result.tlsVersions.push(version);
        }
      }
    }
  }
  
  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspace = searchParams.get('workspace');

  if (!workspace) {
    const workspacesDir = path.join(LOOT_BASE_PATH);
    try {
      const dirs = await fs.readdir(workspacesDir);
      return NextResponse.json({ workspaces: dirs });
    } catch {
      return NextResponse.json({ workspaces: [] });
    }
  }

  const workspacePath = path.join(LOOT_BASE_PATH, workspace);

  try {
    const vulnReport = await readFileIfExists(path.join(workspacePath, 'vulnerabilities/vulnerability-report-.txt')) ||
                       await readFileIfExists(path.join(workspacePath, `vulnerabilities/vulnerability-report-${workspace}.txt`));
    
    const sortedVulns = await readFileIfExists(path.join(workspacePath, 'vulnerabilities/sc0pe-all-vulnerabilities-sorted.txt'));
    
    let parsedVulns = { vulns: [] as Vulnerability[], counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, score: 0 };
    
    if (vulnReport) {
      parsedVulns = parseVulnerabilityReport(vulnReport);
    } else if (sortedVulns) {
      parsedVulns = parseVulnerabilityReport(sortedVulns);
    }

    const nmapOutput = await readFileIfExists(path.join(workspacePath, `nmap/nmap-${workspace}.txt`));
    const { ports, ip, hostname } = nmapOutput ? parseNmapOutput(nmapOutput) : { ports: [], ip: '', hostname: '' };

    const osFingerprint = await readFileIfExists(path.join(workspacePath, `nmap/osfingerprint-${workspace}.txt`)) || '';

    const httpsHeaders = await readFileIfExists(path.join(workspacePath, `web/headers-https-${workspace}-443.txt`));
    const httpHeaders = await readFileIfExists(path.join(workspacePath, `web/headers-http-${workspace}-80.txt`));
    const headers = [
      ...(httpsHeaders ? parseHeaders(httpsHeaders) : []),
      ...(httpHeaders ? parseHeaders(httpHeaders) : []),
    ];

    const nucleiHttps = await readFileIfExists(path.join(workspacePath, `web/nuclei-https-${workspace}-port443.txt`));
    const nucleiHttp = await readFileIfExists(path.join(workspacePath, `web/nuclei-http-${workspace}-port80.txt`));
    const nucleiCombined = [nucleiHttps, nucleiHttp].filter(Boolean).join('\n');
    const { technologies, dnsRecords, sslInfo, domainInfo, emailConfig } = parseNucleiInfo(nucleiCombined, workspace);

    const whatwebOutput = await readFileIfExists(path.join(workspacePath, `web/whatweb-${workspace}.txt`));
    if (whatwebOutput) {
      const whatwebTechs = parseWhatwebOutput(whatwebOutput);
      for (const wt of whatwebTechs) {
        if (!technologies.find(t => t.name.toLowerCase() === wt.name.toLowerCase())) {
          technologies.push(wt);
        }
      }
    }

    const wappalyzerOutput = await readFileIfExists(path.join(workspacePath, `web/wappalyzer-${workspace}.txt`));
    if (wappalyzerOutput) {
      const wappTechs = parseWappalyzerOutput(wappalyzerOutput);
      for (const wt of wappTechs) {
        if (!technologies.find(t => t.name.toLowerCase() === wt.name.toLowerCase())) {
          technologies.push(wt);
        }
      }
    }

    const headersTechs = detectTechnologiesFromHeaders(headers);
    for (const ht of headersTechs) {
      if (!technologies.find(t => t.name.toLowerCase() === ht.name.toLowerCase())) {
        technologies.push(ht);
      }
    }
    
    const nucleiVulns = nucleiCombined ? parseNucleiVulnerabilities(nucleiCombined) : [];
    
    const mergedVulns = [...parsedVulns.vulns];
    const existingVulnKeys = new Set(mergedVulns.map(v => `${v.title}-${v.target}`));
    for (const nv of nucleiVulns) {
      const key = `${nv.title}-${nv.target}`;
      if (!existingVulnKeys.has(key)) {
        mergedVulns.push(nv);
        existingVulnKeys.add(key);
      }
    }
    
    const mergedCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const v of mergedVulns) {
      mergedCounts[v.severity]++;
    }
    const mergedScore = mergedCounts.critical * 10 + mergedCounts.high * 7 + mergedCounts.medium * 4 + mergedCounts.low * 2 + mergedCounts.info * 0.5;

    const urls = await readFileIfExists(path.join(workspacePath, `web/${workspace}_443-urls-sorted.txt`)) ||
                 await readFileIfExists(path.join(workspacePath, `web/${workspace}_80-urls-sorted.txt`)) || '';
    const urlList = parseURLs(urls);

    const title = await readFileIfExists(path.join(workspacePath, `web/title-https-${workspace}-443.txt`)) || '';

    const webhosts = await readFileIfExists(path.join(workspacePath, 'web/webhosts-sorted.txt')) || '';
    const hostnames = webhosts.split('\n').filter(h => h.trim());

    const domainInfoComplete: DomainInfo = {
      domain: workspace,
      registrar: domainInfo.registrar || 'Unknown',
      registrationDate: domainInfo.registrationDate || '',
      expirationDate: domainInfo.expirationDate || '',
      lastChangeDate: domainInfo.lastChangeDate || '',
      nameservers: domainInfo.nameservers || [],
      status: domainInfo.status || [],
      secureDNS: domainInfo.secureDNS !== undefined ? domainInfo.secureDNS : true,
      registrarEmail: domainInfo.registrarEmail || '',
      registrarUrl: domainInfo.registrarUrl || '',
      registrarPhone: domainInfo.registrarPhone || '',
    };

    const sslInfoComplete: SSLInfo = {
      issuer: sslInfo.issuer || '',
      dnsNames: sslInfo.dnsNames || [],
      tlsVersions: sslInfo.tlsVersions || [],
      subject: sslInfo.subject || '',
      validTo: sslInfo.validTo || '',
    };

    const sslscanOutput = await readFileIfExists(path.join(workspacePath, `ssl/sslscan-${workspace}.txt`)) ||
                          await readFileIfExists(path.join(workspacePath, `web/sslscan-${workspace}.txt`));
    if (sslscanOutput) {
      const sslscanData = parseSSLScanOutput(sslscanOutput);
      if (sslscanData.issuer && !sslInfoComplete.issuer) sslInfoComplete.issuer = sslscanData.issuer;
      if (sslscanData.subject && !sslInfoComplete.subject) sslInfoComplete.subject = sslscanData.subject;
      if (sslscanData.validTo && !sslInfoComplete.validTo) sslInfoComplete.validTo = sslscanData.validTo;
      if (sslscanData.tlsVersions && sslscanData.tlsVersions.length > 0 && sslInfoComplete.tlsVersions.length === 0) sslInfoComplete.tlsVersions = sslscanData.tlsVersions;
    }

    const sslyzeOutput = await readFileIfExists(path.join(workspacePath, `ssl/sslyze-${workspace}.txt`)) ||
                         await readFileIfExists(path.join(workspacePath, `web/sslyze-${workspace}.txt`));
    if (sslyzeOutput) {
      const sslyzeData = parseSSLyzeOutput(sslyzeOutput);
      if (sslyzeData.issuer && !sslInfoComplete.issuer) sslInfoComplete.issuer = sslyzeData.issuer;
      if (sslyzeData.tlsVersions && sslyzeData.tlsVersions.length > 0 && sslInfoComplete.tlsVersions.length === 0) sslInfoComplete.tlsVersions = sslyzeData.tlsVersions;
      if (sslyzeData.validTo && !sslInfoComplete.validTo) sslInfoComplete.validTo = sslyzeData.validTo;
    }

    if (nmapOutput && !sslInfoComplete.issuer) {
      const nmapSSL = parseSSLFromNmap(nmapOutput);
      if (nmapSSL.issuer && !sslInfoComplete.issuer) sslInfoComplete.issuer = nmapSSL.issuer;
      if (nmapSSL.tlsVersions && nmapSSL.tlsVersions.length > 0 && sslInfoComplete.tlsVersions.length === 0) sslInfoComplete.tlsVersions = nmapSSL.tlsVersions;
    }

    const emailConfigComplete: EmailConfig = {
      mxRecords: emailConfig.mxRecords || [],
      spf: emailConfig.spf || '',
      dmarc: emailConfig.dmarc || '',
      dkim: emailConfig.dkim || [],
    };

    const osintData = await parseOSINTData(workspacePath, workspace);
    const credentials = await parseCredentials(workspacePath);
    const notes = await parseNotes(workspacePath);
    const screenshots = await parseScreenshots(workspacePath, workspace);

    const workspaceData: Workspace = {
      name: workspace,
      target: workspace,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scanMode: 'normal',
      status: 'completed',
      score: mergedScore,
      vulnerabilities: {
        ...mergedCounts,
        total: mergedCounts.critical + mergedCounts.high + mergedCounts.medium + mergedCounts.low + mergedCounts.info,
      },
      ips: ip ? [ip] : [],
      ports,
      domains: [workspace],
      hostnames,
      screenshotCount: screenshots.length,
      credentialCount: credentials.length,
      noteCount: notes.length,
      urlCount: urlList.length,
      subdomainCount: osintData?.subdomains.length || 0,
      emailCount: osintData?.emails.length || 0,
    };

    const scanData: ScanData = {
      workspace: workspaceData,
      vulnerabilities: mergedVulns,
      domainInfo: domainInfoComplete,
      sslInfo: sslInfoComplete,
      dnsRecords,
      emailConfig: emailConfigComplete,
      webInfo: {
        title: title.trim(),
        technologies,
        headers,
        cookies: [],
        forms: [],
        urls: urlList,
      },
      osFingerprint: osFingerprint.trim(),
      rawOutput: nmapOutput || '',
      ip,
      hostname,
      osint: osintData,
      credentials,
      notes,
      screenshots,
    };

    return NextResponse.json(scanData);
  } catch (error) {
    console.error('Error reading workspace:', error);
    return NextResponse.json({ error: 'Failed to read workspace' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace');

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
    }

    const workspacePath = path.join(LOOT_BASE_PATH, workspace);
    
    // Check if workspace exists
    try {
      await fs.access(workspacePath);
    } catch {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Delete workspace directory recursively
    await fs.rm(workspacePath, { recursive: true, force: true });
    
    console.log(`[WORKSPACE API] Deleted workspace: ${workspace}`);
    
    return NextResponse.json({ message: `Workspace ${workspace} deleted successfully` });
  } catch (error) {
    console.error('[WORKSPACE API] Error deleting workspace:', error);
    return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 });
  }
}
