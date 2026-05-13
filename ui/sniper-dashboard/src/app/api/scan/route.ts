import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SNIPER_PATH = '/usr/share/sniper/sniper';

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

async function runSimulationScan(target: string, mode: string, controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  let isClosed = false;
  
  const sendEvent = (data: object): boolean => {
    if (isClosed) return false;
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      return true;
    } catch (e: any) {
      if (e.code === 'ERR_INVALID_STATE') {
        isClosed = true;
        console.log('[SCAN API] Stream closed by client');
      } else {
        console.error('[SCAN API] Error sending event:', e);
      }
      return false;
    }
  };

  if (!sendEvent({ type: 'start', target, mode, timestamp: new Date().toISOString(), simulation: true })) {
    return;
  }

  const simulationOutput = [
    { delay: 500, line: '=====================================================================================' },
    { delay: 300, line: '    ____               ', stage: 'discovery', progress: 10 },
    { delay: 300, line: ' _________  /  _/___  ___  _____' },
    { delay: 300, line: '/ ___/ __ \\ / // __ \\/ _ \\/ ___/' },
    { delay: 300, line: '(__  ) / / // // /_/ /  __/ /' },
    { delay: 300, line: '/____/_/ /_/___/ .___/\\___/_/' },
    { delay: 300, line: '               /_/' },
    { delay: 500, line: '=====================================================================================' },
    { delay: 300, line: '[+] Sn1per Security Scanner v9.0', stage: 'init', progress: 15 },
    { delay: 300, line: '[+] Target: ' + target },
    { delay: 300, line: '[+] Mode: ' + mode },
    { delay: 500, line: '=====================================================================================' },
    { delay: 300, line: '[+] GATHERING DNS INFO', stage: 'dns', progress: 20 },
    { delay: 500, line: '[+] DNS Record: A ' + target + ' -> 192.168.1.1' },
    { delay: 300, line: '[+] DNS Record: MX ' + target + ' -> mail.' + target },
    { delay: 500, line: '=====================================================================================' },
    { delay: 300, line: '[+] RUNNING PORT SCAN', stage: 'portscan', progress: 30 },
    { delay: 500, line: 'Starting Nmap scan...' },
    { delay: 300, line: 'PORT     STATE SERVICE' },
    { delay: 200, line: '22/tcp   open  ssh' },
    { delay: 200, line: '80/tcp   open  http' },
    { delay: 200, line: '443/tcp  open  https' },
    { delay: 200, line: '3306/tcp open  mysql' },
    { delay: 500, line: '=====================================================================================' },
    { delay: 300, line: '[+] RUNNING WEB SCAN', stage: 'webscan', progress: 50 },
    { delay: 300, line: '[+] HTTP Headers:' },
    { delay: 200, line: '  Server: nginx/1.18.0' },
    { delay: 200, line: '  X-Frame-Options: SAMEORIGIN' },
    { delay: 200, line: '  Content-Type: text/html' },
    { delay: 500, line: '[+] Technologies detected:' },
    { delay: 200, line: '  [+] React 18.2.0' },
    { delay: 200, line: '  [+] nginx 1.18.0' },
    { delay: 200, line: '  [+] PHP 8.1' },
    { delay: 500, line: '=====================================================================================' },
    { delay: 300, line: '[+] RUNNING VULNERABILITY SCAN', stage: 'vulnscan', progress: 70 },
    { delay: 300, line: '[+] CVE-2021-44228 - Apache Log4j Remote Code Execution (CRITICAL)' },
    { delay: 200, line: '[+] CVE-2022-22965 - Spring4Shell RCE (HIGH)' },
    { delay: 200, line: '[+] XSS vulnerability detected in search parameter (MEDIUM)' },
    { delay: 200, line: '[+] SSL Certificate expires in 30 days (INFO)' },
    { delay: 500, line: '=====================================================================================' },
    { delay: 300, line: '[+] RUNNING OSINT SCAN', stage: 'osint', progress: 85 },
    { delay: 300, line: '[+] Found 5 email addresses' },
    { delay: 200, line: '[+] Found 3 subdomains' },
    { delay: 200, line: '[+] Found 2 social media profiles' },
    { delay: 500, line: '=====================================================================================' },
    { delay: 300, line: '[+] SCAN COMPLETE', stage: 'complete', progress: 100 },
    { delay: 200, line: '[+] Total vulnerabilities found: 4' },
    { delay: 200, line: '[+] Critical: 1 | High: 1 | Medium: 1 | Info: 1' },
    { delay: 500, line: '=====================================================================================' },
  ];

  let lineCount = 0;
  
  for (const item of simulationOutput) {
    if (isClosed) {
      console.log('[SCAN API] Simulation stopped - stream closed');
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, item.delay));
    
    if (isClosed) return;
    
    lineCount++;
    
    if (!sendEvent({ 
      type: 'output', 
      line: item.line,
      lineNumber: lineCount,
      timestamp: new Date().toISOString()
    })) {
      return;
    }
    
    if (item.stage && item.progress !== undefined) {
      if (!sendEvent({ 
        type: 'status', 
        stage: item.stage,
        progress: item.progress,
        message: item.line,
        timestamp: new Date().toISOString()
      })) {
        return;
      }
    }
  }

  if (!isClosed) {
    sendEvent({ 
      type: 'complete', 
      code: 0, 
      target,
      totalLines: lineCount,
      timestamp: new Date().toISOString(),
      simulation: true
    });
    
    try {
      controller.close();
    } catch (e) {
      // Controller already closed
    }
  }
}

export async function POST(request: NextRequest) {
  console.log('[SCAN API] Received scan request');
  
  try {
    const body = await request.json();
    const { target, mode = 'normal', type = 'webapp', debug = false } = body;

    console.log('[SCAN API] Target:', target, 'Mode:', mode, 'Type:', type, 'Debug:', debug);

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
    
    // Check if we can run sniper (needs sudo without password)
    const canRunSniper = await checkSniperAccess();
    console.log('[SCAN API] Can run sniper:', canRunSniper);
    
    // Use simulation mode if sniper can't be run or debug is requested
    const useSimulation = debug || !canRunSniper;
    
    console.log('[SCAN API] Using simulation:', useSimulation);

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

        if (useSimulation) {
          console.log('[SCAN API] Running simulation scan');
          await runSimulationScan(target, mode, controller, encoder);
          return;
        }

        console.log('[SCAN API] Starting real sniper scan');
        sendEvent({ type: 'start', target, mode, timestamp: new Date().toISOString() });

        const { spawn } = await import('child_process');
        
        const args = getModeArgs(mode, target);
        console.log('[SCAN API] Spawn args:', args);

        const sniper = spawn('sudo', [SNIPER_PATH, ...args], {
          env: { ...process.env, TERM: 'xterm' },
        });

        let outputBuffer: string[] = [];
        let lineCount = 0;

        sniper.stdout.on('data', (data: Buffer) => {
          if (isClosed) return;
          const text = data.toString();
          console.log('[SCAN API] stdout:', text.substring(0, 200));
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.trim()) {
              lineCount++;
              outputBuffer.push(line);
              
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
              line: 'Failed to start sniper: ' + err.message,
              timestamp: new Date().toISOString()
            });
            
            sendEvent({ 
              type: 'output',
              line: '[!] Falling back to simulation mode...',
              timestamp: new Date().toISOString()
            });
            runSimulationScan(target, mode, controller, encoder);
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

async function checkSniperAccess(): Promise<boolean> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  try {
    // Check if we can run sudo sniper without password
    await execAsync('sudo -n ' + SNIPER_PATH + ' -h 2>&1', { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}
