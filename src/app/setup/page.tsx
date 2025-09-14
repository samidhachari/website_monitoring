

import Link from 'next/link';
import { AlertCircle, ExternalLink, Database } from 'lucide-react';

export default function SupabaseSetupGuide() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <AlertCircle className="w-16 h-16 text-purple-500" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Supabase Configuration Required
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Please set up your Supabase database to use this application
            </p>
          </div>

          {/* Setup Steps */}
          <div className="space-y-8">
            {/* Step 1 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                  1
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Create a Supabase Project
                </h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Go to the Supabase dashboard and create a new project.
              </p>
              <a
                href="https://supabase.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              >
                Go to Supabase
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </div>

            {/* Step 2 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                  2
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Run the SQL Script
                </h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                In your Supabase project, navigate to the SQL Editor and run the following script to create the `websites` table.
              </p>
              <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm text-gray-700 dark:text-gray-300">
                <pre>
                  <code>
                    {`
CREATE TABLE IF NOT EXISTS websites (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`}
                  </code>
                </pre>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                  3
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Add Environment Variables
                </h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Create a file named `.env.local` in your project's root directory and add your Supabase credentials.
              </p>
              <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm text-gray-700 dark:text-gray-300">
                <pre>
                  <code>
                    {`
NEXT_PUBLIC_SUPABASE_URL='<YOUR_SUPABASE_URL>'
NEXT_PUBLIC_SUPABASE_ANON_KEY='<YOUR_SUPABASE_ANON_KEY>'
`}
                  </code>
                </pre>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/20 px-4 py-3 mt-4 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Important:</strong> Replace the placeholder values with your actual Supabase credentials.
                  The page will automatically refresh once you save the file.
                </p>
              </div>
            </div>

            {/* Current Status */}
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-8">
              <div className="flex items-center mb-4">
                <Database className="w-6 h-6 text-orange-600 mr-3" />
                <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">
                  Current Configuration Status
                </h3>
              </div>
              <p className="text-orange-700 dark:text-orange-300">
                The application detected that Supabase is not properly configured. 
                Please follow the steps above to set up your database connection.
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="text-center mt-12">
            <Link
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              ← Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
