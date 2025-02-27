# BYOS Next.js for TRMNL 🖥️

[![License](https://img.shields.io/github/license/usetrmnl/byos-nextjs)](https://github.com/usetrmnl/byos-nextjs/blob/main/LICENSE)
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

### 1. Device Setup Workflow
The device initialization process is a critical part of the BYOS architecture:

#### Request Flow
1. **Initial Contact**: 
   - Device sends MAC address in request headers
   - Endpoint: `/api/setup`
   - Headers include device MAC address

```bash
curl -X GET http://[YOUR BASE URL]/api/setup \
-H "Content-Type: application/json" \
-H "ID: 12:34:56:78:9A:BC"
```

#### Backend Processing
- Checks if device is already registered in Supabase
- Generates unique API key if not existing
- Creates device entry with:
  - MAC address
  - Generated API key
  - Friendly device ID

#### Response Structure
```json
{
   "status": 200,
   "api_key": "uniqueApiKeyGenerated",
   "friendly_id": "DEVICE_ABC123",
   "message": "Device successfully registered"
}
```

### 2. Display Management Architecture

#### Key Components
- **Endpoint**: `/api/display`
- **Authentication**: 
  - MAC address in headers
  - API key for access token
- **Caching Strategy**: 
  - 60-second revalidation window
  - Pre-rendering of images
  - Minimal latency response

#### Request Example
```bash
curl -X GET http://[YOUR BASE URL]/api/display \
-H "Content-Type: application/json" \
-H "ID: 12:34:56:78:9A:BC" \
-H "Access-Token: uniqueApiKey"
```

#### Response Specification
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

### 3. Screen Generation Mechanics

#### Technical Constraints
- **Image Specifications**:
  - Fixed dimensions: 800x480 pixels
  - Bitmap (.bmp) format
  - Strict binary data requirements
- **Rendering Strategy**:
  - Uses Satori for dynamic image generation
  - Leverages Next.js edge caching
  - Pre-render mechanism to reduce device wait time

### 4. Logging Implementation

#### Logging Approach
- **Storage**: Supabase database
- **Capture Scope**:
  - System-level logs
  - Device interaction logs
  - Error tracking
- **Default Behavior**: 
  - Minimal logging
  - Error-only capture
  - Optional comprehensive logging

#### Log Entry Structure
```typescript
interface DeviceLog {
  timestamp: Date;
  device_id: string;
  mac_address: string;
  log_level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
}
```

### 5. Architectural Considerations

#### Redirect Handling
- Disabled trailing slash redirects
- Configured in `next.config.js`:
```javascript
module.exports = {
  trailingSlash: false,
  skipTrailingSlashRedirect: true
}
```

#### Performance Optimizations
- Edge caching for bitmap generation
- Minimal payload size
- Quick response time prioritized
- Stateless API design

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






