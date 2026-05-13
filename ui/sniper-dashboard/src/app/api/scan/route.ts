import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SNIPER_PATH = process.env.SNIPER_PATH || '/usr/share/sniper/sniper';

interface ScanStatus {
  stage: string;
  progress: number;
  message: string;
  timestamp: string;
}

function parseScanOutput(line: string, scanType: string): ScanStatus | null {
  const timestamp = new Date().toISOString();
  
  if (scanType === 'network' || ['discovery', 'portscan', 'fullportscan', 'vulnscan'].includes(scanType)) {
    if (line.includes('discovery') || line.includes('DISCOVERY') || line.includes('ping')) {
      return { stage: 'discovery', progress: 15, message: line.trim(), timestamp };
    }
    if (line.includes('TCP PORT') || line.includes('TCP scan')) {
      return { stage: 'tcp_scan', progress: 30, message: line.trim(), timestamp };
    }
    if (line.includes('UDP PORT') || line.includes('UDP scan')) {
      return { stage: 'udp_scan', progress: 50, message: line.trim(), timestamp };
    }
    if (line.includes('open port') || line.includes('open')) {
      return { stage: 'port_found', progress: 60, message: line.trim(), timestamp };
    }
    if (line.includes('vulnerability') || line.includes('VULNERABILITY')) {
      return { stage: 'vulnscan', progress: 75, message: line.trim(), timestamp };
    }
    if (line.includes('OS') || line.includes('OS detection')) {
      return { stage: 'os_fingerprint', progress: 85, message: line.trim(), timestamp };
    }
    if (line.includes('Complete') || line.includes('complete') || line.includes('SCAN COMPLETE')) {
      return { stage: 'complete', progress: 100, message: line.trim(), timestamp };
    }
    if (line.includes('Error') || line.includes('error') || line.includes('ERROR')) {
      return { stage: 'error', progress: 0, message: line.trim(), timestamp };
    }
    return null;
  }

  if (line.includes('Running discovery scan')) {
    return { stage: 'discovery', progress: 10, message: line.trim(), timestamp };
  }
  if (line.includes('Port scan') || line.includes('port scan')) {
    return { stage: 'portscan', progress: 20, message: line.trim(), timestamp };
  }
  if (line.includes('nmap') || line.includes('Nmap')) {
    return { stage: 'nmap', progress: 30, message: line.trim(), timestamp };
  }
  if (line.includes('web scan') || line.includes('Web') || line.includes('HTTP')) {
    return { stage: 'webscan', progress: 50, message: line.trim(), timestamp };
  }
  if (line.includes('vulnerability') || line.includes('Vulnerability')) {
    return { stage: 'vulnscan', progress: 70, message: line.trim(), timestamp };
  }
  if (line.includes('OSINT') || line.includes('osint')) {
    return { stage: 'osint', progress: 80, message: line.trim(), timestamp };
  }
  if (line.includes('Complete') || line.includes('complete') || line.includes('SCAN COMPLETE')) {
    return { stage: 'complete', progress: 100, message: line.trim(), timestamp };
  }
  if (line.includes('Error') || line.includes('error') || line.includes('ERROR')) {
    return { stage: 'error', progress: 0, message: line.trim(), timestamp };
  }
  
  return null;
}

function getModeArgs(mode: string, target: string): string[] {
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
        
        const args = getModeArgs(mode, target);
        console.log('[SCAN API] Spawn args:', args);

        const sniper = spawn('sudo', [SNIPER_PATH, ...args], {
          env: { ...process.env, TERM: 'xterm' },
        });

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
          if (!isClosed) {
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
