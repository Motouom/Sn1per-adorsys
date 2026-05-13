'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Settings } from '@/types';
import { cn } from '@/lib/utils';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Bell,
  BellOff,
  Play,
  Pause,
  Key,
  Globe,
  Slack,
  Mail,
  Save,
  RefreshCw,
  Shield,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useState } from 'react';

interface SettingsPanelProps {
  initialSettings?: Partial<Settings>;
  onSettingsChange?: (settings: Partial<Settings>) => void;
}

export function SettingsPanel({ initialSettings, onSettingsChange }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Partial<Settings>>(
    initialSettings || {
      theme: 'dark',
      notifications: true,
      autoScan: false,
      scanMode: 'normal',
      apiKeys: {},
    }
  );
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    onSettingsChange?.({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-5 w-5 text-red-500" />
            <CardTitle>General Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-4">
                {settings.theme === 'dark' ? (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                <button
                  onClick={() => updateSetting('theme', 'light')}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    settings.theme === 'light'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Sun className="h-4 w-4 inline mr-2" />
                  Light
                </button>
                <button
                  onClick={() => updateSetting('theme', 'dark')}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    settings.theme === 'dark'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Moon className="h-4 w-4 inline mr-2" />
                  Dark
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-4">
                {settings.notifications ? (
                  <Bell className="h-5 w-5 text-green-500" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive scan completion alerts</p>
                </div>
              </div>
              <button
                onClick={() => updateSetting('notifications', !settings.notifications)}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors',
                  settings.notifications ? 'bg-green-500' : 'bg-muted'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                    settings.notifications ? 'translate-x-7' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-4">
                {settings.autoScan ? (
                  <Play className="h-5 w-5 text-green-500" />
                ) : (
                  <Pause className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Auto Scan</p>
                  <p className="text-sm text-muted-foreground">Automatically scan new targets</p>
                </div>
              </div>
              <button
                onClick={() => updateSetting('autoScan', !settings.autoScan)}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors',
                  settings.autoScan ? 'bg-green-500' : 'bg-muted'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                    settings.autoScan ? 'translate-x-7' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-4">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Scan Mode</p>
                  <p className="text-sm text-muted-foreground">Choose scanning aggressiveness</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                {(['normal', 'stealth', 'aggressive'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateSetting('scanMode', mode)}
                    className={cn(
                      'px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize',
                      settings.scanMode === mode
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-red-500" />
            <CardTitle>API Keys</CardTitle>
          </div>
          <Badge variant="warning">Sensitive</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { key: 'shodan', label: 'Shodan', icon: Globe },
              { key: 'censys', label: 'Censys', icon: Globe },
              { key: 'virustotal', label: 'VirusTotal', icon: Shield },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <label className="text-sm font-medium">{label}</label>
                  <div className="relative mt-1">
                    <input
                      type={showApiKeys[key] ? 'text' : 'password'}
                      placeholder={`Enter your ${label} API key`}
                      value={settings.apiKeys?.[key as keyof typeof settings.apiKeys] || ''}
                      onChange={(e) =>
                        updateSetting('apiKeys', {
                          ...settings.apiKeys,
                          [key]: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowApiKeys((prev) => ({ ...prev, [key]: !prev[key] }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKeys[key] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-red-500" />
            <CardTitle>Integrations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg border border-border">
              <Slack className="h-5 w-5 text-[#4A154B]" />
              <div className="flex-1">
                <p className="font-medium">Slack Webhook</p>
                <p className="text-sm text-muted-foreground">
                  Receive notifications in Slack channel
                </p>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={settings.slackWebhook || ''}
                  onChange={(e) => updateSetting('slackWebhook', e.target.value)}
                  className="w-full mt-2 px-3 py-2 rounded-lg border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border border-border">
              <Mail className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <p className="font-medium">Email Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Receive scan results via email
                </p>
                <input
                  type="email"
                  placeholder="security@example.com"
                  value={settings.emailAlerts || ''}
                  onChange={(e) => updateSetting('emailAlerts', e.target.value)}
                  className="w-full mt-2 px-3 py-2 rounded-lg border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-4">
        <Button variant="outline">
          <RefreshCw className="h-4 w-4" />
          Reset
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
