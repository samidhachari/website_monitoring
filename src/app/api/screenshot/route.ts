

import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { Website } from '@/lib/supabase';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import tls from 'tls';
import os from 'os';

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

// 📂 Create Downloads/temp folder
const downloadsDir = path.join(os.homedir(), 'Downloads', 'website_screenshots');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// 📂 Create public/screenshots folder
const publicDir = path.join(process.cwd(), 'public', 'screenshots');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
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
      socket.setTimeout(5000, () => {
        socket.destroy();
        resolve({ ssl_valid: false });
      });
    });
  } catch {
    return { ssl_valid: false };
  }
}

async function checkWebsiteStatus(url: string): Promise<{
  status: 'up' | 'down' | 'error';
  response_time?: number;
  error_message?: string;
}> {
  const start = Date.now();
  try {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
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

async function takeScreenshot(url: string, id: number): Promise<string | null> {
  let browser;
  try {
    console.debug('[screenshot] launching browser');
    browser = await chromium.launch({
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      headless: true,
      timeout: 10000, // 10 second timeout for browser launch
    });

    console.debug('[screenshot] browser launched');

    const context = await browser.newContext({ 
      ignoreHTTPSErrors: true,
      // Reduce viewport size for faster rendering
      viewport: { width: 1024, height: 768 }
    });
    const page = await context.newPage();
    
    // Set shorter timeouts for faster processing
    page.setDefaultTimeout(15000); // 15 seconds max
    page.setDefaultNavigationTimeout(15000);

    try {
      console.debug('[screenshot] navigating to', url);
      // Use 'load' instead of 'domcontentloaded' for faster completion
      await page.goto(url, { waitUntil: 'load', timeout: 15000 });
      console.debug('[screenshot] navigation finished');
    } catch (navErr: unknown) {
      const navMsg = navErr instanceof Error ? navErr.message : String(navErr);
      console.debug('[screenshot] navigation failed:', navMsg);
      return null;
    }

    const filename = `screenshot_${id}_${Date.now()}.jpeg`;

    // Reduce wait time significantly - only wait 2 seconds instead of 8
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
      console.debug('[screenshot] networkidle timeout, proceeding anyway');
    });

    // Capture as buffer with lower quality for faster processing
    const buffer = await page.screenshot({ 
      type: 'jpeg', 
      quality: 60, // Reduced quality for faster processing
      fullPage: false // Only capture viewport, not full page
    }) as Buffer;

    // If Supabase service role key and bucket are configured, upload to storage
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const storageBucket = process.env.SUPABASE_STORAGE_BUCKET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (serviceKey && storageBucket && supabaseUrl) {
      try {
        const supa = createSupabaseClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
        const pathInBucket = `screenshots/${filename}`;
        console.debug('[screenshot] uploading to Supabase storage', pathInBucket);
        const { error: uploadError } = await supa.storage.from(storageBucket).upload(pathInBucket, buffer, { contentType: 'image/jpeg', upsert: false });
        if (uploadError) {
          console.debug('[screenshot] supabase upload error', uploadError.message);
        } else {
          // Construct public URL for public buckets
          const publicUrl = `${supabaseUrl.replace('/api/v1', '')}/storage/v1/object/public/${storageBucket}/${pathInBucket}`;
          return publicUrl;
        }
      } catch (supErr: unknown) {
        const msg = supErr instanceof Error ? supErr.message : String(supErr);
        console.debug('[screenshot] supabase upload failed:', msg);
      }
    }

    // Fallback: write to local Downloads and public folders
    try {
      const downloadsFile = path.join(downloadsDir, filename);
      await fs.promises.writeFile(downloadsFile, buffer);
      console.debug('[screenshot] saved to downloads (fallback)');
    } catch (writeErr: unknown) {
      const writeMsg = writeErr instanceof Error ? writeErr.message : String(writeErr);
      console.debug('[screenshot] failed to write to downloads:', writeMsg);
    }
    try {
      const publicFile = path.join(publicDir, filename);
      await fs.promises.writeFile(publicFile, buffer);
      console.debug('[screenshot] saved to public (fallback)');
    } catch (writeErr: unknown) {
      const writeMsg = writeErr instanceof Error ? writeErr.message : String(writeErr);
      console.debug('[screenshot] failed to write to public:', writeMsg);
    }

    return `/screenshots/${filename}`;
  } catch {
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}


export async function POST(req: NextRequest) {
  try {
    // ✅ Explicitly check if request method is POST
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

    // Progress tracker for logging
    const progress: Record<number, { url: string; status: string }> = {};
    websites.forEach((w) => (progress[w.id] = { url: w.url, status: 'queued' }));

    const startTime = Date.now();
    const logHeartbeat = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const total = websites.length;
      const done = Object.values(progress).filter((p) => p.status !== 'queued' && p.status !== 'processing').length;
      const processing = Object.values(progress).filter((p) => p.status === 'processing').map((p) => p.url);
      console.log(`[screenshot-progress] elapsed=${elapsed}s total=${total} done=${done} processing=${processing.length}`);
      if (processing.length) console.log(`[screenshot-progress] processing: ${processing.join(', ')}`);
    };

    const heartbeat = setInterval(logHeartbeat, 5000);

    // Process websites in parallel for faster execution (max 3 concurrent)
    const processWebsite = async (website: Website): Promise<ScreenshotResult> => {
      try {
        console.log(`[screenshot] starting check for ${website.url}`);
        progress[website.id].status = 'processing';

        const statusCheck = await checkWebsiteStatus(website.url);
        console.log(`[screenshot] status for ${website.url}: ${statusCheck.status}`);

        const sslInfo = await getSSLCertificateInfo(website.url);
        console.log(`[screenshot] ssl for ${website.url}: valid=${sslInfo.ssl_valid} expires=${sslInfo.ssl_expires}`);

        let screenshot_path: string | undefined = undefined;
        if (statusCheck.status !== 'error') {
          console.log(`[screenshot] taking screenshot for ${website.url}`);
          screenshot_path = (await takeScreenshot(website.url, website.id)) || undefined;
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

        progress[website.id].status = 'done';
        console.log(`[screenshot] finished ${website.url} -> status=${finalStatus}`);
        return result;
      } catch (siteErr: unknown) {
        const sMsg = siteErr instanceof Error ? siteErr.message : String(siteErr);
        console.error(`[screenshot] error processing ${website.url}: ${sMsg}`);
        progress[website.id].status = 'error';
        return {
          id: website.id,
          url: website.url,
          status: 'error',
          ssl_valid: false,
        };
      }
    };

    // Process websites in batches of 3 to avoid overwhelming the system
    const batchSize = 3;
    for (let i = 0; i < websites.length; i += batchSize) {
      const batch = websites.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processWebsite));
      results.push(...batchResults);
    }

    clearInterval(heartbeat);
    logHeartbeat();

    return NextResponse.json(results, { status: 200, headers: CORS_HEADERS });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ API Error in /api/screenshot:", message);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

