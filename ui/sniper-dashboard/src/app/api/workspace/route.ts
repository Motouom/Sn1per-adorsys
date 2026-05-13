import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Vulnerability, Port, Technology, HttpHeaders, DomainInfo, SSLInfo, DNSRecord, EmailConfig, Workspace, OSINTData, Credential, Note, Screenshot, ScanData, SeverityLevel } from '@/types';

const LOOT_BASE_PATH = '/usr/share/sniper/loot/workspace';

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
    if (line.includes('Critical:')) {
      counts.critical = parseInt(line.split(':')[1].trim()) || 0;
    } else if (line.includes('High:')) {
      counts.high = parseInt(line.split(':')[1].trim()) || 0;
    } else if (line.includes('Medium:')) {
      counts.medium = parseInt(line.split(':')[1].trim()) || 0;
    } else if (line.includes('Low:')) {
      counts.low = parseInt(line.split(':')[1].trim()) || 0;
    } else if (line.includes('Info:')) {
      counts.info = parseInt(line.split(':')[1].trim()) || 0;
    } else if (line.includes('Score:')) {
      score = parseInt(line.split(':')[1].trim()) || 0;
    }

    const match = line.match(/^(P\d+)\s+-\s+(\w+),\s+(.+?),\s+(.+?)(?:,\s+(.+))?$/);
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

  const portRegex = /(\d+)\/(tcp|udp)\s+(open|closed|filtered)\s+(.+)/g;
  let match;
  while ((match = portRegex.exec(content)) !== null) {
    ports.push({
      number: parseInt(match[1]),
      protocol: match[2] as 'tcp' | 'udp',
      state: match[3] as 'open' | 'closed' | 'filtered',
      service: match[4].trim(),
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

function parseNucleiInfo(content: string): { technologies: Technology[], dnsRecords: DNSRecord[], sslInfo: Partial<SSLInfo>, domainInfo: Partial<DomainInfo>, emailConfig: Partial<EmailConfig> } {
  const technologies: Technology[] = [];
  const dnsRecords: DNSRecord[] = [];
  const sslInfo: Partial<SSLInfo> = { dnsNames: [], tlsVersions: [], issuer: '' };
  const domainInfo: Partial<DomainInfo> = { nameservers: [], status: [] };
  const emailConfig: Partial<EmailConfig> = { mxRecords: [], dkim: [], spf: '', dmarc: '' };

  const lines = content.split('\n');

  for (const line of lines) {
    if (line.includes('[tech-detect:')) {
      const match = line.match(/\[tech-detect:([^\]]+)\],\s+(.+)\s+\[/);
      if (match) {
        const techName = match[1];
        const existing = technologies.find(t => t.name.toLowerCase() === techName.toLowerCase());
        if (!existing) {
          technologies.push({
            name: techName.charAt(0).toUpperCase() + techName.slice(1),
            category: 'Web Technology',
            detected: [match[2].trim()],
          });
        }
      }
    }

    if (line.includes('[metatag-cms]')) {
      const match = line.match(/\[metatag-cms\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        const versionMatch = match[1].match(/(.+?)\s+(\d+\.\d+.*)/);
        if (versionMatch) {
          technologies.push({
            name: versionMatch[1].trim(),
            version: versionMatch[2],
            category: 'CMS',
            detected: [],
          });
        } else {
          technologies.push({
            name: match[1],
            category: 'CMS',
            detected: [],
          });
        }
      }
    }

    if (line.includes('[nameserver-fingerprint]')) {
      const match = line.match(/\[nameserver-fingerprint\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        domainInfo.nameservers = match[1].split(',').map(ns => ns.trim());
      }
    }

    if (line.includes('[mx-fingerprint]')) {
      const match = line.match(/\[mx-fingerprint\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        emailConfig.mxRecords = match[1].split(',').map(mx => mx.trim());
      }
    }

    if (line.includes('[spf-record-detect]')) {
      const match = line.match(/\[spf-record-detect\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        emailConfig.spf = match[1];
      }
    }

    if (line.includes('[dmarc-detect]')) {
      const match = line.match(/\[dmarc-detect\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        emailConfig.dmarc = match[1];
      }
    }

    if (line.includes('[dkim-record-detect]')) {
      const match = line.match(/\[dkim-record-detect\],\s+(.+?)\s+\[/);
      if (match && emailConfig.dkim) {
        emailConfig.dkim.push(match[1].trim());
      }
    }

    if (line.includes('[ssl-issuer]')) {
      const match = line.match(/\[ssl-issuer\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        sslInfo.issuer = match[1];
      }
    }

    if (line.includes('[ssl-dns-names]')) {
      const match = line.match(/\[ssl-dns-names\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        sslInfo.dnsNames = match[1].split(',').map(n => n.trim());
      }
    }

    if (line.includes('[tls-version]')) {
      const match = line.match(/\[tls-version\],\s+.+\s+\[([^\]]+)\]/);
      if (match && sslInfo.tlsVersions) {
        sslInfo.tlsVersions.push(match[1]);
      }
    }

    if (line.includes('[rdap-whois:expirationDate]')) {
      const match = line.match(/\[rdap-whois:expirationDate\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        domainInfo.expirationDate = match[1];
      }
    }

    if (line.includes('[rdap-whois:registrationDate]')) {
      const match = line.match(/\[rdap-whois:registrationDate\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        domainInfo.registrationDate = match[1];
      }
    }

    if (line.includes('[rdap-whois:registrarName]')) {
      const match = line.match(/\[rdap-whois:registrarName\],\s+.+\s+\[([^\]]+)\]/);
      if (match) {
        domainInfo.registrar = match[1];
      }
    }

    if (line.includes('[rdap-whois:status]')) {
      const match = line.match(/\[rdap-whois:status\],\s+.+\s+\[([^\]]+)\]/);
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
    await fs.access(osintDir);
    const files = await fs.readdir(osintDir);
    
    const emails: string[] = [];
    const usernames: string[] = [];
    const socialProfiles: { platform: string; url: string; username: string; discovered: string }[] = [];
    const publicDocuments: string[] = [];
    const metadata: Record<string, string> = {};
    const relatedDomains: string[] = [];
    const subdomains: string[] = [];

    for (const file of files) {
      const content = await readFileIfExists(path.join(osintDir, file));
      if (!content) continue;
      
      const emailMatches = content.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
      emails.push(...emailMatches);
      
      const urlMatches = content.match(/https?:\/\/[^\s]+/g) || [];
      publicDocuments.push(...urlMatches);
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
    const { technologies, dnsRecords, sslInfo, domainInfo, emailConfig } = parseNucleiInfo(nucleiCombined);

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
      lastChangeDate: '',
      nameservers: domainInfo.nameservers || [],
      status: domainInfo.status || [],
      secureDNS: true,
      registrarEmail: '',
      registrarUrl: '',
      registrarPhone: '',
    };

    const sslInfoComplete: SSLInfo = {
      issuer: sslInfo.issuer || '',
      dnsNames: sslInfo.dnsNames || [],
      tlsVersions: sslInfo.tlsVersions || [],
    };

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
      score: parsedVulns.score,
      vulnerabilities: {
        ...parsedVulns.counts,
        total: parsedVulns.vulns.length,
      },
      ips: ip ? [ip] : [],
      ports,
      domains: [workspace],
      hostnames,
      screenshotCount: screenshots.length,
      credentialCount: credentials.length,
      noteCount: notes.length,
    };

    const scanData: ScanData = {
      workspace: workspaceData,
      vulnerabilities: parsedVulns.vulns,
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
