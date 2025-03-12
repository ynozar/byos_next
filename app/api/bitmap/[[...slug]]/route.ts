export const revalidate = 60;

import type { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";
import { createElement, cache } from "react";
import { renderBmp, DISPLAY_BMP_IMAGE_SIZE } from "@/utils/render-bmp";
import NotFoundScreen from "@/app/recipes/screens/not-found/not-found";
import screens from "@/app/recipes/screens.json";

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

// Helper function to load a recipe component - now using React's cache
const loadRecipeBuffer = cache(async (recipeId: string) => {
	try {
		// Check if the recipe exists in our components registry
		let element: React.ReactNode;
		if (screens[recipeId as keyof typeof screens]) {
			const { default: Component } = await import(
				`@/app/recipes/screens/${recipeId}/${recipeId}.tsx`
			);
			console.log(`Recipe component loaded: ${recipeId}`);
			let props = screens[recipeId as keyof typeof screens].props || {};
			
			// Handle data fetching recipes
			if (screens[recipeId as keyof typeof screens].hasDataFetch) {
				try {
					const { default: fetchDataFunction } = await import(
						`@/app/recipes/screens/${recipeId}/getData.ts`
					);
					const fetchedData = await fetchDataFunction();
					
					// Check if the fetched data is valid
					if (fetchedData && typeof fetchedData === 'object') {
						props = fetchedData;
					} else {
						console.warn(`Invalid data fetched for ${recipeId}`);
					}
				} catch (error) {
					console.warn(`Error fetching data for ${recipeId}:`, error);
				}
			}
			element = createElement(Component, { ...props });
		} else {
			// If recipe component not found, use the NotFoundScreen
			element = createElement(NotFoundScreen, { slug: recipeId });
		}

		const pngResponse = await new ImageResponse(element, getImageOptions());
		return await renderBmp(pngResponse);
	} catch (error) {
		console.error(`Error loading recipe component ${recipeId}:`, error);
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
		
		// Extract the recipe slug from the URL
		const recipeSlug = bitmapPath.replace(".bmp", "");
		
		// Check if this is a recipe with data fetching
		const hasDataFetch = screens[recipeSlug as keyof typeof screens]?.hasDataFetch === true;
		
		// For recipes with data fetching, we might want to skip the cache or use a shorter TTL
		const shouldUseCache = !hasDataFetch || req.nextUrl.searchParams.get('nocache') !== 'true';
		
		// Check global cache first (if we should use cache)
		const bitmapCache = getBitmapCache();
		if (shouldUseCache && bitmapCache.has(cacheKey)) {
			const item = bitmapCache.get(cacheKey);
			// Since we've checked with .has(), item should exist, but let's be safe
			if (!item) {
				console.log(`⚠️ Cache inconsistency for ${cacheKey}`);
				return await generateBitmap(bitmapPath, cacheKey, hasDataFetch);
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
				generateBitmap(bitmapPath, cacheKey, hasDataFetch);
			}, 0);

			return staleResponse;
		}

		// Cache miss - generate the bitmap
		return await generateBitmap(bitmapPath, cacheKey, hasDataFetch);
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
// Now using React's cache for the recipe buffer generation
const generateBitmap = cache(async (bitmapPath: string, cacheKey: string, hasDataFetch = false) => {
	// Extract the recipe slug from the URL
	// Format: [recipe_slug].bmp
	const recipeSlug = bitmapPath.replace(".bmp", "");

	// Default to 'simple-text' if no recipe is specified
	let recipeId = "simple-text";

	// Check if the requested recipe exists in our screens registry
	if (screens[recipeSlug as keyof typeof screens]) {
		recipeId = recipeSlug;
		console.log(`Recipe found: ${recipeSlug}`);
	} else {
		console.log(`Recipe not found: ${recipeSlug}, using default`);
	}

	// Try to load the recipe component using our cached function
	const recipeBuffer = await loadRecipeBuffer(recipeId);

	if (recipeBuffer) {
		// For recipes with data fetching, use a shorter cache time or skip caching
		const revalidate = hasDataFetch ? 30 : 60; // 30 seconds for data fetch recipes, 60 for others
		const now = Date.now();
		const expiresAt = now + revalidate * 1000;

		// Cache the successful response
		getBitmapCache().set(cacheKey, {
			data: recipeBuffer,
			expiresAt,
		});

		console.log(`✅ Successfully generated bitmap for: ${bitmapPath}`);

		return new Response(recipeBuffer, {
			headers: {
				"Content-Type": "image/bmp",
				"Content-Length": DISPLAY_BMP_IMAGE_SIZE.toString(),
			},
		});
	}

	throw new Error("Failed to generate recipe buffer");
});
