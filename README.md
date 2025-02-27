# BYOS Next.js for TRMNL

## 🚀 Overview
**BYOS (Build Your Own Server Next.js)** is a community-maintained library for the TRMNL deivce https://usetrmnl.com/.

It's designed to be api morphic to the offical BYOS solutions like:
https://github.com/usetrmnl/byos_sinatra
https://github.com/usetrmnl/byos_django/
https://github.com/usetrmnl/byos_phoenix

## Quick Start

To get started with BYOS Next.js for TRMNL, follow one of the two methods below:

### Method 1: Deploy to Vercel

1. [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fghcpuman902%2Fbyos-nextjs&project-name=byos-nextjs&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D) using this template.
2. Follow the instructions to connect a Supabase database to your application.
3. Once deployed, navigate to your app to initialize the database and obtain your server base URL.
4. Long press (10s) the button at the back TRMNL device to reset it.
5. Connect to the TRMNL Wi-Fi network and use the captive portal to set up Wi-Fi. Change the server base URL to the deployed app in the format `https://xxxxxx.vercel.app` (omit the trailing slash).
6. You should now see a stream of logs on the home page of your app, and the device will display the current time and date.

### Method 2: Local Setup

1. Open your terminal and run the following commands to create a new directory and navigate into it:
   ```bash
   mkdir byos_nextjs && cd byos_nextjs
   ```
2. Clone the repository into the current directory:
   ```bash
   git clone https://github.com/ghcpuman902/byos-nextjs .  # Clones without creating an extra folder
   ```
3. Install the dependencies and start the development server:
   ```bash
   pnpm install && pnpm run dev
   ```
4. Open your browser and go to `http://localhost:3000` to initialize the database and get your server base URL.
5. Long press (10s) the button at the back TRMNL device to reset it.
6. Connect to the TRMNL Wi-Fi network and use the captive portal to set up Wi-Fi. Change the server base URL to the IP address of your Next.js app in the format `http://192.168.xxx.xxx:3000` (omit the trailing slash).
7. You should now see a stream of logs on the home page of your app, and the device will display the current time and date.


## How does it work?
A new, not setup TRMNL device go through this cycle:

### 1. Device Setup
When a device sends its MAC address in the request headers, the backend checks if the device is already registered. If not, it creates a new device entry in the database. This return the api key and friendly id the device will use to identify itself to the backend.

```bash
# equivilant deivce request in curl
curl -X GET http://[YOUR BASE URL]/api/setup \
-H "Content-Type: application/json" \
-H "ID: 12:34:56:78:9A:BC" # MAC address of the device
```
```bash
# Expected response from the server
{
   "status":200,
   "api_key":"someRandomApiKey",
   "friendly_id":"ABC123",
   "image_url":null,
   "filename":null,
   "message":"Device ABC123 added to BYOS!"
}
```

### 2. Display Management
The device retrieves the url of the latest screen for a device based on its API key and MAC address.

```bash
# equivilant deivce request in curl
curl -X GET http://[YOUR BASE URL]/api/display \
-H "Content-Type: application/json" \
-H "ID: 12:34:56:78:9A:BC" \ # MAC address of the device
-H "Access-Token: someRandomApiKey" # API key of the device
```
```bash
# Expected response from the server 
{
   "status":0,
   "image_url":"https://your-base-url/api/bitmap/ABC123_MTc0MDUxODExMzM3Mg==.bmp", # friendly_id_timestamp.bmp, timeStamp in Buffer.from(Date.now().toString()).toString('base64url') format
   "filename":"ABC123_MTc0MDUxODExMzM3Mg==.bmp",
   "refresh_rate":180, # when to fetch next screen
   "reset_firmware":false,
   "update_firmware":false,
   "firmware_url":null,
   "special_function":"restart_playlist"}% 
```
side note: the device may request the url using `/api/display/` instead of `/api/display`, which will cause nextjs to return a 308 redirect, causing a non-200 http code that the device will not accept.
we sovled this issue by setting the `trailingSlash: false` and `skipTrailingSlashRedirect: true` in the `next.config.js` file.

### 3. Screen Generation
The device now will fetch the given image url and display it on the screen.
It has a strict format required, which is the bitmap has to be fixed length of 800x480px with coorespondign binary data.
It also has a short timeout, so we leveraged nextjs's caching mechanism (revalidate = 60s) to cache the image and serve it to the device.
When device ask for the url, we pre hit the url so it is rendered and ready to serve when the device request it.

Note this is different from the offical BYOS solution, which is to generate the image first and save to a database. Our approach allows fresher data, but by default it doesnt not keep a record of the generated screens.

### 4. Logging
Devices can send log messages to the backend, which are stored in the database for monitoring and debugging purposes.
By default it doesnt log anthing, it's only error that get logged to your server.
This nextjs app also keeps its own systemlogs to the superbase to help you debug any issues.
```bash
# equivilant deivce request in curl
curl -X GET http://[YOUR BASE URL]/api/log \
-H "Content-Type: application/json" \
-H "Access-Token: someRandomApiKey" # API key of the device
```



This architecture allows for seamless interaction between the TRMNL devices and the web application, enabling real-time updates and management.

## 🌟 Why Next.js?
- **Customization at Your Fingertips**: Built on React, Next.js allows for extensive customization using modern CSS frameworks like Tailwind CSS.
- **Effortless Deployment**: Deploy your application with a single click to Vercel.
- **Lightweight Performance**: Generate images from HTML without the overhead of heavy runtimes.
- **Satori Integration**: Utilize Satori for generating dynamic images.
- **Beautiful Typography**: Stunning font support for crisp rendering.
- **Rapid Development**: Quick iteration and feedback with rendered components.
- **Caching Benefits**: Built-in caching mechanisms enhance performance.

This example uses Next.js 15, React 19, Tailwind CSS v4, and ShadCN for a modern development experience.

## 📦 Features
- Community-driven development and maintenance.
- Easy setup and configuration for local and cloud environments.
- Support for image generation and display content management.
- Comprehensive API for device management and logging.

## 📖 Getting Started

### Prerequisites
- **Node.js** (v14 or later)
- **pnpm** (install via npm: `npm install -g pnpm`)
- **Zsh** (recommended for a better shell experience)

### Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/usetrmnl/byos_nextjs
cd byos_nextjs
pnpm install
```

### Running the Development Server
Start the development server:

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see your application in action!

### Editing the Application
You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you make changes.

## 🏗️ Architecture Structure
Here's a brief overview of the project structure:

```bash
byos_nextjs/
├── app/                  # Main application directory
│   ├── components/       # Reusable React components
│   ├── pages/            # Next.js pages
│   ├── styles/           # Global styles and Tailwind CSS configuration
│   └── utils/            # Utility functions and helpers
├── public/               # Static assets (images, fonts, etc.)
├── api/                  # API routes for device management
├── tests/                # Unit and integration tests
├── .env                  # Environment variables
├── .gitignore            # Git ignore file
├── package.json          # Project metadata and dependencies
└── README.md             # Project documentation
```

## 📚 Learn More
- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

## 🌐 Community & Contributions
We welcome contributions from everyone! Check out our [contributing guidelines](CONTRIBUTING.md) to get involved.

- Join our discussions on [GitHub Discussions](https://github.com/usetrmnl/byos_nextjs/discussions).
- Follow us on [Twitter](https://twitter.com/usetrmnl) for updates.

## 🚀 Deploy on Vercel
The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

## 🔗 Quick Links
- [Button 1: Example Action](#)
- [Button 2: Another Action](#)
- [Button 3: Yet Another Action](#)

## 📸 Examples
- ![Example 1](#) 
- ![Example 2](#) 
- ![Example 3](#) 






