import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const LOOT_BASE_PATH = process.env.WORKSPACE_PATH || process.env.LOOT_PATH ? 
  path.join(process.env.LOOT_PATH || '/usr/share/sniper/loot', 'workspace') : 
  '/usr/share/sniper/loot/workspace';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const workspace = searchParams.get('workspace');
  const filename = searchParams.get('filename');

  if (!workspace || !filename) {
    return NextResponse.json({ error: 'Workspace and filename are required' }, { status: 400 });
  }

  const screenshotPath = path.join(LOOT_BASE_PATH, workspace, 'screenshots', filename);

  try {
    const fileBuffer = await fs.readFile(screenshotPath);
    const ext = path.extname(filename).toLowerCase();
    
    const contentType: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
  }
}
