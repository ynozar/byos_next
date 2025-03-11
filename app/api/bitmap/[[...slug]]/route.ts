export const revalidate = 60;

import type { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";
import { createElement, cache } from "react";
import { renderBmp, DISPLAY_BMP_IMAGE_SIZE } from "@/utils/render-bmp";
import NotFoundScreen from "@/app/examples/screens/not-found/not-found";
import screens from "@/app/examples/screens.json";

// Define types for our cache
interface CacheItem {
	data: Buffer;
	expiresAt: number;
}

// Extend NodeJS namespace for global variables
declare global {
	// eslint-disable-next-line no-var
	var bitmapCache: Map<string, CacheItem> | undefined;
}

// Use the global bitmap cache
const getBitmapCache = (): Map<string, CacheItem> => {
	if (!global.bitmapCache) {
		global.bitmapCache = new Map<string, CacheItem>();
	}
	return global.bitmapCache;
};

// Use React's cache for font loading - executed once at module level
const loadFont = cache(() => {
	try {
		return fs.readFileSync(path.resolve("./public/fonts/BlockKie.ttf"));
	} catch (error) {
		console.error("Error loading font:", error);
		return null;
	}
});

// Cache the font at module initialization
const blockKieFont = loadFont();

// Cache the image options - executed once at module level
const getImageOptions = cache(() => ({
	width: 800,
	height: 480,
	fonts: [
		...(blockKieFont
			? [
					{
						name: "BlockKie",
						data: blockKieFont,
						weight: 400 as const,
						style: "normal" as const,
					},
				]
			: []),
	],
	debug: false,
}));

// Helper function to load a screen component - now using React's cache
const loadScreenBuffer = cache(async (screenId: string) => {
	try {
		// Check if the screen exists in our components registry
		let element: React.ReactNode;
		if (screens[screenId as keyof typeof screens]) {
			const { default: Component } = await import(
				`@/app/examples/screens/${screenId}/${screenId}.tsx`
			);
			console.log(`Screen component loaded: ${screenId}`);
			let props = screens[screenId as keyof typeof screens].props || {};
			if (screens[screenId as keyof typeof screens].hasDataFetch) {
				try {
					const { default: fetchDataFunction } = await import(
						`@/app/examples/screens/${screenId}/getData.ts`
					);
					props = await fetchDataFunction();
				} catch (error) {
					console.warn(`Error fetching data for ${screenId}:`, error);
				}
			}
			element = createElement(Component, { ...props });
		} else {
			// If screen component not found, use the NotFoundScreen
			element = createElement(NotFoundScreen, { slug: screenId });
		}

		const pngResponse = await new ImageResponse(element, getImageOptions());
		return await renderBmp(pngResponse);
	} catch (error) {
		console.error(`Error loading screen component ${screenId}:`, error);
		return null;
	}
});

export async function generateStaticParams() {
	return [
		...Object.keys(screens).map((screen) => ({
			slug: [`${screen}.bmp`],
		})),
		...Object.keys(screens).map((screen) => ({
			slug: [screen],
		})),
	];
}

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ slug?: string[] }> },
) {
	try {
		// Always await params as required by Next.js 14/15
		const { slug = ["not-found"] } = await params;
		const bitmapPath = Array.isArray(slug) ? slug.join("/") : slug;
		const cacheKey = `api/bitmap/${bitmapPath}`;

		console.log(`Bitmap request for: ${bitmapPath}`);

		// Check global cache first
		const bitmapCache = getBitmapCache();
		if (bitmapCache.has(cacheKey)) {
			const item = bitmapCache.get(cacheKey);
			// Since we've checked with .has(), item should exist, but let's be safe
			if (!item) {
				console.log(`⚠️ Cache inconsistency for ${cacheKey}`);
				return await generateBitmap(bitmapPath, cacheKey);
			}

			const now = Date.now();

			// Check if the item is still valid
			if (item.expiresAt > now) {
				console.log(`🔵 Global cache HIT for ${cacheKey}`);
				return new Response(item.data, {
					headers: {
						"Content-Type": "image/bmp",
						"Content-Length": DISPLAY_BMP_IMAGE_SIZE.toString(),
					},
				});
			}

			console.log(`🟡 Global cache STALE for ${cacheKey}`);
			// Return stale data but trigger background revalidation
			const staleResponse = new Response(item.data, {
				headers: {
					"Content-Type": "image/bmp",
					"Content-Length": DISPLAY_BMP_IMAGE_SIZE.toString(),
				},
			});

			// Revalidate in background
			setTimeout(() => {
				console.log(`🔄 Background revalidation for ${cacheKey}`);
				generateBitmap(bitmapPath, cacheKey);
			}, 0);

			return staleResponse;
		}

		// Cache miss - generate the bitmap
		return await generateBitmap(bitmapPath, cacheKey);
	} catch (error) {
		console.error("Error generating image:", error);

		// Instead of returning an error, return the NotFoundScreen as a fallback
		try {
			// Only load fonts when needed for error fallback
			const element = createElement(NotFoundScreen, { slug: "Error occurred" });
			const pngResponse = await new ImageResponse(element, getImageOptions());
			const buffer = await renderBmp(pngResponse);

			return new Response(buffer, {
				headers: {
					"Content-Type": "image/bmp",
					"Content-Length": DISPLAY_BMP_IMAGE_SIZE.toString(),
				},
			});
		} catch (fallbackError) {
			console.error("Error generating fallback image:", fallbackError);
			return new Response("Error generating image", {
				status: 500,
				headers: {
					"Content-Type": "text/plain",
				},
			});
		}
	}
}

// Helper function to generate and cache bitmap
// Now using React's cache for the screen buffer generation
const generateBitmap = cache(async (bitmapPath: string, cacheKey: string) => {
	// Extract the screen slug from the URL
	// Format: [screen_slug].bmp
	const screenSlug = bitmapPath.replace(".bmp", "");

	// Default to 'simple-text' if no screen is specified
	let screenId = "simple-text";

	// Check if the requested screen exists in our screens registry
	if (screens[screenSlug as keyof typeof screens]) {
		screenId = screenSlug;
		console.log(`Screen found: ${screenSlug}`);
	} else {
		console.log(`Screen not found: ${screenSlug}, using default`);
	}

	// Try to load the screen component using our cached function
	const screenBuffer = await loadScreenBuffer(screenId);

	if (screenBuffer) {
		// Store in global cache
		const revalidate = 60; // Default to 60 seconds
		const now = Date.now();
		const expiresAt = now + revalidate * 1000;

		// Cache the successful response
		getBitmapCache().set(cacheKey, {
			data: screenBuffer,
			expiresAt,
		});

		console.log(`✅ Successfully generated bitmap for: ${bitmapPath}`);

		return new Response(screenBuffer, {
			headers: {
				"Content-Type": "image/bmp",
				"Content-Length": DISPLAY_BMP_IMAGE_SIZE.toString(),
			},
		});
	}

	throw new Error("Failed to generate screen buffer");
});
