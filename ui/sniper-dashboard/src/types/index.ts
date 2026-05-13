export interface Vulnerability {
  id: string;
  priority: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  target: string;
  details?: string;
  cve?: string;
  cvss?: number;
  reference?: string;
  description?: string;
  remediation?: string;
  tags?: string[];
  discoveredAt?: string;
}

export interface Port {
  number: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'closed' | 'filtered';
  service: string;
  banner?: string;
  version?: string;
  cpe?: string;
  scripts?: string[];
}

export interface Host {
  ip: string;
  hostname?: string;
  mac?: string;
  os?: string;
  ports: Port[];
  status: 'up' | 'down';
  lastSeen?: string;
}

export interface Technology {
  name: string;
  version?: string;
  category?: string;
  detected?: string[];
  confidence?: number;
  icon?: string;
  website?: string;
}

export interface HttpHeaders {
  name: string;
  value: string;
  secure?: boolean;
  warning?: string;
}

export interface DomainInfo {
  domain: string;
  registrar: string;
  registrationDate: string;
  expirationDate: string;
  lastChangeDate: string;
  nameservers: string[];
  status: string[];
  secureDNS: boolean;
  registrarEmail: string;
  registrarUrl: string;
  registrarPhone: string;
  dnssec?: boolean;
  whoisServer?: string;
  admin?: {
    name: string;
    email: string;
    phone: string;
    country: string;
  };
}

export interface SSLInfo {
  issuer: string;
  dnsNames: string[];
  tlsVersions: string[];
  validFrom?: string;
  validTo?: string;
  serialNumber?: string;
  signatureAlgorithm?: string;
  publicKeyAlgorithm?: string;
  keySize?: number;
  subject?: string;
  fingerprint?: {
    sha256?: string;
    sha1?: string;
  };
}

export interface DNSRecord {
  type: string;
  name: string;
  value: string;
  ttl?: number;
}

export interface EmailConfig {
  mxRecords: string[];
  spf: string;
  dmarc: string;
  dkim: string[];
}

export interface Workspace {
  name: string;
  target: string;
  createdAt: string;
  updatedAt: string;
  scanMode: string;
  status: 'completed' | 'running' | 'failed' | 'pending';
  score: number;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
  ips: string[];
  ports: Port[];
  domains: string[];
  hostnames: string[];
  hosts?: Host[];
  screenshotCount?: number;
  credentialCount?: number;
  noteCount?: number;
}

export interface WebInfo {
  title: string;
  technologies: Technology[];
  headers: HttpHeaders[];
  cookies: CookieInfo[];
  forms: FormInfo[];
  urls: string[];
  robots?: string[];
  sitemap?: string[];
  csp?: string;
  security?: SecurityHeaders;
}

export interface CookieInfo {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: string;
  expires?: string;
}

export interface FormInfo {
  action: string;
  method: string;
  inputs: FormInput[];
  hasFileUpload: boolean;
  hasPasswordField: boolean;
}

export interface FormInput {
  name: string;
  type: string;
  required: boolean;
}

export interface SecurityHeaders {
  strictTransportSecurity?: string;
  contentSecurityPolicy?: string;
  xFrameOptions?: string;
  xContentTypeOptions?: string;
  xXSSProtection?: string;
  referrerPolicy?: string;
  permissionsPolicy?: string;
}

export interface OSINTData {
  emails: string[];
  usernames: string[];
  socialProfiles: SocialProfile[];
  publicDocuments: string[];
  metadata: Record<string, string>;
  relatedDomains: string[];
  subdomains: string[];
}

export interface SocialProfile {
  platform: string;
  url: string;
  username: string;
  discovered: string;
}

export interface Credential {
  id: string;
  type: 'password' | 'api_key' | 'token' | 'certificate' | 'secret';
  service: string;
  username?: string;
  email?: string;
  password?: string;
  token?: string;
  url?: string;
  discoveredAt: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  verified: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  target?: string;
}

export interface Screenshot {
  id: string;
  url: string;
  title: string;
  capturedAt: string;
  port: number;
  protocol: 'http' | 'https';
  path: string;
}

export interface ScanData {
  workspace: Workspace;
  vulnerabilities: Vulnerability[];
  domainInfo: DomainInfo;
  sslInfo: SSLInfo;
  dnsRecords: DNSRecord[];
  emailConfig: EmailConfig;
  webInfo: WebInfo;
  osFingerprint: string;
  rawOutput: string;
  ip: string;
  hostname: string;
  osint?: OSINTData;
  credentials?: Credential[];
  notes?: Note[];
  screenshots?: Screenshot[];
  hosts?: Host[];
}

export interface ScanProgress {
  stage: string;
  progress: number;
  message: string;
  startTime: string;
  estimatedTime?: string;
}

export interface NetworkScanResult {
  target: string;
  scanType: 'discovery' | 'portscan' | 'fullportscan' | 'vulnscan';
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed';
  hosts: Host[];
  totalPorts: number;
  openPorts: number;
  vulnerabilities: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type SortDirection = 'asc' | 'desc';

export interface FilterOptions {
  severity: SeverityLevel[];
  search: string;
  sortBy: string;
  sortDirection: SortDirection;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  total: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  avatar?: string;
}

export interface Settings {
  theme: 'dark' | 'light';
  notifications: boolean;
  autoScan: boolean;
  scanMode: 'normal' | 'stealth' | 'aggressive';
  apiKeys: {
    shodan?: string;
    censys?: string;
    virustotal?: string;
  };
  slackWebhook?: string;
  emailAlerts?: string;
}

export interface Session {
  id: string;
  target: string;
  mode: 'webapp' | 'network';
  scanType?: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed';
  outputCount: number;
}
