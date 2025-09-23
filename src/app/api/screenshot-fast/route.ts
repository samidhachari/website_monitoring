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

// Simple fallback: just return status without screenshots
async function getWebsiteInfo(url: string, id: number): Promise<ScreenshotResult> {
  try {
    console.log(`[check] starting check for ${url}`);

    const statusCheck = await checkWebsiteStatus(url);
    console.log(`[check] status for ${url}: ${statusCheck.status}`);

    const sslInfo = await getSSLCertificateInfo(url);
    console.log(`[check] ssl for ${url}: valid=${sslInfo.ssl_valid} expires=${sslInfo.ssl_expires}`);

    const result: ScreenshotResult = {
      id,
      url,
      status: statusCheck.status,
      ssl_valid: sslInfo.ssl_valid,
      ssl_expires: sslInfo.ssl_expires,
      ssl_days_remaining: sslInfo.ssl_days_remaining,
      ssl_issued_date: sslInfo.ssl_issued_date,
      response_time: statusCheck.response_time,
      error_message: statusCheck.error_message,
    };

    console.log(`[check] finished ${url} -> status=${statusCheck.status}`);
    return result;
  } catch (siteErr: unknown) {
    const sMsg = siteErr instanceof Error ? siteErr.message : String(siteErr);
    console.error(`[check] error processing ${url}: ${sMsg}`);
    return {
      id,
      url,
      status: 'error',
      ssl_valid: false,
      error_message: sMsg,
    };
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

    // Process websites in parallel (fast status checks only)
    const batchSize = 10; // Can handle more since no screenshots
    for (let i = 0; i < websites.length; i += batchSize) {
      const batch = websites.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(site => getWebsiteInfo(site.url, site.id)));
      results.push(...batchResults);
    }

    return NextResponse.json(results, { status: 200, headers: CORS_HEADERS });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ API Error in /api/screenshot-fast:", message);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
