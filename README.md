# BYOS Next.js for TRMNL 🖥️

[![License](https://img.shields.io/github/license/ghcpuman902/byos-nextjs)](https://github.com/ghcpuman902/byos-nextjs/blob/main/LICENSE)
[![Vercel Deployment](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fghcpuman902%2Fbyos-nextjs)

## 📖 Table of Contents
- [Overview](#-overview)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [How It Works](#-how-does-it-work)
- [Installation](#-installation)
- [Usage](#-usage)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [Community](#-community)

## 🚀 Overview

**BYOS (Build Your Own Server)** is a community-maintained library for the TRMNL device, designed to provide a flexible and customizable server solution. This Next.js implementation offers a robust, modern approach to device management and display generation.

## ✨ Features

- 🔧 Customizable device management
- 🖼️ Dynamic screen generation
- 🚀 Easy deployment to Vercel
- 📊 Comprehensive logging system
- 🔒 Secure API key management
- 💻 Modern tech stack (Next.js 15, React 19, Tailwind CSS v4)
- ⚠️ Using a canary version of Shadcn for Tailwind v4 support; be cautious with AI-generated code.

## 🏁 Quick Start

### Option 1: Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fghcpuman902%2Fbyos-nextjs&project-name=byos-nextjs&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D)

1. Click the Vercel deployment button
2. Link a free Supabase database
3. Follow the deployment instructions
4. Obtain your server base URL

note: once setup, sync env var to your local development by:
1. go to https://supabase.com/dashboard/project/[project-ref]/settings/integrations
2. if not linked already, link your supabase project to vercel
3. under Vercel Integration, find "manage", turn on "preview" and "development", and then "Resync environment variables"
4. now using `vercel link` and `vercel env pull`, you should see these env vars in your local `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
POSTGRES_DATABASE
POSTGRES_HOST
POSTGRES_PASSWORD
POSTGRES_PRISMA_URL
POSTGRES_URL
POSTGRES_URL_NON_POOLING
POSTGRES_USER
SUPABASE_ANON_KEY
SUPABASE_JWT_SECRET
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
```

### Option 2: Local Development Setup

#### Prerequisites
- Node.js (v20 or later)
- pnpm or npm or yarn
- Git

#### Installation Steps
```bash
# Clone the repository
git clone https://github.com/ghcpuman902/byos-nextjs
cd byos-nextjs

# Install dependencies
pnpm install # or npm install or yarn install
```
set up a superbase account, add these 2 env vars:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
you will need to manually initialize the database tables, run the following command in your supabasae SQL editor:
```sql
-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Devices Table
CREATE TABLE public.devices (
    id BIGSERIAL PRIMARY KEY,
    friendly_id VARCHAR NOT NULL UNIQUE,
    name VARCHAR NOT NULL,
    mac_address VARCHAR NOT NULL UNIQUE,
    api_key VARCHAR NOT NULL UNIQUE,
    screen VARCHAR NULL DEFAULT NULL,
    refresh_schedule JSONB NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    last_update_time TIMESTAMPTZ NULL,
    next_expected_update TIMESTAMPTZ NULL,
    last_refresh_duration INTEGER NULL,
    battery_voltage NUMERIC NULL,
    firmware_version TEXT NULL,
    rssi INTEGER NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Devices
CREATE INDEX idx_devices_refresh_schedule ON public.devices USING GIN (refresh_schedule);

-- Logs Table
CREATE TABLE public.logs (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT NOT NULL,
    friendly_id TEXT NULL,
    log_data TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT logs_friendly_id_fkey FOREIGN KEY (friendly_id) REFERENCES public.devices (friendly_id)
);

-- System Logs Table
CREATE TABLE public.system_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    level VARCHAR NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR NULL,
    metadata TEXT NULL,
    trace TEXT NULL
);

-- Indexes for System Logs
CREATE INDEX idx_system_logs_created_at ON public.system_logs (created_at);
CREATE INDEX idx_system_logs_level ON public.system_logs (level);
```


then run the following command to start the development server:
```bash
# Start development server
pnpm run dev # or npm run dev or yarn run dev
```

### Important Note
When dealing with AI-generated code, be aware that Tailwind v4 has some slightly different syntax compared to previous versions.
when adding shadcn new componenet, use the following command:
```bash
pnpm dlx shadcn@canary add [component1] [component2] [component3]
```

## 🔍 How Does It Work?

### 1. Device Interaction Endpoints

The BYOS architecture provides three main endpoints that devices interact with:

#### Setup Endpoint (`/api/setup`)
- **Purpose**: Device registration and API key generation
- **When Used**: Only called when a device is reset or does not have an API key stored
- **Request Flow**:
  - Device sends MAC address in request headers
  - Server checks if device exists in database
  - If new, generates unique API key and friendly device ID
  - Returns API key to device for future authentication

```bash
curl -X GET http://[YOUR BASE URL]/api/setup \
-H "Content-Type: application/json" \
-H "ID: 12:34:56:78:9A:BC"
```

**Response Example**:
```json
{
   "status": 200,
   "api_key": "uniqueApiKeyGenerated",
   "friendly_id": "DEVICE_ABC123",
   "message": "Device successfully registered"
}
```

#### Display Endpoint (`/api/display`)
- **Purpose**: Primary endpoint for screen content delivery
- **When Used**: Called repeatedly by the device after setup to get new screens
- **Key Functions**:
  1. Provides the URL for the next screen to display
  2. Specifies how long the device should sleep before requesting again
  3. Can optionally signal firmware reset/update requirements
  
```bash
curl -X GET http://[YOUR BASE URL]/api/display \
-H "Content-Type: application/json" \
-H "ID: 12:34:56:78:9A:BC" \
-H "Access-Token: uniqueApiKey"
```

**Response Example**:
```json
{
   "status": 0,
   "image_url": "https://your-base-url/api/bitmap/DEVICE_ID_TIMESTAMP.bmp",
   "filename": "DEVICE_ID_TIMESTAMP.bmp",
   "refresh_rate": 180,
   "reset_firmware": false,
   "update_firmware": false
}
```

> **Note**: While the official TRMNL implementation also supports configuring button functionality, this implementation does not currently handle those features.

#### Log Endpoint (`/api/log`)
- **Purpose**: Error and issue reporting
- **When Used**: Only called when errors or issues occur on the device
- **Behavior**: Logs are stored in the Supabase database for troubleshooting

### 2. Screen Generation Approach

Unlike the official Ruby/Python implementations which pre-generate screens, this Next.js implementation:

- **Generates screens on-demand**: When a device requests a display update
- **Leverages Next.js caching**: Uses built-in caching mechanisms for performance
- **Dynamic BMP generation**: The bitmap URL is not a static file but a dynamic API endpoint
- **Efficient revalidation**: 
  - First request may take longer to generate the screen
  - Subsequent requests are served from cache while revalidating in the background
  - This approach provides both speed and fresh content

#### Technical Specifications
- **Image Format**: 800x480 pixel 1-bit bitmap (.bmp)
- **Rendering**: Uses Satori for dynamic image generation
Rendering pipeline:
JSX component -> pre-satori wrapper -> satori (svg) -> vercel image response (png) -> jimp (bmp) -> fixed header to fit TRMNL display

- **Caching Strategy**: 60-second revalidation window

### 3. Authentication Considerations

**Important**: This implementation does not include a comprehensive authentication system.

- **No user management**: Unlike some official implementations, there is no built-in user field in the database
- **Basic device authentication**: Only verifies device MAC address and API key
- **Production deployment recommendations**:
  - Implement your own authentication layer (e.g., NextAuth, SupabaseAuth)
  - Use middleware for request validation
  - Update the database schema to include user management if needed
  - Consider rate limiting and other security measures

## 🧪 Examples

The project includes an examples section that allows you to visualize and test components in both their direct rendering and bitmap (BMP) rendering forms. This is designed to help develop and test components for e-ink displays.

### How Examples Work

visit `[base url]/examples` to view the examples page.

To set up your own screen example, you can use the following structure:

1. Create your component folder in the `app/examples/screens` directory following any of the existing examples.
2. Add your component and data fetching logic
3. Add an entry to `app/examples/screens.json`

Each screen is defined in `app/examples/screens.json` and can be accessed via its slug.

This allows you to code and preview before pointing your device to any of the screens.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on:
- Reporting bugs
- Suggesting features
- Submitting pull requests

### Ways to Contribute
- Report issues on GitHub
- Submit pull requests
- Improve documentation
- Share use cases and feedback

## 🌐 Community

- 📢 [GitHub Discussions](https://github.com/usetrmnl/byos_nextjs/discussions)
- 🐦 [Twitter @usetrmnl](https://twitter.com/usetrmnl)
- 💬 Join our community channels

## 📚 Learn More
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TRMNL Device Website](https://usetrmnl.com)

## 📄 License

This project is open-source and available under the MIT License.

---

**Happy Coding! 🚀**






