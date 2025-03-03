/**
 * Utility functions for handling component data fetching
 */
import fetchData from "@/app/examples/screens/fetch-data/getData";

// Type for data fetch functions
type DataFetchFunction = () => Promise<Record<string, any>>;

// Map of data fetch functions
const dataFetchFunctions: Record<string, DataFetchFunction> = {
  "fetch-data": fetchData,
  // Add more data fetch functions here as needed
};

/**
 * Fetches data for a component based on its slug
 * 
 * @param slug - The component slug to fetch data for
 * @param defaultProps - Default props to use if no data fetch function is found
 * @returns Props for the component
 */
export async function fetchComponentData(
  slug: string | null,
  defaultProps: Record<string, any> = {}
): Promise<Record<string, any>> {
  if (!slug || !dataFetchFunctions[slug]) {
    return defaultProps;
  }

  try {
    // Get the data fetch function from the map
    const fetchFunction = dataFetchFunctions[slug];
    
    // Execute the data fetch function
    const data = await fetchFunction();
    
    // Merge the fetched data with default props
    return {
      ...defaultProps,
      ...data
    };
  } catch (error) {
    console.error(`Error fetching component data for ${slug}:`, error);
    return defaultProps;
  }
} 