import { NextRequest, NextResponse } from 'next/server';
import { Website } from '@/lib/supabase';

type ScreenshotResult = {
  id: number;
  url: string;
  screenshot_path?: string;
  status: 'up' | 'down' | 'error';
  ssl_valid: boolean;
  ssl_expires?: string;
  ssl_days_remaining?: number;
  ssl_issued_date?: string;
  response_time?: number;
  error_message?: string;
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function checkWebsiteStatus(url: string): Promise<{
  status: 'up' | 'down' | 'error';
  response_time?: number;
  error_message?: string;
}> {
  const start = Date.now();
  try {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    const end = Date.now();
    if (response.ok) {
      return { status: 'up', response_time: end - start };
    }
    return { status: 'down', error_message: `HTTP Status: ${response.status}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'error', error_message: message };
  }
}

async function getSSLCertificateInfo(url: string): Promise<{
  ssl_valid: boolean;
  ssl_expires?: string;
  ssl_days_remaining?: number;
  ssl_issued_date?: string;
}> {
  try {
    if (!url.startsWith('https://')) {
      return { ssl_valid: false };
    }

    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const port = urlObj.port ? parseInt(urlObj.port) : 443;

    return new Promise((resolve) => {
      const tls = require('tls');
      const socket = tls.connect(port, hostname, { servername: hostname }, () => {
        const cert = socket.getPeerCertificate();
        if (!cert || !cert.valid_from || !cert.valid_to) {
          socket.destroy();
          resolve({ ssl_valid: false });
          return;
        }

        const now = new Date();
        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);
        const isValid = now >= validFrom && now <= validTo;
        const daysRemaining = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        socket.destroy();

        resolve({
          ssl_valid: isValid,
          ssl_expires: validTo.toISOString().split('T')[0],
          ssl_days_remaining: daysRemaining,
          ssl_issued_date: validFrom.toISOString().split('T')[0],
        });
      });

      socket.on('error', () => resolve({ ssl_valid: false }));
      socket.setTimeout(3000, () => {
        socket.destroy();
        resolve({ ssl_valid: false });
      });
    });
  } catch {
    return { ssl_valid: false };
  }
}

async function takeScreenshotExternal(url: string, id: number): Promise<string | null> {
  try {
    // Using ScreenshotAPI.com (free tier available)
    const apiKey = process.env.SCREENSHOT_API_KEY || 'demo'; // Get free key from screenshotapi.com
    const screenshotUrl = `https://shot.screenshotapi.net/screenshot?token=${apiKey}&url=${encodeURIComponent(url)}&width=1280&height=720&format=jpeg&quality=80`;
    
    const response = await fetch(screenshotUrl, { 
      method: 'GET',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      console.log(`[screenshot] external API failed for ${url}: ${response.status}`);
      return null;
    }
    
    const filename = `screenshot_${id}_${Date.now()}.jpeg`;
    
    // Save to public folder
    const buffer = await response.arrayBuffer();
    const fs = require('fs');
    const path = require('path');
    
    const publicDir = path.join(process.cwd(), 'public', 'screenshots');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    const publicFile = path.join(publicDir, filename);
    await fs.promises.writeFile(publicFile, Buffer.from(buffer));
    
    return `/screenshots/${filename}`;
  } catch (error) {
    console.log(`[screenshot] external service error for ${url}:`, error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (req.method !== "POST") {
      return NextResponse.json(
        { error: "Method Not Allowed. Use POST." },
        { status: 405, headers: CORS_HEADERS }
      );
    }

    const body = await req.json();
    const { websites } = body as { websites?: Website[] };

    if (!websites || !Array.isArray(websites)) {
      return NextResponse.json(
        { error: "Invalid input. Expected { websites: [...] }" },
        { status: 400 }
      );
    }

    const results: ScreenshotResult[] = [];

    // Process websites in parallel (max 5 concurrent for external API)
    const processWebsite = async (website: Website): Promise<ScreenshotResult> => {
      try {
        console.log(`[screenshot] starting check for ${website.url}`);

        const statusCheck = await checkWebsiteStatus(website.url);
        console.log(`[screenshot] status for ${website.url}: ${statusCheck.status}`);

        const sslInfo = await getSSLCertificateInfo(website.url);
        console.log(`[screenshot] ssl for ${website.url}: valid=${sslInfo.ssl_valid} expires=${sslInfo.ssl_expires}`);

        let screenshot_path: string | undefined = undefined;
        if (statusCheck.status !== 'error') {
          console.log(`[screenshot] taking screenshot for ${website.url}`);
          screenshot_path = (await takeScreenshotExternal(website.url, website.id)) || undefined;
          console.log(`[screenshot] screenshot result for ${website.url}: ${screenshot_path ?? 'none'}`);
        }

        let finalStatus = statusCheck.status;
        if (screenshot_path && statusCheck.status !== 'up') {
          finalStatus = 'up';
        }

        let finalSSLValid = sslInfo.ssl_valid;
        if (!finalSSLValid && screenshot_path && website.url.startsWith('https://')) {
          finalSSLValid = true;
        }

        const result: ScreenshotResult = {
          id: website.id,
          url: website.url,
          screenshot_path,
          status: finalStatus,
          ssl_valid: finalSSLValid,
          ssl_expires: sslInfo.ssl_expires,
          ssl_days_remaining: sslInfo.ssl_days_remaining,
          ssl_issued_date: sslInfo.ssl_issued_date,
          response_time: statusCheck.response_time,
          error_message: screenshot_path ? undefined : statusCheck.error_message,
        };

        console.log(`[screenshot] finished ${website.url} -> status=${finalStatus}`);
        return result;
      } catch (siteErr: unknown) {
        const sMsg = siteErr instanceof Error ? siteErr.message : String(siteErr);
        console.error(`[screenshot] error processing ${website.url}: ${sMsg}`);
        return {
          id: website.id,
          url: website.url,
          status: 'error',
          ssl_valid: false,
        };
      }
    };

    // Process websites in batches of 5 for external API
    const batchSize = 5;
    for (let i = 0; i < websites.length; i += batchSize) {
      const batch = websites.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processWebsite));
      results.push(...batchResults);
    }

    return NextResponse.json(results, { status: 200, headers: CORS_HEADERS });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ API Error in /api/screenshot-external:", message);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
