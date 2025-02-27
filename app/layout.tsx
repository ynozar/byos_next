import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server"
import React, { Suspense } from "react";
import MainLayout from "@/components/main-layout";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Suspense fallback={<div>Loading...</div>}>
          {error ? (
            <div>Error loading devices</div>
          ) : (
            <MainLayout devices={devices}>
              {children}
            </MainLayout>
          )}
        </Suspense>
      </body>
    </html>
  );
}
