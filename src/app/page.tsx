
import Link from "next/link";
import { Globe, Monitor, Database, Camera } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Website Monitor Dashboard
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Monitor your websites with screenshots and health checks
          </p>
          <div className="flex items-center justify-center space-x-2 text-gray-500">
            <Globe className="w-5 h-5" />
            <span>Built with Next.js & Supabase</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* URL Management Card */}
          <Link href="/urls" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 group-hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                  <Database className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    URL Management
                  </h2>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Add, remove, and manage your website URLs.
              </p>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                  Import/export CSV
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                  Prevent duplicates
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                  URL validation
                </div>
              </div>
            </div>
          </Link>

          {/* Screenshot Monitoring Card */}
          <Link href="/screenshots" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 group-hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-violet-100 dark:bg-violet-900/20 rounded-full">
                  <Camera className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="ml-4">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Screenshots & Monitoring
                  </h2>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Generate screenshots and check website health status.
              </p>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-violet-400 rounded-full mr-2"></span>
                  Take screenshots
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-violet-400 rounded-full mr-2"></span>
                  Check website status
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-violet-400 rounded-full mr-2"></span>
                  SSL validation
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-4 bg-white dark:bg-gray-800 rounded-lg px-6 py-3 shadow-md">
            <Monitor className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              Professional website monitoring made simple
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}