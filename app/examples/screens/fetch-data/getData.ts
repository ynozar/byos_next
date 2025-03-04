import { unstable_cacheTag as cacheTag } from 'next/cache'

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

// Maximum number of retries to prevent infinite recursion
const MAX_RETRIES = 3;

/**
 * Internal recursive function to fetch Wikipedia data
 */
async function fetchWikipediaData(retryCount = 0): Promise<WikipediaData | string> {  
  if (retryCount >= MAX_RETRIES) {
    // Try to get a fallback article
    try {
      const fallbackArticle = getFallbackArticle();
      const fallbackResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${fallbackArticle}`, {
        headers: {
          Accept: "application/json",
          "Api-User-Agent": "NextJS-Wikipedia-Display/1.0",
        },
        cache: 'no-store',
      });

      if (!fallbackResponse.ok) {
        throw new Error("Fallback article fetch failed");
      }

      return fallbackResponse.json();
    } catch (fallbackError) {
      console.log("Fallback error details:", fallbackError);
      // Return error message instead of static fallback
      return "Error: Unable to fetch fallback article.";
    }
  }
  try {
    // First try to get a featured article
    const response = await fetch("https://en.wikipedia.org/api/rest_v1/page/random/summary", {
      headers: {
        Accept: "application/json",
        "Api-User-Agent": "NextJS-Wikipedia-Display/1.0",
      },
      // Add cache: 'no-store' to prevent caching issues
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Wikipedia API responded with status: ${response.status}`);
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
      // If not interesting enough, try again with incremented retry count
      return fetchWikipediaData(retryCount + 1);
    }

    // Include additional fun data and cover image
    const enhancedData = {
      title: data.title,
      extract: data.extract,
      thumbnail: data.thumbnail ? data.thumbnail : null, // Cover image
      content_urls: data.content_urls, // Additional URLs
      description: data.description,
      type: data.type,
    };

    return enhancedData; // Return the enhanced data
  } catch (error) {
    console.error("Error details:", error);
    return "Error: Unable to fetch Wikipedia data.";
  }
}

/**
 * Exported function that serves as the entry point for fetching Wikipedia data
 */
export default async function fetchData(): Promise<WikipediaData | string> {
  'use cache' // reduce server load by caching success result for 15min, see https://nextjs.org/docs/app/api-reference/directives/use-cache
  cacheTag('fetch-data') // match the slug in the @app/examples/screens.json
  return fetchWikipediaData(0);
}

// Helper function to get a random fallback article
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
