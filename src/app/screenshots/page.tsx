



'use client';

import { useState, useEffect } from 'react';
import { supabase, Website } from '@/lib/supabase';
import { Camera, ArrowLeft, Globe, AlertCircle, CheckCircle, XCircle, Clock, Shield, ShieldAlert, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type ScreenshotStatus = {
  id: number;
  url: string;
  screenshot_path?: string;
  status: 'up' | 'down' | 'error' | 'checking';
  ssl_valid: boolean;
  ssl_expires?: string;
  ssl_days_remaining?: number;
  ssl_issued_date?: string;
  response_time?: number;
  error_message?: string;
};

export default function ScreenshotsPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [screenshots, setScreenshots] = useState<ScreenshotStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<ScreenshotStatus | null>(null);

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    try {
      const { data, error } = await supabase
        .from('websites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebsites(data || []);
      // Initialize screenshot status
      setScreenshots(
        (data || []).map((site) => ({
          ...site,
          status: 'checking',
          ssl_valid: false,
        }))
      );
    } catch (err) {
      console.error('Error fetching websites:', err);
      setError('Failed to load websites. Please check your Supabase connection and tables.');
    }
  };

    const runScreenshotCheck = async () => {
    if (websites.length === 0) {
      setError('No websites to check. Please add some first.');
      return;
    }

    setLoading(true);
    setSuccess('');
    setError('');
    setScreenshots(
      websites.map((site) => ({
        ...site,
        status: 'checking',
        ssl_valid: false,
      }))
    );

    try {
      const results: ScreenshotStatus[] = [];

      // ✅ Process one website at a time to avoid Vercel timeouts
        for (const site of websites) {
              try {
                const res = await fetch('/api/screenshot', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ websites: [site] }), // send single site
                });

                if (!res.ok) {
                  let text = '';
                  try {
                    text = await res.text();
                  } catch {}
                  throw new Error(`API error ${res.status}: ${text || res.statusText}`);
                }

                const [result] = await res.json(); // backend returns an array
          results.push(result);

          // Update UI incrementally
          setScreenshots((prev) =>
            prev.map((item) => (item.id === site.id ? result : item))
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Error checking ${site.url}:`, message);
          results.push({
            id: site.id,
            url: site.url,
            status: 'error',
            ssl_valid: false,
            error_message: message,
          });
        }
      }

      setSuccess('All website checks completed!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error running check:', message);
      setError(`Failed to run check: ${message}`);
    } finally {
      setLoading(false);
    }
  };


  const getStatusIcon = (status: 'up' | 'down' | 'error' | 'checking') => {
    switch (status) {
      case 'up':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'checking':
        return <Clock className="w-5 h-5 text-gray-500" />;
      default:
        return null;
    }
  };

  const getSSLIcon = (sslValid: boolean, daysRemaining: number | undefined) => {
    if (!sslValid) {
      return <ShieldAlert className="w-5 h-5 text-red-500" />;
    }
    if (daysRemaining !== undefined && daysRemaining < 30) {
      return <ShieldAlert className="w-5 h-5 text-yellow-500" />;
    }
    return <Shield className="w-5 h-5 text-green-500" />;
  };
  
  const getSSLText = (sslValid: boolean, daysRemaining: number | undefined) => {
    if (!sslValid) {
      return 'Invalid or Expired';
    }
    if (daysRemaining !== undefined) {
      if (daysRemaining <= 0) {
        return 'Expired';
      }
      return `${daysRemaining} days remaining`;
    }
    return 'Valid';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="text-sm">Back to Home</span>
            </Link>
          </div>

          <div className="text-center mb-12">
            <Camera className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Website Monitoring Dashboard
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Run a health check and generate screenshots for your URLs.
            </p>
          </div>

          {/* Action Button */}
          <div className="flex justify-center mb-12">
            <button
              onClick={runScreenshotCheck}
              className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                loading
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105'
              }`}
              disabled={loading}
            >
              <Camera className={`w-5 h-5 mr-2 ${loading ? 'animate-pulse' : ''}`} />
              {loading ? 'Checking...' : 'Run All Checks'}
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-6 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
              <span className="block sm:inline">{success}</span>
            </div>
          )}

            {/* Screenshot Gallery */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {screenshots.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-all w-[260px]"
                >
                  {/* Image or Placeholder */}
                  <div className="relative w-full h-40 bg-gray-200 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                    {item.screenshot_path ? (
                      <div
                        onClick={() => setSelectedScreenshot(item)}
                        className="cursor-pointer w-full h-full"
                      >
                        <Image
                          src={item.screenshot_path}
                          alt={`Screenshot of ${item.url}`}
                          width={260}
                          height={160}
                          className="w-full h-full object-cover"
                          priority={index < 4} // Prioritize first few images
                        />
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400 text-center p-4 text-xs">
                        <p>No screenshot available</p>
                        <p className="text-[10px] mt-1">{item.error_message}</p>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-3 flex-1 flex flex-col justify-between text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Globe className="w-3 h-3 text-gray-500" />
                        <p className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">
                          {item.url}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 text-gray-600 dark:text-gray-400">
                      <div className="flex items-center">
                        {getStatusIcon(item.status)}
                        <span className="ml-1">Status: {item.status}</span>
                      </div>
                      {item.response_time !== undefined && (
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="ml-1">RT: {item.response_time} ms</span>
                        </div>
                      )}
                      {item.ssl_expires && (
                        <div className="flex items-center">
                          {getSSLIcon(item.ssl_valid, item.ssl_days_remaining)}
                          <span className="ml-1">SSL: {getSSLText(item.ssl_valid, item.ssl_days_remaining)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal for selected screenshot */}
            {selectedScreenshot && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-3xl w-full mx-4 overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
                    <p className="text-sm font-medium">{selectedScreenshot.url}</p>
                    <div className="flex items-center space-x-2">
                      <a
                        href={selectedScreenshot.screenshot_path}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-300 flex items-center"
                      >
                        <ExternalLink className="w-5 h-5" />
                        <span className="sr-only">Open screenshot in new tab</span>
                      </a>
                      <button
                        onClick={() => setSelectedScreenshot(null)}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-300"
                        aria-label="Close"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    {selectedScreenshot.screenshot_path ? (
                      <Image
                        src={selectedScreenshot.screenshot_path}
                        alt={`Screenshot of ${selectedScreenshot.url}`}
                        width={1024}
                        height={600}
                        className="max-w-full h-auto rounded"
                      />
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-300 p-6">No screenshot available</p>
                    )}
                  </div>
                </div>
              </div>
            )}


        </div>
      </div>
    </div>
  );
}


