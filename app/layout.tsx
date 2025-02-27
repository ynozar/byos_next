import type { Metadata } from "next";
import { Geist_Mono as FontMono, Geist as FontSans } from "next/font/google"
import "./globals.css";
import { createClient } from "@/lib/supabase/server"
import React, { Suspense } from "react";
import MainLayout from "@/components/main-layout";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";


const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const META_THEME_COLORS = {
  light: "#ffffff",
  dark: "#09090b",
}

export const metadata: Metadata = {
  title: "trmnl-byos-nextjs",
  description: "Device management dashboard",
}


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient()
  const { data: devices, error } = await supabase
    .from('devices')
    .select('*');


  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || ((!('theme' in localStorage) || localStorage.theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.querySelector('meta[name="theme-color"]').setAttribute('content', '${META_THEME_COLORS.dark}')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body
        className={cn(
          "bg-background overscroll-none font-sans antialiased",
          fontSans.variable,
          fontMono.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={<div>Loading...</div>}>
            {error ? (
              <div>Error loading devices</div>
            ) : (
              <MainLayout devices={devices}>
                {children}
              </MainLayout>
            )}
          </Suspense>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
