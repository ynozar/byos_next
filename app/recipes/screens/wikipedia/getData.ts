import { unstable_cache } from "next/cache";

interface WikipediaData {
	title: string;
	extract: string;
	thumbnail?: {
		source?: string;
		width?: number;
		height?: number;
	};
	content_urls?: {
		desktop: {
			page: string;
		};
	};
	type?: string;
	description?: string;
}

/**
 * Helper function to get a random fallback article
 */
function getFallbackArticle(): string {
	const fallbackArticles = [
		"Electronic_paper",
		"Internet_of_things",
		"Computer_terminal",
		"London_Underground",
		"Wikipedia",
	];
	return fallbackArticles[Math.floor(Math.random() * fallbackArticles.length)];
}

/**
 * Internal function to fetch and process Wikipedia data
 */
async function getWikipediaArticle(): Promise<WikipediaData | null> {
	try {
		// Try to get a random article
		const response = await fetch(
			"https://en.wikipedia.org/api/rest_v1/page/random/summary",
			{
				headers: {
					Accept: "application/json",
					"Api-User-Agent": "NextJS-Wikipedia-Display/1.0",
				},
				cache: "no-store",
			},
		);

		if (!response.ok) {
			throw new Error(
				`Wikipedia API responded with status: ${response.status}`,
			);
		}

		const data = await response.json();

		// Check if the article is substantial enough
		if (
			data.extract.length < 200 ||
			data.type === "disambiguation" ||
			(data.description &&
				(data.description.includes("researcher") ||
					data.description.includes("professor") ||
					data.description.includes("footballer") ||
					data.description.includes("politician")))
		) {
			// If not interesting enough, use a fallback article
			try {
				const fallbackArticle = getFallbackArticle();
				const fallbackResponse = await fetch(
					`https://en.wikipedia.org/api/rest_v1/page/summary/${fallbackArticle}`,
					{
						headers: {
							Accept: "application/json",
							"Api-User-Agent": "NextJS-Wikipedia-Display/1.0",
						},
					},
				);

				if (!fallbackResponse.ok) {
					throw new Error("Fallback article fetch failed");
				}

				const fallbackData = await fallbackResponse.json();

				return {
					title: fallbackData.title,
					extract: fallbackData.extract,
					thumbnail: fallbackData.thumbnail || null,
					content_urls: fallbackData.content_urls,
					description: fallbackData.description,
					type: fallbackData.type,
				};
			} catch (fallbackError) {
				console.log("Fallback error details:", fallbackError);
				return null;
			}
		}

		// Include additional fun data and cover image
		return {
			title: data.title,
			extract: data.extract,
			thumbnail: data.thumbnail ? data.thumbnail : null, // Cover image
			content_urls: data.content_urls, // Additional URLs
			description: data.description,
			type: data.type,
		};
	} catch (error) {
		console.error("Error details:", error);
		return null;
	}
}

/**
 * Function that fetches Wikipedia data without caching
 */
async function fetchWikipediaData(): Promise<WikipediaData> {
	const data = await getWikipediaArticle();
	
	// If data is null or empty, return a default object
	if (!data || !data.title || !data.extract) {
		return {
			title: "Unable to fetch Wikipedia data",
			extract: "There was an error retrieving the article. Please try again later.",
			thumbnail: undefined
		};
	}
	
	return data;
}

/**
 * Cached function that serves as the entry point for fetching Wikipedia data
 * Only caches valid responses
 */
const getCachedWikipediaData = unstable_cache(
	async (): Promise<WikipediaData> => {
		const data = await getWikipediaArticle();
		
		// If data is null or empty, throw an error to prevent caching
		if (!data || !data.title || !data.extract) {
			throw new Error("Empty or invalid data - skip caching");
		}
		
		return data;
	},
	["wikipedia-random-article"],
	{
		tags: ["wikipedia"],
		revalidate: 600, // Cache for 10 minutes
	},
);

/**
 * Main export function that tries to use cached data but falls back to non-cached data if needed
 */
export default async function getData(): Promise<WikipediaData> {
	try {
		// Try to get cached data first
		return await getCachedWikipediaData();
	} catch (error) {
		console.log("Cache skipped or error:", error);
		// Fall back to non-cached data
		return fetchWikipediaData();
	}
}
