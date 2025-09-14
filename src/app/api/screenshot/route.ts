

import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { Website } from '@/lib/supabase';
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
  } catch (err: any) {
    return { status: 'error', error_message: err.message };
  }
}

async function takeScreenshot(url: string, id: number): Promise<string | null> {
  let browser;
  try {
    browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });

    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch {
      return null;
    }

    const filename = `screenshot_${id}_${Date.now()}.jpeg`;

    // Save to Downloads
    const downloadsFile = path.join(downloadsDir, filename);
    // Save to public/screenshots
    const publicFile = path.join(publicDir, filename);

    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.screenshot({ path: downloadsFile, quality: 75, type: 'jpeg' });
    await page.screenshot({ path: publicFile, quality: 75, type: 'jpeg' });

    // Return public URL (so frontend can access it)
    return `/screenshots/${filename}`;
  } catch {
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}



// export async function POST(req: NextRequest) {
//   try {
//     const { websites } = await req.json();
//     if (!websites || !Array.isArray(websites)) {
//       return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
//     }

//     const results: ScreenshotResult[] = [];

//     for (const website of websites) {
//       const statusCheck = await checkWebsiteStatus(website.url);
//       const sslInfo = await getSSLCertificateInfo(website.url);

//       let screenshot_path: string | undefined = undefined;
//       if (statusCheck.status !== 'error') {
//         screenshot_path = (await takeScreenshot(website.url, website.id)) || undefined;
//       }

//       let finalStatus = statusCheck.status;
//       if (screenshot_path && statusCheck.status !== 'up') {
//         finalStatus = 'up';
//       }

//       let finalSSLValid = sslInfo.ssl_valid;
//       if (!finalSSLValid && screenshot_path && website.url.startsWith('https://')) {
//         finalSSLValid = true;
//       }

//       const result: ScreenshotResult = {
//         id: website.id,
//         url: website.url,
//         screenshot_path, // always points to /screenshots/...
//         status: finalStatus,
//         ssl_valid: finalSSLValid,
//         ssl_expires: sslInfo.ssl_expires,
//         ssl_days_remaining: sslInfo.ssl_days_remaining,
//         ssl_issued_date: sslInfo.ssl_issued_date,
//         response_time: statusCheck.response_time,
//         error_message: screenshot_path ? undefined : statusCheck.error_message,
//       };

//       results.push(result);
//     }

//     return NextResponse.json(results);
//   } catch (error) {
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }

export async function POST(req: NextRequest) {
  try {
    // ✅ Explicitly check if request method is POST
    if (req.method !== "POST") {
      return NextResponse.json(
        { error: "Method Not Allowed. Use POST." },
        { status: 405 }
      );
    }

    const body = await req.json();
    const { websites } = body;

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

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error("❌ API Error in /api/screenshot:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

