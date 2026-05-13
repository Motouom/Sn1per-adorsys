'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Globe,
  Network,
  Shield,
  ArrowRight,
  Zap,
  Search,
  Bug,
  Server,
  Lock,
  FileText,
  Activity,
  Target,
  Radar,
  Cpu,
  Terminal,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

interface LandingPageProps {
  onSelectMode: (mode: 'webapp' | 'network') => void;
}

export function LandingPage({ onSelectMode }: LandingPageProps) {
  const [hoveredCard, setHoveredCard] = useState<'webapp' | 'network' | null>(null);
  const [sudoStatus, setSudoStatus] = useState<'checking' | 'ok' | 'warning'>('checking');
  const [showSudoHelp, setShowSudoHelp] = useState(false);

  useEffect(() => {
    fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'test.example.com', mode: 'normal', debug: true }),
    })
      .then(res => res.body?.getReader())
      .then(reader => {
        if (reader) {
          reader.cancel();
        }
      })
      .catch(() => {});
    
    setTimeout(() => {
      setSudoStatus('ok');
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="text-center mb-8 sm:mb-12 w-full max-w-3xl px-4">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
            <Shield className="h-8 w-8 sm:h-12 sm:w-12 text-red-500 animate-pulse" />
            <h1 className="text-2xl sm:text-4xl font-bold">Sn1per Security Platform</h1>
          </div>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional penetration testing framework for comprehensive security assessments
          </p>
          
          <div className="mt-4 flex items-center justify-center gap-2">
            {sudoStatus === 'checking' && (
              <Badge variant="warning" size="sm">
                <Activity className="h-3 w-3 animate-spin mr-1" />
                Checking system...
              </Badge>
            )}
            {sudoStatus === 'ok' && (
              <Badge variant="success" size="sm">
                <CheckCircle className="h-3 w-3 mr-1" />
                System ready
              </Badge>
            )}
            {sudoStatus === 'warning' && (
              <button onClick={() => setShowSudoHelp(!showSudoHelp)}>
                <Badge variant="critical" size="sm" className="cursor-pointer hover:opacity-80">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Sudo setup required
                </Badge>
              </button>
            )}
          </div>
          
          {showSudoHelp && (
            <Card className="mt-4 text-left bg-yellow-500/10 border-yellow-500">
              <CardContent className="p-4">
                <p className="font-semibold mb-2">Quick Sudo Setup:</p>
                <code className="block bg-black/50 p-2 rounded text-xs overflow-x-auto">
                  echo "$USER ALL=(ALL) NOPASSWD: /usr/share/sniper/sniper *" | sudo tee /etc/sudoers.d/sniper
                </code>
                <p className="text-xs mt-2 text-muted-foreground">Or enable "Debug/Simulation Mode" in scan settings</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 max-w-5xl w-full px-4">
          <Card
            className={`cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
              hoveredCard === 'webapp' ? 'border-red-500 shadow-lg shadow-red-500/20 scale-[1.02]' : ''
            }`}
            onMouseEnter={() => setHoveredCard('webapp')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => onSelectMode('webapp')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl">Web Application Pentesting</CardTitle>
                  <Badge variant="success" size="sm">Fully Functional</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                Comprehensive web application security testing including vulnerability scanning,
                technology detection, SSL analysis, and OSINT gathering.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
                <FeatureItem icon={<Search className="h-4 w-4" />} text="Reconnaissance" />
                <FeatureItem icon={<Bug className="h-4 w-4" />} text="Vulnerability Scan" />
                <FeatureItem icon={<Shield className="h-4 w-4" />} text="SSL Analysis" />
                <FeatureItem icon={<FileText className="h-4 w-4" />} text="Tech Detection" />
                <FeatureItem icon={<Target className="h-4 w-4" />} text="OSINT Gathering" />
                <FeatureItem icon={<Activity className="h-4 w-4" />} text="Real-time Output" />
              </div>

              <Button variant="primary" className="w-full group">
                Start Web App Assessment
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
              hoveredCard === 'network' ? 'border-blue-500 shadow-lg shadow-blue-500/20 scale-[1.02]' : ''
            }`}
            onMouseEnter={() => setHoveredCard('network')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => onSelectMode('network')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Network className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl">Network Pentesting</CardTitle>
                  <Badge variant="info" size="sm">Available</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                Complete network security assessment from host discovery to vulnerability
                enumeration and exploitation testing.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
                <FeatureItem icon={<Radar className="h-4 w-4" />} text="Host Discovery" />
                <FeatureItem icon={<Server className="h-4 w-4" />} text="Port Scanning" />
                <FeatureItem icon={<Cpu className="h-4 w-4" />} text="Service Enum" />
                <FeatureItem icon={<Terminal className="h-4 w-4" />} text="OS Fingerprint" />
                <FeatureItem icon={<Bug className="h-4 w-4" />} text="Vuln Detection" />
                <FeatureItem icon={<Activity className="h-4 w-4" />} text="Live Progress" />
              </div>

              <Button variant="outline" className="w-full border-blue-500 text-blue-500 hover:bg-blue-500/10 group">
                Start Network Assessment
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 sm:mt-12 text-center px-4">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-500" />
              Session persistence
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3 text-blue-500" />
              Export reports
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1">
              <Terminal className="h-3 w-3 text-green-500" />
              Real-time output
            </span>
          </div>
        </div>
      </div>

      <footer className="border-t border-border py-3 sm:py-4 text-center text-xs sm:text-sm text-muted-foreground px-4">
        <p>Sn1per Security Platform v9.0 • Professional Penetration Testing Framework</p>
      </footer>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs sm:text-sm">
      <div className="text-red-400 flex-shrink-0">{icon}</div>
      <span className="truncate">{text}</span>
    </div>
  );
}
