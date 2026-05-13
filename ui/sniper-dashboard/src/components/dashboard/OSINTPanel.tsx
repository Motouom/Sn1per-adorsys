'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OSINTData } from '@/types';
import {
  Search,
  Mail,
  User,
  Globe,
  FileText,
  Link,
  Users,
  ExternalLink,
  Copy,
  Building,
  MapPin,
} from 'lucide-react';

interface OSINTPanelProps {
  data?: OSINTData;
  target: string;
}

export function OSINTPanel({ data, target }: OSINTPanelProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-red-500" />
            <CardTitle>OSINT Data</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No OSINT data available for this target.</p>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { label: 'Emails', value: data.emails?.length || 0, icon: Mail, color: 'text-blue-500' },
    { label: 'Usernames', value: data.usernames?.length || 0, icon: User, color: 'text-green-500' },
    { label: 'Social Profiles', value: data.socialProfiles?.length || 0, icon: Users, color: 'text-purple-500' },
    { label: 'Related Domains', value: data.relatedDomains?.length || 0, icon: Globe, color: 'text-orange-500' },
    { label: 'Subdomains', value: data.subdomains?.length || 0, icon: Link, color: 'text-cyan-500' },
    { label: 'Documents', value: data.publicDocuments?.length || 0, icon: FileText, color: 'text-yellow-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted/50 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {data.emails && data.emails.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-red-500" />
              <CardTitle>Discovered Emails</CardTitle>
            </div>
            <Badge variant="info">{data.emails.length} emails</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {data.emails.map((email, i) => (
                <div
                  key={`${email}-${i}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <span className="font-mono text-sm">{email}</span>
                  <Button variant="ghost" size="sm">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.socialProfiles && data.socialProfiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-red-500" />
              <CardTitle>Social Media Profiles</CardTitle>
            </div>
            <Badge variant="info">{data.socialProfiles.length} profiles</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.socialProfiles.map((profile, i) => (
                <div
                  key={`${profile.platform}-${i}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {profile.platform.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{profile.username}</p>
                      <p className="text-sm text-muted-foreground">{profile.platform}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{profile.discovered}</span>
                    <a
                      href={profile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-transparent hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.subdomains && data.subdomains.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-red-500" />
              <CardTitle>Subdomains</CardTitle>
            </div>
            <Badge variant="success">{data.subdomains.length} found</Badge>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {data.subdomains.map((subdomain, i) => (
                  <div
                    key={`${subdomain}-${i}`}
                    className="flex items-center gap-2 p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <Globe className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-mono truncate">{subdomain}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.metadata && Object.keys(data.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-red-500" />
              <CardTitle>Metadata</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.metadata).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
                >
                  <span className="text-sm font-medium text-muted-foreground min-w-[150px]">
                    {key}
                  </span>
                  <span className="text-sm font-mono">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.publicDocuments && data.publicDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-red-500" />
              <CardTitle>Public Documents</CardTitle>
            </div>
            <Badge variant="info">{data.publicDocuments.length} documents</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.publicDocuments.slice(0, 20).map((doc, i) => (
                <div
                  key={`${doc}-${i}`}
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline truncate flex-1"
                  >
                    {doc}
                  </a>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
              ))}
              {data.publicDocuments.length > 20 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Showing 20 of {data.publicDocuments.length} documents
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
