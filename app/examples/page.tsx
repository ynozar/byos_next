import Link from "next/link";
import fs from "fs";
import path from "path";
import { createElement } from "react";
import { ImageResponse } from "next/og";
import { renderBmp } from "@/utils/render-bmp";
import components from "@/app/examples/components.json";
import Image from "next/image";

export default async function ExamplesIndex() {
  // Get all components from components.json
  const componentEntries = Object.entries(components);
  
  // Filter out unpublished components in production
  const publishedComponents = process.env.NODE_ENV === "production"
    ? componentEntries.filter(([, config]) => config.published)
    : componentEntries;

  // Load fonts for bitmap rendering
  let blockKieFont: Buffer | null = null;
  try {
    blockKieFont = Buffer.from(
      fs.readFileSync(
        path.resolve('./public/fonts/BlockKie.ttf')
      )
    );
  } catch (error) {
    console.error('Error loading fonts:', error);
  }

  const santoriOptions = {
    width: 400, // Smaller preview size
    height: 240, // Smaller preview size
    fonts: [
      ...(blockKieFont ? [{
        name: 'BlockKie',
        data: blockKieFont,
        weight: 400 as const,
        style: 'normal' as const,
      }] : [])
    ],
    debug: false,
  };

  // Generate bitmap previews for each component
  const componentsWithPreviews = await Promise.all(
    publishedComponents.map(async ([slug, config]) => {
      const { default: Component } = await import(
        `@/app/examples/screens/${slug}/${slug}.tsx`
      );
      
      if (!Component) {
        console.error(`Component not found for slug: ${slug}`);
        return { slug, config, previewBuffer: null };
      }

      let props = config.props || {};
      if (config.hasDataFetch) {
        const { default: fetchDataFunction } = await import(
          `@/app/examples/screens/${slug}/getData.ts`
        );
        props = await fetchDataFunction();
      }

      try {
        // Generate BMP image
        const pngResponse = await new ImageResponse(createElement(Component, props), santoriOptions);
        const bmpBuffer = await renderBmp(pngResponse);
        
        return { slug, config, previewBuffer: bmpBuffer };
      } catch (error) {
        console.error(`Error generating preview for ${slug}:`, error);
        return { slug, config, previewBuffer: null };
      }
    })
  );

  // Group components by category
  const componentsByCategory = componentsWithPreviews.reduce((acc, component) => {
    const category = component.config.category || "uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(component);
    return acc;
  }, {} as Record<string, typeof componentsWithPreviews>);

  // Sort categories alphabetically
  const sortedCategories = Object.keys(componentsByCategory).sort();

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-semibold">Screen Examples</h1>
          <p className="text-gray-600 mt-2">
            Explore and test components in both their direct rendering and bitmap (BMP) rendering forms.
            This examples page is designed to help develop and test components for e-ink displays.
          </p>
        </div>

        {sortedCategories.map((category) => (
          <div key={category} className="mt-8">
            <h2 className="text-2xl font-semibold capitalize mb-4 border-b pb-2">
              {category.replace(/-/g, " ")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {componentsByCategory[category].map(({ slug, config, previewBuffer }) => (
                <Link 
                  key={slug} 
                  href={`/examples/${slug}`}
                  className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full"
                >
                  {previewBuffer && (
                    <div className="w-full bg-gray-50 flex items-center justify-center p-4 border-b">
                      <Image 
                        src={`data:image/bmp;base64,${previewBuffer.toString('base64')}`} 
                        alt={`${config.title} preview`}
                        className="border border-gray-200 rounded-md"
                        style={{ 
                          imageRendering: 'pixelated', 
                          width: '200px', 
                          height: '120px',
                          objectFit: 'contain'
                        }} 
                      />
                    </div>
                  )}
                  
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
                      {config.title}
                    </h3>
                    <p className="text-gray-600 text-sm mt-2 mb-4 flex-grow">
                      {config.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {config.tags.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                      {config.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          +{config.tags.length - 3} more
                        </span>
                      )}
                    </div>
                    <div className="mt-4 text-xs text-gray-500 flex justify-between items-center">
                      <span>v{config.version}</span>
                      <span>{new Date(config.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

