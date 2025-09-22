

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
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });

    console.debug('[screenshot] browser launched');

    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    try {
      console.debug('[screenshot] navigating to', url);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.debug('[screenshot] navigation finished');
    } catch (navErr: unknown) {
      const navMsg = navErr instanceof Error ? navErr.message : String(navErr);
      console.debug('[screenshot] navigation failed:', navMsg);
      return null;
    }

    const filename = `screenshot_${id}_${Date.now()}.jpeg`;

    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Capture as buffer so we can upload to Supabase Storage or write to disk as fallback
    const buffer = await page.screenshot({ type: 'jpeg', quality: 75 }) as Buffer;

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

    for (const website of websites) {
      const statusCheck = await checkWebsiteStatus(website.url);
      const sslInfo = await getSSLCertificateInfo(website.url);

      let screenshot_path: string | undefined = undefined;
      if (statusCheck.status !== "error") {
        screenshot_path =
          (await takeScreenshot(website.url, website.id)) || undefined;
      }

      let finalStatus = statusCheck.status;
      if (screenshot_path && statusCheck.status !== "up") {
        finalStatus = "up";
      }

      let finalSSLValid = sslInfo.ssl_valid;
      if (!finalSSLValid && screenshot_path && website.url.startsWith("https://")) {
        finalSSLValid = true;
      }

      const result: ScreenshotResult = {
        id: website.id,
        url: website.url,
        screenshot_path, // always points to /screenshots/... or downloads
        status: finalStatus,
        ssl_valid: finalSSLValid,
        ssl_expires: sslInfo.ssl_expires,
        ssl_days_remaining: sslInfo.ssl_days_remaining,
        ssl_issued_date: sslInfo.ssl_issued_date,
        response_time: statusCheck.response_time,
        error_message: screenshot_path ? undefined : statusCheck.error_message,
      };

      results.push(result);
    }

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

