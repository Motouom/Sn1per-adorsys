import { NextRequest, NextResponse } from 'next/server';
import { ChildProcess } from 'child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SNIPER_PATH = process.env.SNIPER_PATH || '/usr/share/sniper/sniper';

// Global map to track running scan processes
const runningScans = new Map<string, ChildProcess>();

interface ScanStatus {
  stage: string;
  progress: number;
  message: string;
  timestamp: string;
}

function parseScanOutput(line: string, scanType: string): ScanStatus | null {
  const timestamp = new Date().toISOString();
  
  const cleanLine = line.replace(/\x1B\[[0-9;]*[mK]/g, '').trim();

  if (cleanLine.includes('DISCOVERY') || cleanLine.includes('Running discovery') || cleanLine.includes('ping scan') || cleanLine.includes('Host discovery')) {
    return { stage: 'discovery', progress: 15, message: cleanLine, timestamp };
  }
  if (cleanLine.includes('TCP PORT') || cleanLine.includes('TCP scan') || cleanLine.includes('Scanning ports') || cleanLine.includes('port scan')) {
    return { stage: 'tcp_scan', progress: 30, message: cleanLine, timestamp };
  }
  if (cleanLine.includes('UDP PORT') || cleanLine.includes('UDP scan')) {
    return { stage: 'udp_scan', progress: 50, message: cleanLine, timestamp };
  }
  if (cleanLine.includes('open port') || cleanLine.includes('open') || cleanLine.includes('PORT')) {
    if (cleanLine.match(/\d+\/(tcp|udp)\s+open/)) {
      return { stage: 'port_found', progress: 60, message: cleanLine, timestamp };
    }
  }
  if (cleanLine.includes('Nuclei') || cleanLine.includes('nuclei')) {
    return { stage: 'vulnscan', progress: 70, message: cleanLine, timestamp };
  }
  if (cleanLine.includes('vulnerability') || cleanLine.includes('VULNERABILITY') || cleanLine.includes('Vuln')) {
    return { stage: 'vulnscan', progress: 75, message: cleanLine, timestamp };
  }
  if (cleanLine.includes('web') && (cleanLine.includes('scan') || cleanLine.includes('spider') || cleanLine.includes('crawler') || cleanLine.includes('dirbuster') || cleanLine.includes('gobuster'))) {
    return { stage: 'webscan', progress: 40, message: cleanLine, timestamp };
  }
  if (cleanLine.includes('OS') || cleanLine.includes('OS detection') || cleanLine.includes('Fingerprint')) {
    if (!cleanLine.includes('OSINT') && !cleanLine.includes('possible')) {
      return { stage: 'os_fingerprint', progress: 85, message: cleanLine, timestamp };
    }
  }
  if (cleanLine.includes('OSINT') || cleanLine.includes('Gathering emails') || cleanLine.includes('Email found') || cleanLine.includes('theHarvester') || cleanLine.includes('harvester')) {
    return { stage: 'osint', progress: 90, message: cleanLine, timestamp };
  }
  if (cleanLine.includes('SSL') || cleanLine.includes('ssl') || cleanLine.includes('TLS') || cleanLine.includes('tls') || cleanLine.includes('certificate')) {
    return { stage: 'ssl', progress: 55, message: cleanLine, timestamp };
  }
  if (cleanLine.includes('Complete') || cleanLine.includes('complete') || cleanLine.includes('Done!') || cleanLine.includes('Scan completed') || cleanLine.includes('finished')) {
    return { stage: 'complete', progress: 100, message: cleanLine, timestamp };
  }
  if (cleanLine.includes('Error') || cleanLine.includes('error') || cleanLine.includes('ERROR')) {
    if (!cleanLine.includes('not found') && !cleanLine.includes('No such file') && !cleanLine.includes('0 errors')) {
        return { stage: 'error', progress: 0, message: cleanLine, timestamp };
    }
  }

  return null;
}

function getModeArgs(mode: string, target: string, scanType?: string): string[] {
  switch (mode) {
    case 'discovery':
      return ['-t', target, '-m', 'discover'];
    case 'portscan':
      return ['-t', target, '-m', 'normal'];
    case 'fullportscan':
      return ['-t', target, '-m', 'fullportonly'];
    case 'vulnscan':
      return ['-t', target, '-m', 'vulnscan'];
    case 'web':
      return ['-t', target, '-m', 'web'];
    case 'stealth':
      return ['-t', target, '-m', 'stealth'];
    case 'webscan':
      return ['-t', target, '-m', 'webscan'];
    case 'discover':
      return ['-t', target, '-m', 'discover'];
    case 'normal':
    default:
      return ['-t', target];
  }
}

export async function POST(request: NextRequest) {
  console.log('[SCAN API] Received scan request');
  
  try {
    const body = await request.json();
    const { target, mode = 'normal', type = 'webapp' } = body;

    console.log('[SCAN API] Target:', target, 'Mode:', mode, 'Type:', type);

    if (!target) {
      console.log('[SCAN API] Error: Target is required');
      return new Response(JSON.stringify({ error: 'Target is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    
    if (!domainRegex.test(target) && !ipRegex.test(target) && !cidrRegex.test(target)) {
      console.log('[SCAN API] Error: Invalid target format');
      return new Response(JSON.stringify({ error: 'Invalid target format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;
        
        const sendEvent = (data: object): boolean => {
          if (isClosed) return false;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            return true;
          } catch (e: any) {
            if (e.code === 'ERR_INVALID_STATE') {
              isClosed = true;
            }
            return false;
          }
        };

        console.log('[SCAN API] Starting sniper scan');
        sendEvent({ type: 'start', target, mode, timestamp: new Date().toISOString() });

        const { spawn } = await import('child_process');
        
        const args = getModeArgs(mode, target, type);
        console.log('[SCAN API] Spawn args:', args);

        const sniper = spawn('sudo', [SNIPER_PATH, ...args], {
          env: { ...process.env, TERM: 'xterm' },
        });

        // Store the process in the running scans map
        runningScans.set(target, sniper);

        let lineCount = 0;

        sniper.stdout.on('data', (data: Buffer) => {
          if (isClosed) return;
          const text = data.toString();
          console.log('[SCAN API] stdout:', text.substring(0, 200));
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.trim()) {
              lineCount++;
              
              sendEvent({ 
                type: 'output', 
                line: line.trim(),
                lineNumber: lineCount,
                timestamp: new Date().toISOString()
              });
              
              const status = parseScanOutput(line, type === 'network' ? mode : 'webapp');
              if (status) {
                sendEvent({ type: 'status', ...status });
              }
            }
          }
        });

        sniper.stderr.on('data', (data: Buffer) => {
          if (isClosed) return;
          const text = data.toString();
          console.log('[SCAN API] stderr:', text.substring(0, 200));
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.trim()) {
              sendEvent({ 
                type: 'error', 
                line: line.trim(),
                timestamp: new Date().toISOString()
              });
            }
          }
        });

        sniper.on('close', (code: number) => {
          console.log('[SCAN API] Process closed with code:', code);
          // Remove from running scans map
          runningScans.delete(target);
          if (!isClosed) {
            sendEvent({ 
              type: 'status', 
              stage: 'complete', 
              progress: 100, 
              message: 'Scan completed!', 
              timestamp: new Date().toISOString() 
            });
            sendEvent({ 
              type: 'complete', 
              code, 
              target,
              totalLines: lineCount,
              timestamp: new Date().toISOString()
            });
            try {
              controller.close();
            } catch (e) {}
          }
        });

        sniper.on('error', (err: Error) => {
          console.error('[SCAN API] Process error:', err);
          // Remove from running scans map
          runningScans.delete(target);
          if (!isClosed) {
            sendEvent({ 
              type: 'error', 
              error: err.message,
              line: 'Failed to start sniper: ' + err.message + '. Make sure sniper is installed and sudo is configured.',
              timestamp: new Date().toISOString()
            });
            sendEvent({ 
              type: 'complete', 
              code: 1, 
              target,
              totalLines: lineCount,
              timestamp: new Date().toISOString()
            });
            try {
              controller.close();
            } catch (e) {}
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[SCAN API] Unhandled error:', error);
    return new Response(JSON.stringify({ error: 'Failed to start scan: ' + (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target');

    if (!target) {
      return NextResponse.json({ error: 'Target is required' }, { status: 400 });
    }

    const process = runningScans.get(target);
    if (process) {
      console.log(`[SCAN API] Stopping scan for ${target}`);
      
      try {
        const { exec } = await import('child_process');
        // Kill the sniper process and its children
        exec(`sudo pkill -f "sniper.*-t ${target}"`);
        process.kill('SIGINT');
        // Give it a moment then force kill if still there
        setTimeout(() => {
          if (runningScans.has(target)) {
            process.kill('SIGKILL');
            runningScans.delete(target);
          }
        }, 2000);
      } catch (killError) {
        console.error(`[SCAN API] Error killing process:`, killError);
        process.kill();
      }
      
      runningScans.delete(target);
      return NextResponse.json({ message: `Scan for ${target} stopped` });
    }

    return NextResponse.json({ error: 'No active scan found for this target' }, { status: 404 });
  } catch (error) {
    console.error('[SCAN API] Error in DELETE:', error);
    return NextResponse.json({ error: 'Failed to stop scan' }, { status: 500 });
  }
}
