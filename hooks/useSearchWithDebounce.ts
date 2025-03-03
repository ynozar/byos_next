import { useCallback, useEffect, useRef } from "react"

/**
 * Custom hook for handling debounced search functionality with proper dependency handling
 * Solves the react-hooks/exhaustive-deps warning by using refs to stabilize dependencies
 * 
 * @param searchQuery - Current search query from URL params
 * @param page - Current page number from URL params
 * @param createQueryString - Function to create query string for URL
 * @param pathname - Current pathname
 * @param router - Next.js router instance
 * @param delay - Debounce delay in milliseconds
 * @returns A debounced search function that updates URL params
 */
export function useSearchWithDebounce(
  searchQuery: string,
  page: number,
  createQueryString: (params: Record<string, string | number | null>) => string,
  pathname: string,
  router: { push: (url: string, options?: { scroll: boolean }) => void },
  delay: number = 500
) {
  // Use refs to avoid dependency issues with useCallback
  const searchQueryRef = useRef(searchQuery);
  const pageRef = useRef(page);
  const createQueryStringRef = useRef(createQueryString);
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);
  
  // Update refs when props change
  useEffect(() => {
    searchQueryRef.current = searchQuery;
    pageRef.current = page;
    createQueryStringRef.current = createQueryString;
    pathnameRef.current = pathname;
    routerRef.current = router;
  }, [searchQuery, page, createQueryString, pathname, router]);
  
  // Create the debounced search function with stable dependencies
  return useCallback((value: string) => {
    const timeoutId = setTimeout(() => {
      const queryString = createQueryStringRef.current({
        search: value || null,
        page: value !== searchQueryRef.current ? 1 : pageRef.current, // Reset to page 1 on new search
      });
      routerRef.current.push(`${pathnameRef.current}?${queryString}`, { scroll: false });
    }, delay);
    
    return () => clearTimeout(timeoutId);
  }, [delay]); // Only delay as a dependency
} 