# Component Examples

This examples page allows you to visualize and test components in both their direct rendering and bitmap (BMP) rendering forms. It's designed to help develop and test components for e-ink displays.

## How It Works

The examples page provides two main views:

1. **Index View** (`/examples`) - Shows a list of all available screens grouped by category
2. **Screen View** (`/examples/[slug]`) - Shows a specific screen with both direct and BMP rendering

Each screen is defined in `app/components.json` and can be accessed via its slug.

## Adding New Screen

To add a new screen to the examples:

1. Create your screen folder in the `app/screens` directory
2. Add your my-component.tsx and get-data.ts to the screen folder
3. Add an entry to `app/components.json` with the following structure:

```json
{
  "component-slug": {
    "title": "Component Title",
    "published": true,
    "createdAt": "YYYY-MM-DDT00:00:00Z",
    "updatedAt": "YYYY-MM-DDT00:00:00Z",
    "description": "A description of your component",
    "componentPath": "../screens/YourComponent",
    "hasDataFetch": false,
    "props": {
      // Default props for your component
      "propName": "propValue"
    },
    "tags": ["tag1", "tag2"],
    "author": {
      "name": "Your Name",
      "github": "yourgithubusername"
    },
    "version": "0.1.0",
    "category": "component-category"
  }
}
```

The component will automatically appear in the sidebar navigation and on the index page.

## Data Fetching

If your component requires dynamic data, you can create a data fetch function:

1. Create a file in `app/data` (e.g., `app/data/your-component-data.ts`) that exports a named function:

```typescript
export async function fetchYourComponentData() {
  // Fetch or generate your data here
  return {
    propName: "propValue",
    // Other props
  };
}

export default fetchYourComponentData;
```

2. Add the function to the `dataFetchFunctions` map in `utils/component-data.ts`:

```typescript
const dataFetchFunctions: Record<string, DataFetchFunction> = {
  "tailwind-test": fetchTailwindTestData,
  "your-component-slug": fetchYourComponentData,
  // Add more data fetch functions here as needed
};
```

3. Set `hasDataFetch` to `true` in your component's entry in `components.json`

The playground will automatically fetch the data and pass it as props to your component.

## Bitmap Rendering

The playground uses the `renderBmp` utility to convert components to bitmap images suitable for e-ink displays. The rendering process:

1. Uses Next.js's `ImageResponse` to render the component to a PNG
2. Converts the PNG to a 1-bit BMP using the `renderBmp` utility
3. Displays the BMP image alongside the direct component rendering

This allows you to see exactly how your component will look on an e-ink display.

## Routing

The playground uses Next.js's dynamic routing to provide two main views:

- `/playground` - Index view showing all components
- `/playground/[slug]` - Detailed view of a specific component

The `generateStaticParams` function in `app/playground/[slug]/page.tsx` ensures that all component pages are pre-rendered at build time. 