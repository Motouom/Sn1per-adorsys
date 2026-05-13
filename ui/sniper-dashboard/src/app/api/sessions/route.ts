import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const LOOT_BASE_PATH = '/usr/share/sniper/loot/workspace';
const SESSIONS_FILE = '/tmp/sniper_sessions.json';

interface ScanSession {
  id: string;
  target: string;
  mode: 'webapp' | 'network';
  scanType: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'running' | 'completed' | 'failed';
  outputCount: number;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  notes?: string;
}

async function getSessions(): Promise<ScanSession[]> {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveSessions(sessions: ScanSession[]): Promise<void> {
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

async function getWorkspaceData(workspace: string) {
  const workspacePath = path.join(LOOT_BASE_PATH, workspace);
  
  try {
    const vulnReport = await fs.readFile(path.join(workspacePath, `vulnerabilities/vulnerability-report-${workspace}.txt`), 'utf-8');
    
    const counts = {
      critical: (vulnReport.match(/Critical:\s*(\d+)/i)?.[1] || '0'),
      high: (vulnReport.match(/High:\s*(\d+)/i)?.[1] || '0'),
      medium: (vulnReport.match(/Medium:\s*(\d+)/i)?.[1] || '0'),
      low: (vulnReport.match(/Low:\s*(\d+)/i)?.[1] || '0'),
      info: (vulnReport.match(/Info:\s*(\d+)/i)?.[1] || '0'),
    };
    
    return {
      vulnerabilities: {
        critical: parseInt(counts.critical),
        high: parseInt(counts.high),
        medium: parseInt(counts.medium),
        low: parseInt(counts.low),
        info: parseInt(counts.info),
      },
    };
  } catch {
    return { vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0, info: 0 } };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');
  const sessionId = searchParams.get('id');

  if (action === 'list') {
    const sessions = await getSessions();
    
    // Enrich sessions with workspace data
    const enrichedSessions = await Promise.all(sessions.map(async (s) => {
      const data = await getWorkspaceData(s.target);
      return {
        ...s,
        vulnerabilities: { ...s.vulnerabilities, ...data.vulnerabilities },
      };
    }));
    
    return NextResponse.json({ sessions: enrichedSessions });
  }

  if (action === 'get' && sessionId) {
    const sessions = await getSessions();
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Get workspace data
    const workspaceData = await getWorkspaceData(session.target);
    
    return NextResponse.json({
      session: {
        ...session,
        vulnerabilities: { ...session.vulnerabilities, ...workspaceData.vulnerabilities },
      },
      workspacePath: path.join(LOOT_BASE_PATH, session.target),
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, session } = body;

    if (action === 'create') {
      const sessions = await getSessions();
      const newSession: ScanSession = {
        id: `scan-${Date.now()}`,
        target: session.target,
        mode: session.mode,
        scanType: session.scanType,
        startTime: new Date().toISOString(),
        status: 'running',
        outputCount: 0,
        vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      };
      sessions.unshift(newSession);
      await saveSessions(sessions);
      return NextResponse.json({ session: newSession });
    }

    if (action === 'update') {
      const sessions = await getSessions();
      const index = sessions.findIndex(s => s.id === session.id);
      if (index !== -1) {
        sessions[index] = { ...sessions[index], ...session };
        await saveSessions(sessions);
        return NextResponse.json({ session: sessions[index] });
      }
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (action === 'delete') {
      const sessions = await getSessions();
      const filtered = sessions.filter(s => s.id !== session.id);
      await saveSessions(filtered);
      return NextResponse.json({ success: true });
    }

    if (action === 'update-note') {
      const sessions = await getSessions();
      const index = sessions.findIndex(s => s.id === session.id);
      if (index !== -1) {
        sessions[index].notes = session.notes;
        await saveSessions(sessions);
        return NextResponse.json({ session: sessions[index] });
      }
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get('id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  const sessions = await getSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  await saveSessions(filtered);

  return NextResponse.json({ success: true });
}
