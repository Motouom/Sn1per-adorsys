'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Note } from '@/types';
import { cn } from '@/lib/utils';
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Tag,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState, useMemo } from 'react';

interface NotesPanelProps {
  notes?: Note[];
  workspaceName: string;
}

export function NotesPanel({ notes, workspaceName }: NotesPanelProps) {
  const [search, setSearch] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = new Set<string>();
    notes?.forEach((n) => cats.add(n.category));
    return ['all', ...Array.from(cats)];
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    return notes.filter((note) => {
      const matchesSearch =
        search === '' ||
        note.title.toLowerCase().includes(search.toLowerCase()) ||
        note.content.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [notes, search, selectedCategory]);

  const toggleNote = (id: string) => {
    setExpandedNotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (!notes || notes.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-red-500" />
              <CardTitle>Notes & Findings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium">No Notes Yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create notes to document your findings and observations.
                </p>
              </div>
              <Button variant="primary">
                <Plus className="h-4 w-4" />
                Create Note
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-red-500" />
            <CardTitle>Notes & Findings</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info">{notes.length} notes</Badge>
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" />
              New Note
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 rounded-lg border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filteredNotes.map((note) => (
          <Card key={note.id} padding="none" className="overflow-hidden">
            <div
              className="flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => toggleNote(note.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium truncate">{note.title}</h4>
                  <Badge variant="default" size="sm">
                    {note.category}
                  </Badge>
                </div>

                <p
                  className={cn(
                    'text-sm text-muted-foreground',
                    !expandedNotes.has(note.id) && 'line-clamp-2'
                  )}
                >
                  {note.content}
                </p>

                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  {note.target && (
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      <span>{note.target}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimestamp(note.updatedAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {expandedNotes.has(note.id) ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {expandedNotes.has(note.id) && (
              <div className="px-4 pb-4 pt-0 border-t border-border bg-muted/10">
                {note.tags.length > 0 && (
                  <div className="flex items-center gap-2 mb-3 pt-3">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    <div className="flex flex-wrap gap-1">
                      {note.tags.map((tag, i) => (
                        <Badge key={`${tag}-${i}`} variant="default" size="sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <Button variant="outline" size="sm">
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}

        {filteredNotes.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-muted-foreground">No notes match your search criteria.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}
