interface WikipediaData {
  title: string;
  extract: string;
  content_urls: {
    desktop: {
      page: string;
    };
  };
  type?: string;
  description?: string;
}

export default async function fetchData(): Promise<WikipediaData> {
  try {
    // First try to get a featured article
    const response = await fetch("https://en.wikipedia.org/api/rest_v1/page/random/summary", {
      headers: {
        Accept: "application/json",
        "Api-User-Agent": "NextJS-Wikipedia-Display/1.0",
      },
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
      // If not interesting enough, try again
      return fetchData();
    }

    return data;
  } catch (error) {
    console.error("Error details:", error);

    // Fallback to a guaranteed interesting article
    try {
      const fallbackArticles = [
        "Pyramids_of_Giza",
        "Solar_System",
        "Ancient_Rome",
        "Great_Wall_of_China",
        "World_War_II",
      ];
      const fallbackArticle = fallbackArticles[Math.floor(Math.random() * fallbackArticles.length)];

      const fallbackResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${fallbackArticle}`, {
        headers: {
          Accept: "application/json",
          "Api-User-Agent": "NextJS-Wikipedia-Display/1.0",
        },
      });

      if (!fallbackResponse.ok) {
        throw new Error("Fallback article fetch failed");
      }

      return fallbackResponse.json();
    } catch (fallbackError) {
      console.log("Fallback error details:", fallbackError);
      // If all else fails, return a static fallback
      return {
        title: "The Great Pyramid of Giza",
        extract:
          "The Great Pyramid of Giza is the oldest and largest of the pyramids in the Giza pyramid complex bordering present-day Giza in Greater Cairo, Egypt. It is the oldest of the Seven Wonders of the Ancient World, and the only one to remain largely intact. It was built as a tomb for the Fourth Dynasty Egyptian pharaoh Khufu and was constructed over a 20-year period concluding around 2560 BC.",
        content_urls: {
          desktop: {
            page: "https://en.wikipedia.org/wiki/Great_Pyramid_of_Giza",
          },
        },
      };
    }
  }
}
