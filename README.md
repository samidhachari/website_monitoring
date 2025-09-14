Website Monitoring Dashboard

A modern, full-stack website monitoring application built with Next.js 15 and Supabase. Monitor your websites with automated screenshots, health checks, SSL certificate validation, and response time tracking.

Features

URL Management
- Add and remove website URLs with validation
- Import URLs from CSV files for bulk operations
- Export URLs to CSV files for backup
- Smart URL formatting (automatically adds https://)
- Duplicate URL prevention

Screenshot Monitoring
- Automated website screenshots using Playwright
- Real-time website health status monitoring
- SSL certificate validation with expiry tracking
- Response time monitoring and performance metrics
- Visual website preview gallery (4 per row)
- Clickable full-size image viewer with modal
- Status indicators (Online/Offline/Error)

SSL Certificate Monitoring
- SSL certificate expiry date tracking
- Days remaining until certificate expires
- SSL certificate issue date information
- Color-coded warnings for expiring certificates:
  - 🟢 Green: >30 days remaining
  - 🟡 Yellow: 7-30 days remaining
  - 🔴 Red: <7 days or expired
- Enhanced SSL validation for better accuracy

User Interface
- Beautiful lavender/purple-themed design
- Dark mode support with automatic detection
- Fully responsive design for all devices
- Professional dashboard layout with cards
- Real-time status indicators and error handling
- Comprehensive error boundaries

Getting Started

Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Playwright dependencies (automatically installed)

Installation

1. Clone the repository:
```bash
git clone https://github.com/samidhachari/website_monitoring.git
cd Website_Monitoring
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create `.env.local` file and add your Supabase credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up Supabase database:
Run the SQL commands from `supabase-setup.sql` in your Supabase SQL editor:
```sql
CREATE TABLE websites (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

5. Install Playwright browsers:
```bash
npx playwright install chromium
```

6. Start the development server:
```bash
npm run dev
```

7. Open your browser:
Navigate to `http://localhost:3001`

Project Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout with error boundary
│   ├── page.tsx             # Homepage dashboard
│   ├── urls/
│   │   └── page.tsx         # URL management interface
│   ├── screenshots/
│   │   └── page.tsx         # Screenshot monitoring dashboard
│   ├── setup/
│   │   └── page.tsx         # Setup guide and instructions
│   ├── api/
│   │   └── screenshot/
│   │       └── route.ts     # Screenshot generation API
│   ├── error.tsx            # Global error page
│   └── loading.tsx          # Global loading component
├── lib/
│   └── supabase.ts          # Database client with configuration
├── components/
│   └── ErrorBoundary.tsx    # Error boundary component
└── public/
    └── screenshots/         # Generated screenshot storage
```

Tech Stack

Frontend
- Framework: Next.js 15 with App Router
- UI Library: React 19 with TypeScript
- Styling: Tailwind CSS v4 with inline theme configuration
- Icons: Lucide React for consistent iconography
- Fonts: Geist Sans and Geist Mono

Backend & Database
- Database: Supabase (PostgreSQL) with real-time API
- API Routes: Next.js 15 API routes with enhanced error handling
- Authentication: Supabase Auth (ready for future implementation)

Automation & Monitoring
- Screenshot Engine:** Playwright with Chromium
- SSL Monitoring: Node.js TLS module for certificate inspection
- CSV Processing: PapaParse for import/export functionality
- HTTP Monitoring: Enhanced fetch with comprehensive headers

Database Schema

```sql
-- Main websites table
CREATE TABLE websites (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Row Level Security
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;

-- Optional: Indexes for better performance
CREATE INDEX idx_websites_created_at ON websites(created_at DESC);
CREATE UNIQUE INDEX idx_websites_url ON websites(url);
```

Usage Guide

Add Websites
- Navigate to Manage URLs from the homepage
- Enter website URLs (http/https optional - automatically formatted)
- Use Import from CSV for bulk additions
- Export your URL list with Export to CSV

Generate Screenshots
- Go to View Screenshots page
- Click Generate Screenshots to capture all websites
- View real-time processing status for each site
- Screenshots automatically save to `public/screenshots/`

Monitor Website Health
- Check Status: Online (green) / Offline (red) / Error (orange)
- View SSL Information: Certificate expiry and validity
- Monitor Response Times: Server response performance
- Click screenshots for full-size preview

SSL Certificate Monitoring
- View certificate expiry dates
- Monitor days remaining until expiration
- Get color-coded warnings for certificates nearing expiry
- Track certificate issue dates

Configuration & Customization

Environment Variables
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional (for future features)
NEXT_PUBLIC_SUPABASE_SERVICE_KEY=your-service-key
```

Supabase Setup Steps
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your URL and keys
3. Navigate to SQL Editor and run the commands from `supabase-setup.sql`
4. Update your `.env.local` file with the credentials
5. Restart your development server

Customization Options
- Theme Colors: Modify Tailwind configuration in `globals.css`
- Screenshot Settings: Adjust viewport size and timeout in `route.ts`
- SSL Timeout: Modify SSL check timeout (default: 5 seconds)
- Monitoring Frequency: Customize how often to check websites

Troubleshooting

Common Issues

Screenshots not generating:
- Ensure Playwright is installed: `npx playwright install chromium`
- Check if websites block automated browsers
- Verify the `public/screenshots/` directory exists

SSL monitoring showing invalid:
- Some sites have strict SSL configurations
- Certificate info only works for HTTPS sites
- Firewall might block TLS connections

Supabase connection errors:
- Verify environment variables are correct
- Check if Supabase project is active
- Ensure database table exists

405 API errors:
- Make sure `route.ts` file is complete
- Restart development server
- Check if API route is properly exported

Development Commands
```bash
# Check for errors
npm run lint

# Build for production
npm run build

# Start production server
npm run start

# Install missing dependencies
npm install
```

Performance & Optimization

- Sequential Processing: Screenshots are generated one by one to prevent system overload
- Smart Caching: Tailwind CSS optimized for production builds
- Error Boundaries: Comprehensive error handling prevents app crashes
- Responsive Images: Optimized screenshot display with Next.js Image component
- Graceful Degradation: App works even without Supabase configuration



