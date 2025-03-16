import { unstable_cache } from "next/cache";

export interface WikipediaData {
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
	categories?: string[];
	images?: Array<{
		title: string;
		url?: string;
	}>;
	links?: string[];
	lastModified?: string;
	pageId?: number;
}

// Default fallback data to use when all fetching attempts fail
const DEFAULT_FALLBACK_DATA: WikipediaData = {
	title: "Electronic Paper Display",
	extract: "Electronic paper, also sometimes called e-paper, is a display technology designed to mimic the appearance of ordinary ink on paper. Unlike conventional flat panel displays that emit light, electronic paper displays reflect light like paper. This may make them more comfortable to read, and provide a wider viewing angle than most light-emitting displays.",
	thumbnail: {
		source: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/E-book_reader_displays.jpg/320px-E-book_reader_displays.jpg",
		width: 320,
		height: 240
	},
	categories: ["Display technology", "Electronic paper technology"],
	pageId: 1234567
};

/**
 * Helper function to get a random fallback article
 */
function getFallbackArticle(): string {
	// Curated list of non-disambiguation articles that are reliable and informative
	const fallbackArticles = [
		"Electronic_paper",
		"Internet_of_things",
		"Computer_terminal",
		"London_Underground",
		"Wikipedia",
		"Raspberry_Pi",
		"E-ink",
		"Kindle_(Amazon)",  // Specified to avoid disambiguation
		"Digital_display",
		"Smart_home",
		"Artificial_intelligence",
		"Cloud_computing",
		"Quantum_computing",
		"Virtual_reality",
		"Augmented_reality"
	];
	return fallbackArticles[Math.floor(Math.random() * fallbackArticles.length)];
}

/**
 * Helper function to implement fetch with timeout and retry logic
 */
async function fetchWithRetry(
	url: string, 
	options: RequestInit = {}, 
	retries = 3, 
	timeout = 5000
): Promise<Response> {
	// Create an AbortController to handle timeouts
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);
	
	try {
		// Add the signal to the options
		const fetchOptions = {
			...options,
			signal: controller.signal
		};
		
		// Attempt the fetch
		const response = await fetch(url, fetchOptions);
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		
		// If we have retries left, wait and try again
		if (retries > 0) {
			// Exponential backoff: wait longer between each retry
			const delay = 1000 * (2 ** (3 - retries));
			await new Promise(resolve => setTimeout(resolve, delay));
			return fetchWithRetry(url, options, retries - 1, timeout);
		}
		
		// No more retries, throw the error
		throw error;
	}
}

/**
 * Fetch multiple random articles with their extracts and images in a single request
 * This uses the generator=random with prop=pageimages|extracts for efficiency
 */
async function fetchRandomArticles(count = 10): Promise<WikipediaData[]> {
	try {
		// Use the optimized endpoint that combines random article generation with content fetching
		// This gets random articles with their extracts and images in a single request
		// Increased count from 5 to 10 to improve chances of finding suitable articles
		const response = await fetchWithRetry(
			`https://en.wikipedia.org/w/api.php?action=query&generator=random&grnnamespace=0&grnlimit=${count}&prop=pageimages|extracts|categories|info&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=300&inprop=url|displaytitle|modified&format=json&origin=*`,
			{
				headers: {
					"User-Agent": "NextJS-Wikipedia-Display/1.0",
				},
				cache: "no-store",
			}
		);

		if (!response.ok) {
			throw new Error(`MediaWiki API responded with status: ${response.status}`);
		}

		const data = await response.json();
		
		if (!data.query || !data.query.pages) {
			throw new Error("Invalid response from MediaWiki API");
		}
		
		// Define an interface for the Wikipedia API page response
		interface WikipediaApiPage {
			pageid: number;
			title: string;
			extract?: string;
			thumbnail?: {
				source: string;
				width: number;
				height: number;
			};
			touched?: string;
			categories?: Array<{ title: string }>;
		}
		
		// Define the pages object structure
		interface WikipediaApiPages {
			[pageId: string]: WikipediaApiPage;
		}
		
		// Convert the pages object to an array of WikipediaData objects
		const pages = data.query.pages as WikipediaApiPages;
		const articles: WikipediaData[] = Object.values(pages).map((page) => {
			const article: WikipediaData = {
				title: page.title || "Unknown Title",
				extract: page.extract || "No extract available",
				pageId: page.pageid,
				lastModified: page.touched,
				thumbnail: page.thumbnail,
			};
			
			// Extract categories if available
			if (page.categories && Array.isArray(page.categories)) {
				article.categories = page.categories
					.map((cat: { title: string }) => cat.title.replace(/^Category:/, ''))
					.slice(0, 5); // Limit to 5 categories
			}
			
			// Add Wikipedia URL
			article.content_urls = {
				desktop: {
					page: `https://en.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, '_'))}`
				}
			};
			
			return article;
		});
		
		return articles;
	} catch (error) {
		console.error("Error fetching random articles:", error);
		return [];
	}
}

/**
 * Fetch additional details for a specific article if needed
 * This is a fallback for when we need more information than the basic endpoint provides
 */
async function fetchAdditionalDetails(title: string): Promise<Partial<WikipediaData>> {
	try {
		const encodedTitle = encodeURIComponent(title);
		const response = await fetchWithRetry(
			`https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`,
			{
				headers: {
					Accept: "application/json",
					"Api-User-Agent": "NextJS-Wikipedia-Display/1.0",
				},
				cache: "no-store",
			}
		);

		if (!response.ok) {
			throw new Error(`Wikipedia API responded with status: ${response.status}`);
		}

		const data = await response.json();
		return {
			description: data.description,
			type: data.type,
			// If the main API didn't return a thumbnail, use this one
			thumbnail: data.thumbnail
		};
	} catch (error) {
		console.error(`Error fetching additional details for "${title}":`, error);
		return {};
	}
}

/**
 * Check if an article is suitable based on our criteria
 */
function isArticleSuitable(article: WikipediaData): boolean {
	if (!article || !article.extract || article.extract.length < 200) {
		return false;
	}
	
	// Enhanced disambiguation detection
	// Check the type property if available
	if (article.type === "disambiguation") {
		return false;
	}
	
	// Check for common disambiguation phrases in the extract
	const disambiguationPhrases = [
		"may refer to",
		"can refer to",
		"commonly refers to",
		"usually refers to",
		"is a disambiguation page",
		"may mean",
		"can mean",
		"refers to various"
	];
	
	const extractLower = article.extract.toLowerCase();
	if (disambiguationPhrases.some(phrase => extractLower.includes(phrase))) {
		return false;
	}
	
	// Check for disambiguation in title
	if (article.title.includes("(disambiguation)")) {
		return false;
	}
	
	// Check for disambiguation categories
	if (article.categories?.some(category => 
		category.toLowerCase().includes("disambiguation") || 
		category.toLowerCase().includes("disambig"))) {
		return false;
	}
	
	// Check for the pattern "XXX is/are a/an XXX by XXX" in the extract
	const isArePattern = /^.+?\s+(?:is|are)\s+(?:a|an)\s+.+?\s+by\s+.+?/i;
	if (isArePattern.test(article.extract)) {
		return false;
	}
	
	// Filter out articles about people (often contain these terms)
	if (article.extract.toLowerCase().includes("born ") || 
	    article.extract.toLowerCase().includes(" footballer") || 
	    article.extract.toLowerCase().includes(" politician") ||
	    article.extract.toLowerCase().includes(" player") ||
	    article.extract.toLowerCase().includes(" actor")) {
		return false;
	}
	
	// Additional filters from the original code
	if (article.description && (
		article.description.includes("researcher") ||
		article.description.includes("professor") ||
		article.description.includes("footballer") ||
		article.description.includes("politician")
	)) {
		return false;
	}
	
	return true;
}

/**
 * Internal function to fetch and process Wikipedia data
 * Now using the optimized endpoint to get multiple random articles at once
 */
async function getWikipediaArticle(): Promise<WikipediaData | null> {
	try {
		// Fetch 10 random articles with their content in a single request
		const randomArticles = await fetchRandomArticles(10);
		
		if (randomArticles.length === 0) {
			throw new Error("Failed to fetch random articles");
		}
		
		console.log(`Fetched ${randomArticles.length} random articles`);
		
		// Filter out unsuitable articles
		const suitableArticles = randomArticles.filter(article => {
			const isDisambiguation = 
				article.type === "disambiguation" || 
				article.title.includes("(disambiguation)") ||
				(article.extract && /may refer to|can refer to|commonly refers to|usually refers to/i.test(article.extract));
			
			if (isDisambiguation) {
				console.log(`Filtered out disambiguation page: "${article.title}"`);
			}
			
			return isArticleSuitable(article);
		});
		
		console.log(`Found ${suitableArticles.length} suitable articles out of ${randomArticles.length}`);
		
		// If we have suitable articles, pick one randomly
		if (suitableArticles.length > 0) {
			const selectedArticle = suitableArticles[Math.floor(Math.random() * suitableArticles.length)];
			
			// If the article doesn't have a description or type, fetch additional details
			if (!selectedArticle.description || !selectedArticle.type) {
				try {
					const additionalDetails = await fetchAdditionalDetails(selectedArticle.title);
					
					// Double-check that the article with additional details is not a disambiguation page
					if (additionalDetails.type === "disambiguation") {
						console.log(`Article "${selectedArticle.title}" was identified as disambiguation after fetching details`);
						// Try again with a different article if available
						const remainingArticles = suitableArticles.filter(a => a.title !== selectedArticle.title);
						if (remainingArticles.length > 0) {
							const alternativeArticle = remainingArticles[Math.floor(Math.random() * remainingArticles.length)];
							console.log(`Trying alternative article: "${alternativeArticle.title}"`);
							return alternativeArticle;
						}
					}
					
					return {
						...selectedArticle,
						...additionalDetails
					};
				} catch (error) {
					console.error("Error fetching additional details, using basic article data:", error);
					return selectedArticle;
				}
			}
			
			return selectedArticle;
		}
		
		// If no suitable articles found, try a second batch
		console.log("No suitable articles found in first batch, trying a second batch");
		const secondBatchArticles = await fetchRandomArticles(10);
		const secondBatchSuitable = secondBatchArticles.filter(isArticleSuitable);
		
		if (secondBatchSuitable.length > 0) {
			console.log(`Found ${secondBatchSuitable.length} suitable articles in second batch`);
			return secondBatchSuitable[Math.floor(Math.random() * secondBatchSuitable.length)];
		}
		
		// If still no suitable articles found, try a fallback article
		console.log("No suitable articles found, trying fallback article");
		const fallbackArticle = getFallbackArticle();
		console.log(`Using fallback article: ${fallbackArticle}`);
		
		// Fetch the fallback article using the REST API for more complete data
		try {
			const encodedTitle = encodeURIComponent(fallbackArticle);
			const response = await fetchWithRetry(
				`https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`,
				{
					headers: {
						Accept: "application/json",
						"Api-User-Agent": "NextJS-Wikipedia-Display/1.0",
					},
					cache: "no-store",
				}
			);
			
			if (!response.ok) {
				throw new Error(`Wikipedia API responded with status: ${response.status}`);
			}
			
			const fallbackData = await response.json();
			
			// Check if the fallback article is a disambiguation page
			if (fallbackData.type === "disambiguation" || 
				fallbackData.extract.toLowerCase().includes("may refer to") ||
				fallbackData.title.includes("(disambiguation)")) {
				console.log(`Fallback article "${fallbackData.title}" is a disambiguation page, trying direct fallback`);
				throw new Error("Fallback article is a disambiguation page");
			}
			
			return {
				title: fallbackData.title,
				extract: fallbackData.extract,
				thumbnail: fallbackData.thumbnail,
				content_urls: fallbackData.content_urls,
				description: fallbackData.description,
				type: fallbackData.type,
				pageId: fallbackData.pageid
			};
		} catch (fallbackError) {
			console.error("Fallback article fetch failed:", fallbackError);
			
			// Try one more time with a specific fallback article
			try {
				console.log("Attempting direct fallback fetch...");
				const directFallbackArticle = "Electronic_paper"; // Most reliable fallback
				const encodedTitle = encodeURIComponent(directFallbackArticle);
				const response = await fetchWithRetry(
					`https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`,
					{
						headers: {
							Accept: "application/json",
							"Api-User-Agent": "NextJS-Wikipedia-Display/1.0",
						},
						cache: "no-store",
					}
				);
				
				if (!response.ok) {
					throw new Error(`Wikipedia API responded with status: ${response.status}`);
				}
				
				const directFallbackData = await response.json();
				
				// Check if even this direct fallback is a disambiguation page (very unlikely)
				if (directFallbackData.type === "disambiguation" || 
					directFallbackData.extract.toLowerCase().includes("may refer to") ||
					directFallbackData.title.includes("(disambiguation)")) {
					console.log(`Even direct fallback "${directFallbackData.title}" is a disambiguation page, using default data`);
					return DEFAULT_FALLBACK_DATA;
				}
				
				return {
					title: directFallbackData.title,
					extract: directFallbackData.extract,
					thumbnail: directFallbackData.thumbnail,
					content_urls: directFallbackData.content_urls,
					description: directFallbackData.description,
					type: directFallbackData.type,
					pageId: directFallbackData.pageid
				};
			} catch (directFallbackError) {
				console.error("All fetch attempts failed:", directFallbackError);
			}
		}
		
		// Return the hardcoded default data as last resort
		return DEFAULT_FALLBACK_DATA;
	} catch (error) {
		console.error("Error in getWikipediaArticle:", error);
		return DEFAULT_FALLBACK_DATA;
	}
}

/**
 * Function that fetches Wikipedia data without caching
 */
async function fetchWikipediaData(): Promise<WikipediaData> {
	try {
		const data = await getWikipediaArticle();
		
		// If data is null (which shouldn't happen with our improved fallbacks), return default data
		if (!data) {
			console.log("Returning default fallback data");
			return DEFAULT_FALLBACK_DATA;
		}
		
		return data;
	} catch (error) {
		console.error("Unexpected error in fetchWikipediaData:", error);
		return DEFAULT_FALLBACK_DATA;
	}
}

/**
 * Cached function that serves as the entry point for fetching Wikipedia data
 * Using a short 1.5-minute cache as requested
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
		revalidate: process.env.NODE_ENV === "production" ? 90 : 5*60, // Cache for 1.5 minutes (90 seconds) in production or 5 min for developing
	},
);

/**
 * Main export function that uses a short cache
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
