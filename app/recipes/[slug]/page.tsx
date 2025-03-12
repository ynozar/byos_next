export const revalidate = 5;

import fs from "fs";
import path from "path";
import { createElement, Suspense, use, cache } from "react";
import { ImageResponse } from "next/og";
import { renderBmp } from "@/utils/render-bmp";
import screens from "@/app/recipes/screens.json";
import { notFound } from "next/navigation";
import Image from "next/image";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { RecipePreviewLayout } from "@/components/recipes/recipe-preview-layout";
import RecipeProps from "@/components/recipes/recipe-props";
import { revalidateTag } from "next/cache";
import Link from "next/link";

// Define types for our cache
interface CacheItem {
	data: Buffer;
	expiresAt: number;
}

// Extend NodeJS namespace for global variables
declare global {
	// eslint-disable-next-line no-var
	var pageBitmapCache: Map<string, CacheItem> | undefined;
}

// Use the global bitmap cache only in development
const getBitmapCache = (): Map<string, CacheItem> | null => {
	// In production, return null to use Next.js built-in caching
	if (process.env.NODE_ENV === 'production') {
		return null;
	}
	
	// In development, use our global cache
	if (!global.pageBitmapCache) {
		global.pageBitmapCache = new Map<string, CacheItem>();
	}
	return global.pageBitmapCache;
};

// Server action for revalidating data
async function refreshData(slug: string) {
	'use server'
	await new Promise(resolve => setTimeout(resolve, 500)); // Demo loading state
	revalidateTag(slug);
}

// Load fonts as Buffer for Node.js as specified in Satori docs - using React's cache
const loadFont = cache(() => {
	try {
		const blockKieFont = Buffer.from(
			fs.readFileSync(path.resolve("./public/fonts/BlockKie.ttf")),
		);
		console.log("Fonts loaded successfully");
		return blockKieFont;
	} catch (error) {
		console.error("Error loading fonts:", error);
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

export async function generateStaticParams() {
	return Object.keys(screens).map((slug) => ({ slug }));
}

// Separate data fetching functions for better Suspense support
const fetchConfig = cache((slug: string) => {
	const config = screens[slug as keyof typeof screens];
	if (!config || (!config.published && process.env.NODE_ENV === "production")) {
		return null;
	}
	return config;
});

const fetchComponent = cache(async (slug: string) => {
	try {
		const { default: Component } = await import(
			`@/app/recipes/screens/${slug}/${slug}.tsx`
		);
		return Component;
	} catch (error) {
		console.error(`Error loading component for ${slug}:`, error);
		return null;
	}
});

const fetchProps = cache(async (
	slug: string,
	config: (typeof screens)[keyof typeof screens],
) => {
	let props = config.props || {};
	if (config.hasDataFetch) {
		try {
			const { default: fetchDataFunction } = await import(
				`@/app/recipes/screens/${slug}/getData.ts`
			);
			
			// Set a timeout for data fetching to prevent hanging
			const fetchPromise = fetchDataFunction();
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error("Data fetch timeout")), 10000);
			});
			
			// Race between the fetch and the timeout
			const fetchedData = await Promise.race([fetchPromise, timeoutPromise])
				.catch(error => {
					console.warn(`Data fetch error for ${slug}:`, error);
					return null;
				});
			
			// Check if the fetched data is valid
			if (fetchedData && typeof fetchedData === 'object') {
				props = fetchedData;
			} else {
				console.warn(`Invalid or missing data for ${slug}`);
			}
		} catch (error) {
			console.error(`Error fetching data for ${slug}:`, error);
		}
	}
	return props;
});

// Non-blocking bitmap generation with caching
const generateBitmap = cache(async (
	slug: string,
	Component: React.ComponentType<
		(typeof screens)[keyof typeof screens]["props"]
	>,
	props: (typeof screens)[keyof typeof screens]["props"],
) => {
	const cacheKey = `page/bitmap/${slug}`;
	const bitmapCache = getBitmapCache();
	
	// Check if we have a cached version (only in development)
	if (bitmapCache?.has(cacheKey)) {
		const item = bitmapCache.get(cacheKey);
		if (!item) {
			console.log(`⚠️ Cache inconsistency for ${cacheKey}`);
		} else {
			const now = Date.now();
			
			// If the item is still valid, return it
			if (item.expiresAt > now) {
				console.log(`🔵 Page cache HIT for ${cacheKey}`);
				return item.data;
			}
			
			// If stale, return it but trigger background revalidation
			console.log(`🟡 Page cache STALE for ${cacheKey}`);
			
			// Revalidate in background with a fresh context
			setTimeout(() => {
				console.log(`🔄 Background revalidation for ${cacheKey}`);
				generateFreshBitmap(slug, Component, props, cacheKey);
			}, 0);
			
			return item.data;
		}
	}
	
	// Cache miss or in production - generate the bitmap
	return await generateFreshBitmap(slug, Component, props, cacheKey);
});

// Helper function to generate and cache a fresh bitmap
const generateFreshBitmap = async (
	slug: string,
	Component: React.ComponentType<
		(typeof screens)[keyof typeof screens]["props"]
	>,
	props: (typeof screens)[keyof typeof screens]["props"],
	cacheKey: string
) => {
	try {
		const pngResponse = await new ImageResponse(
			createElement(Component, props),
			getImageOptions()
		);
		const buffer = await renderBmp(pngResponse);
		
		if (buffer) {
			// Cache the successful response with 3 second expiration (max acceptable delay)
			// Only in development
			const bitmapCache = getBitmapCache();
			if (bitmapCache) {
				const now = Date.now();
				const expiresAt = now + 3 * 1000; // 3 seconds
				
				bitmapCache.set(cacheKey, {
					data: buffer,
					expiresAt,
				});
				
				console.log(`✅ Successfully generated bitmap for: ${slug}`);
			}
			return buffer;
		}
		return null;
	} catch (error) {
		console.error("Error generating bitmap:", error);
		return null;
	}
};

// Component to render the bitmap image
const BitmapImage = ({
	bmpBuffer,
	title,
}: { bmpBuffer: Buffer; title: string }) => {
	return (
		<Image
			width={800}
			height={480}
			src={`data:image/bmp;base64,${bmpBuffer.toString("base64")}`}
			style={{ imageRendering: "pixelated" }}
			alt={`${title} BMP render`}
			className="w-full object-cover"
		/>
	);
};

// Component to render the bitmap with Suspense
const SuspendedBitmap = ({
	slug,
	Component,
	props,
	title,
}: {
	slug: string;
	Component: React.ComponentType<
		(typeof screens)[keyof typeof screens]["props"]
	>;
	props: (typeof screens)[keyof typeof screens]["props"];
	title: string;
}) => {
	// Create a promise for the bitmap generation
	const bmpPromise = generateBitmap(slug, Component, props);
	const bmpBuffer = use(bmpPromise);

	if (!bmpBuffer) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				Failed to generate bitmap
			</div>
		);
	}

	return <BitmapImage bmpBuffer={bmpBuffer} title={title} />;
};

// Main component that uses the data
const RecipeContent = ({ slug }: { slug: string }) => {
	// Fetch config first
	const config = fetchConfig(slug);
	if (!config) {
		notFound();
	}

	// Create promises for component and props
	const componentPromise = fetchComponent(slug);
	const Component = use(componentPromise);

	if (!Component) {
		notFound();
	}

	// Fetch props with Suspense
	const propsPromise = fetchProps(slug, config);
	const props = use(propsPromise);

	return (
		<div className="@container">
			<div className="flex flex-col">
				<div className="border-b pb-4 mb-4">
					<Suspense
						fallback={
							<>
								<h1 className="text-3xl font-semibold">Loading...</h1>
								<p className="mt-2 max-w-prose">Loading...</p>
							</>
						}
					>
						<h1 className="text-3xl font-semibold">{config.title}</h1>
						<p className="mt-2 max-w-prose">{config.description}</p>
					</Suspense>
				</div>

				<RecipePreviewLayout>
					<div className="flex flex-col gap-0 mb-2">
						<div className="w-[800px] h-[480px] border border-gray-200 overflow-hidden rounded-sm">
							<AspectRatio ratio={5 / 3}>
								<Suspense
									fallback={
										<div className="w-full h-full flex items-center justify-center">
											Rendering bitmap...
										</div>
									}
								>
									<SuspendedBitmap
										slug={slug}
										Component={Component}
										props={props}
										title={config.title}
									/>
								</Suspense>
							</AspectRatio>
						</div>
						<p className="leading-7"><Link href={`/api/bitmap/${slug}.bmp`}>/api/bitmap/{slug}.bmp</Link></p>
					</div>
					<div className="flex flex-col gap-0">
						<div className="w-[800px] h-[480px] border border-gray-200 overflow-hidden rounded-sm">
							<AspectRatio ratio={5 / 3} className="w-[800px] h-[480px]">
								<Suspense
									fallback={
										<div className="w-full h-full flex items-center justify-center">
											Rendering recipe...
										</div>
									}
								>
									<Component {...props} />
								</Suspense>
							</AspectRatio>
						</div>
						<p className="leading-7">/recipes/screens/{slug}/{slug}.tsx</p>
					</div>
				</RecipePreviewLayout>

				{config.hasDataFetch && (
					<Suspense
						fallback={
							<div className="w-full h-full flex items-center justify-center">
								Loading props...
							</div>
						}
					>
						<RecipeProps 
							props={props} 
							slug={slug} 
							refreshAction={refreshData}
						/>
					</Suspense>
				)}
			</div>
		</div>
	);
};

export default async function RecipePage({
	params,
}: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;

	return (
		<Suspense
			fallback={
				<div className="w-full h-full flex items-center justify-center">
					Loading recipe...
				</div>
			}
		>
			<RecipeContent slug={slug} />
		</Suspense>
	);
}
