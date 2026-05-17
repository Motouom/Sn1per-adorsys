'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DomainInfo, SSLInfo, DNSRecord, EmailConfig } from '@/types';
import { Lock, Shield, Key, Server, Mail, ShieldCheck } from 'lucide-react';

interface SSLPanelProps {
  sslInfo?: SSLInfo;
  domainInfo?: DomainInfo;
}

export function SSLPanel({ sslInfo, domainInfo }: SSLPanelProps) {
  const hasSSLData = sslInfo && (sslInfo.issuer || sslInfo.subject || (sslInfo.tlsVersions && sslInfo.tlsVersions.length > 0) || (sslInfo.dnsNames && sslInfo.dnsNames.length > 0) || sslInfo.validTo);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-green-500" />
            <CardTitle>SSL/TLS Certificate</CardTitle>
          </div>
          <Badge variant={hasSSLData ? 'success' : 'warning'}>{hasSSLData ? 'Data Available' : 'No Data'}</Badge>
        </CardHeader>
        <CardContent>
          {hasSSLData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Certificate Details</h4>
                <div className="space-y-3">
                  {sslInfo.issuer && (
                    <div className="flex items-start gap-3">
                      <Key className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Issuer</p>
                        <p className="font-medium">{sslInfo.issuer}</p>
                      </div>
                    </div>
                  )}
                  {sslInfo.subject && (
                    <div className="flex items-start gap-3">
                      <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Subject</p>
                        <p className="font-medium text-xs break-all">{sslInfo.subject}</p>
                      </div>
                    </div>
                  )}
                  {sslInfo.validTo && (
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Valid Until</p>
                        <p className="font-medium">{formatDate(sslInfo.validTo)}</p>
                      </div>
                    </div>
                  )}
                  {sslInfo.tlsVersions && sslInfo.tlsVersions.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">TLS Versions</p>
                        <div className="flex gap-2 mt-1">
                          {sslInfo.tlsVersions.map((v, i) => (
                            <Badge key={i} variant="success">{v.toUpperCase()}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Subject Alternative Names</h4>
                {sslInfo.dnsNames && sslInfo.dnsNames.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {sslInfo.dnsNames.map((name, i) => (
                      <Badge key={i} variant="default">{name}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No SAN data available</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No SSL/TLS certificate data available</p>
              <p className="text-xs text-muted-foreground mt-1">Run a scan with SSL analysis to see certificate details</p>
            </div>
          )}
        </CardContent>
      </Card>

      {domainInfo && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-red-500" />
              <CardTitle>Domain Information</CardTitle>
            </div>
            <Badge variant="info">{domainInfo.domain}</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Registrar</p>
                  <p className="font-medium">{domainInfo.registrar || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registration Date</p>
                  <p className="font-medium">{domainInfo.registrationDate ? formatDate(domainInfo.registrationDate) : 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expiration Date</p>
                  <p className="font-medium">{domainInfo.expirationDate ? formatDate(domainInfo.expirationDate) : 'Unknown'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{domainInfo.lastChangeDate ? formatDate(domainInfo.lastChangeDate) : 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Secure DNS</p>
                  <Badge variant={domainInfo.secureDNS ? 'success' : 'warning'}>
                    {domainInfo.secureDNS ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Registrar URL</p>
                  {domainInfo.registrarUrl ? (
                    <a href={domainInfo.registrarUrl} className="text-blue-500 hover:underline text-sm">
                      {domainInfo.registrarUrl}
                    </a>
                  ) : (
                    <p className="font-medium text-sm">Unknown</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registrar Email</p>
                  <p className="font-medium text-sm">{domainInfo.registrarEmail || 'Unknown'}</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-2">Nameservers</p>
              {domainInfo.nameservers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {domainInfo.nameservers.map((ns, i) => (
                    <Badge key={i} variant="default">{ns}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No nameserver data available</p>
              )}
            </div>

            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Status</p>
              {domainInfo.status.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {domainInfo.status.map((s, i) => (
                    <Badge key={i} variant="info">{s}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No status data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface DNSPanelProps {
  records: DNSRecord[];
  emailConfig?: EmailConfig;
}

export function DNSPanel({ records, emailConfig }: DNSPanelProps) {
  const groupedRecords = records.reduce((acc, record) => {
    if (!acc[record.type]) acc[record.type] = [];
    acc[record.type].push(record);
    return acc;
  }, {} as Record<string, DNSRecord[]>);

  const hasRecords = records.length > 0;
  const hasEmailConfig = emailConfig && (emailConfig.spf || emailConfig.dmarc || (emailConfig.mxRecords && emailConfig.mxRecords.length > 0) || (emailConfig.dkim && emailConfig.dkim.length > 0));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-red-500" />
            <CardTitle>DNS Records</CardTitle>
          </div>
          <Badge variant={hasRecords ? 'info' : 'warning'}>{hasRecords ? `${records.length} records` : 'No Data'}</Badge>
        </CardHeader>
        <CardContent>
          {hasRecords ? (
            <div className="space-y-6">
              {Object.entries(groupedRecords).map(([type, recs]) => (
                <div key={type}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-muted text-foreground">{type}</span>
                    <span className="text-xs">({recs.length} records)</span>
                  </h4>
                  <div className="space-y-2">
                    {recs.map((record, i) => (
                      <div key={`${record.name}-${i}`} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 font-mono text-sm">
                        <span className="text-muted-foreground min-w-[100px] truncate">{record.name}</span>
                        <span className="text-red-500">→</span>
                        <span className="text-foreground truncate flex-1">{record.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Server className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No DNS records available</p>
              <p className="text-xs text-muted-foreground mt-1">Run a scan with DNS enumeration to see records</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-red-500" />
            <CardTitle>Email Configuration</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {hasEmailConfig ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <h5 className="font-medium">SPF Record</h5>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono break-all">
                    {emailConfig.spf || 'Not configured'}
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <h5 className="font-medium">DMARC Record</h5>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono break-all">
                    {emailConfig.dmarc || 'Not configured'}
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <h5 className="font-medium">MX Records</h5>
                  </div>
                  <div className="space-y-1">
                    {emailConfig.mxRecords && emailConfig.mxRecords.length > 0 ? (
                      emailConfig.mxRecords.map((mx, i) => (
                        <p key={i} className="text-sm text-muted-foreground font-mono">
                          {mx}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Not configured</p>
                    )}
                  </div>
                </div>
              </div>

              {emailConfig.dkim && emailConfig.dkim.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium mb-2">DKIM Records</h5>
                  <div className="space-y-2">
                    {emailConfig.dkim.map((dkim, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/30 font-mono text-xs break-all">
                        {dkim}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No email configuration data available</p>
              <p className="text-xs text-muted-foreground mt-1">Run a scan with email enumeration to see SPF, DMARC, and MX records</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
