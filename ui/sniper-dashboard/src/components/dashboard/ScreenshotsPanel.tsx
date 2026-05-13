'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Screenshot } from '@/types';
import { cn } from '@/lib/utils';
import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import {
  Camera,
  Image as ImageIcon,
  ExternalLink,
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  X,
  Globe,
  Lock,
  Maximize2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface ScreenshotsPanelProps {
  screenshots?: Screenshot[];
  workspacePath?: string;
}

export function ScreenshotsPanel({ screenshots, workspacePath }: ScreenshotsPanelProps) {
  const [selectedImage, setSelectedImage] = useState<Screenshot | null>(null);
  const [zoom, setZoom] = useState(1);
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const validScreenshots = useMemo(() => {
    if (!screenshots) return [];
    return screenshots.filter(s => s.path && s.url);
  }, [screenshots]);

  const getScreenshotUrl = (screenshot: Screenshot) => {
    const parts = screenshot.path.split('/');
    const workspaceIndex = parts.findIndex(p => p === 'workspace');
    if (workspaceIndex === -1 || workspaceIndex + 1 >= parts.length) return null;
    
    const workspace = parts[workspaceIndex + 1];
    const filename = parts[parts.length - 1];
    return `/api/screenshot?workspace=${encodeURIComponent(workspace)}&filename=${encodeURIComponent(filename)}`;
  };

  useEffect(() => {
    if (validScreenshots.length > 0) {
      const loading: Record<string, boolean> = {};
      validScreenshots.forEach(s => {
        loading[s.id] = true;
      });
      setImageLoading(loading);
    }
  }, [validScreenshots]);

  const handleImageLoad = (id: string) => {
    setImageLoading(prev => ({ ...prev, [id]: false }));
  };

  const handleImageError = (id: string) => {
    setImageLoading(prev => ({ ...prev, [id]: false }));
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  if (validScreenshots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Camera className="h-5 w-5 text-red-500" />
            <CardTitle>Screenshots</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">No Screenshots Available</p>
              <p className="text-sm text-muted-foreground mt-1">
                No website screenshots were captured during the scan. Screenshots are captured for web services found on open ports.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedScreenshots = useMemo(() => {
    const grouped: Record<string, Screenshot[]> = {};
    validScreenshots.forEach((s) => {
      const key = s.url.split('/')[0];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    return grouped;
  }, [validScreenshots]);

  const handlePrev = () => {
    if (!selectedImage) return;
    const currentIndex = validScreenshots.findIndex((s) => s.id === selectedImage.id);
    const prevIndex = (currentIndex - 1 + validScreenshots.length) % validScreenshots.length;
    setSelectedImage(validScreenshots[prevIndex]);
  };

  const handleNext = () => {
    if (!selectedImage) return;
    const currentIndex = validScreenshots.findIndex((s) => s.id === selectedImage.id);
    const nextIndex = (currentIndex + 1) % validScreenshots.length;
    setSelectedImage(validScreenshots[nextIndex]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Camera className="h-5 w-5 text-red-500" />
            <CardTitle>Website Screenshots</CardTitle>
          </div>
          <Badge variant="info">{validScreenshots.length} screenshots</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {validScreenshots.map((screenshot) => {
              const imageUrl = getScreenshotUrl(screenshot);
              const isLoading = imageLoading[screenshot.id];
              const hasError = imageErrors[screenshot.id];

              return (
                <div
                  key={screenshot.id}
                  className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer hover:border-red-500/50 transition-all"
                  onClick={() => {
                    if (!hasError) {
                      setSelectedImage(screenshot);
                      setZoom(1);
                    }
                  }}
                >
                  {imageUrl && !hasError ? (
                    <div className="relative w-full h-full">
                      <img
                        src={imageUrl}
                        alt={screenshot.title}
                        className="w-full h-full object-cover"
                        onLoad={() => handleImageLoad(screenshot.id)}
                        onError={() => handleImageError(screenshot.id)}
                      />
                      {isLoading && (
                        <div className="absolute inset-0 bg-muted/50 flex items-center justify-center">
                          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/80 flex items-center justify-center">
                      <div className="text-center">
                        {hasError ? (
                          <>
                            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">Failed to load</p>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">Click to view</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        {screenshot.protocol === 'https' ? (
                          <Lock className="h-3 w-3 text-green-500" />
                        ) : (
                          <Globe className="h-3 w-3 text-blue-500" />
                        )}
                        <span className="text-xs text-white truncate">
                          :{screenshot.port}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 truncate">{screenshot.title}</p>
                    </div>
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-1.5 rounded bg-black/50 text-white">
                      <ZoomIn className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-6xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const imageUrl = getScreenshotUrl(selectedImage);
              return imageUrl ? (
                <img
                  src={imageUrl}
                  alt={selectedImage.title}
                  className="max-w-full max-h-[80vh] object-contain"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                />
              ) : (
                <div
                  className="bg-muted/90 min-w-[600px] min-h-[400px] flex items-center justify-center"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                >
                  <div className="text-center">
                    <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Screenshot: {selectedImage.path}</p>
                    <p className="text-sm text-muted-foreground mt-2">{selectedImage.title}</p>
                  </div>
                </div>
              );
            })()}

            <div className="absolute top-4 right-4 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-black/50 border-white/20 text-white hover:bg-black/70"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-white text-sm px-2">{Math.round(zoom * 100)}%</span>
              <Button
                variant="outline"
                size="sm"
                className="bg-black/50 border-white/20 text-white hover:bg-black/70"
                onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-black/50 border-white/20 text-white hover:bg-black/70"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 border-white/20 text-white hover:bg-black/70"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 border-white/20 text-white hover:bg-black/70"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 rounded-lg px-4 py-2">
              <div className="flex items-center gap-4 text-white text-sm">
                <div className="flex items-center gap-2">
                  {selectedImage.protocol === 'https' ? (
                    <Lock className="h-4 w-4 text-green-500" />
                  ) : (
                    <Globe className="h-4 w-4 text-blue-500" />
                  )}
                  <span>{selectedImage.url}</span>
                </div>
                <span className="text-white/50">|</span>
                <span>Port: {selectedImage.port}</span>
                <span className="text-white/50">|</span>
                <span>{selectedImage.capturedAt}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {Object.entries(groupedScreenshots).map(([host, shots]) => (
        <Card key={host}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-red-500" />
              <CardTitle>{host}</CardTitle>
            </div>
            <Badge variant="info">{shots.length} screenshots</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {shots.map((shot) => {
                const imageUrl = getScreenshotUrl(shot);
                const hasError = imageErrors[shot.id];

                return (
                  <div
                    key={shot.id}
                    className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (!hasError) {
                        setSelectedImage(shot);
                        setZoom(1);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        variant={shot.protocol === 'https' ? 'success' : 'default'}
                        size="sm"
                      >
                        {shot.protocol.toUpperCase()} :{shot.port}
                      </Badge>
                    </div>
                    {imageUrl && !hasError ? (
                      <img
                        src={imageUrl}
                        alt={shot.title}
                        className="w-full h-20 object-cover rounded mb-2"
                      />
                    ) : (
                      <div className="w-full h-20 bg-muted rounded mb-2 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-sm font-medium truncate">{shot.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{shot.capturedAt}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
