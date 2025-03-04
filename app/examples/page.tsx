import Link from "next/link";
import fs from "fs";
import path from "path";
import { createElement, Suspense, use } from "react";
import { ImageResponse } from "next/og";
import { renderBmp } from "@/utils/render-bmp";
import screens from "@/app/examples/screens.json";
import Image from "next/image";
import { AspectRatio } from "@/components/ui/aspect-ratio";

// Load fonts for bitmap rendering
const loadFont = () => {
  try {
    const blockKieFont = Buffer.from(
      fs.readFileSync(
        path.resolve('./public/fonts/BlockKie.ttf')
      )
    );
    console.log('Fonts loaded successfully');
    return blockKieFont;
  } catch (error) {
    console.error('Error loading fonts:', error);
    return null;
  }
};

const blockKieFont = loadFont();

// Get published components
const getPublishedComponents = () => {
  const componentEntries = Object.entries(screens);
  
  // Filter out unpublished components in production
  return process.env.NODE_ENV === "production"
    ? componentEntries.filter(([, config]) => config.published)
    : componentEntries;
};

// Generate bitmap preview for a component
const generateComponentPreview = async (slug: string, config: typeof screens[keyof typeof screens]) => {
  try {
    const { default: Component } = await import(
      `@/app/examples/screens/${slug}/${slug}.tsx`
    );
    
    if (!Component) {
      console.error(`Component not found for slug: ${slug}`);
      return null;
    }

    let props = config.props || {};
    if (config.hasDataFetch) {
      try {
        const { default: fetchDataFunction } = await import(
          `@/app/examples/screens/${slug}/getData.ts`
        );
        props = await fetchDataFunction();
      } catch (error) {
        console.error(`Error fetching data for ${slug}:`, error);
      }
    }

    const santoriOptions = {
      width: 800,
      height: 480,
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

    // Generate BMP image
    const pngResponse = await new ImageResponse(createElement(Component, props), santoriOptions);
    const bmpBuffer = await renderBmp(pngResponse);
    
    return bmpBuffer;
  } catch (error) {
    console.error(`Error generating preview for ${slug}:`, error);
    return null;
  }
};

// Component to display a preview with Suspense
const ComponentPreview = ({ slug, config }: { slug: string, config: typeof screens[keyof typeof screens] }) => {
  const previewPromise = generateComponentPreview(slug, config);
  const previewBuffer = use(previewPromise);
  
  if (!previewBuffer) {
    return (
      <AspectRatio ratio={5 / 3} className="bg-neutral-100 flex items-center justify-center p-0 border-b">
        <div className="text-gray-400">Preview not available</div>
      </AspectRatio>
    );
  }
  
  return (
    <AspectRatio ratio={5 / 3} className="bg-neutral-500 flex items-center justify-center p-0 border-b">
      <Image 
        src={`data:image/bmp;base64,${previewBuffer.toString('base64')}`} 
        alt={`${config.title} preview`}
        width={800}
        height={480}
        className="object-cover"
        style={{ 
          imageRendering: 'pixelated', 
        }} 
      />
    </AspectRatio>
  );
};

// Component for a single card
const ComponentCard = ({ slug, config }: { slug: string, config: typeof screens[keyof typeof screens] }) => {
  return (
    <Link 
      key={slug} 
      href={`/examples/${slug}`}
      className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full"
    >
      <Suspense 
        fallback={
          <AspectRatio ratio={5 / 3} className="bg-neutral-100 flex items-center justify-center p-0 border-b">
            <div className="text-gray-400">Loading preview...</div>
          </AspectRatio>
        }
      >
        <ComponentPreview slug={slug} config={config} />
      </Suspense>
      
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
  );
};

// Component for a category section
const CategorySection = ({ category, components }: { category: string, components: Array<[string, typeof screens[keyof typeof screens]]> }) => {
  return (
    <div key={category} className="mt-8">
      <h2 className="text-2xl font-semibold capitalize mb-4 border-b pb-2">
        {category.replace(/-/g, " ")}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {components.map(([slug, config]) => (
          <ComponentCard key={slug} slug={slug} config={config} />
        ))}
      </div>
    </div>
  );
};

// Main component that organizes components by category
const ComponentsGrid = () => {
  const publishedComponents = getPublishedComponents();
  
  // Group components by category
  const componentsByCategory = publishedComponents.reduce((acc, [slug, config]) => {
    const category = config.category || "uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push([slug, config]);
    return acc;
  }, {} as Record<string, Array<[string, typeof screens[keyof typeof screens]]>>);

  // Sort categories alphabetically
  const sortedCategories = Object.keys(componentsByCategory).sort();
  
  return (
    <div className="flex flex-col gap-8">
      {sortedCategories.map((category) => (
        <CategorySection 
          key={category} 
          category={category} 
          components={componentsByCategory[category]} 
        />
      ))}
    </div>
  );
};

export default function ExamplesIndex() {
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

        <Suspense fallback={<div className="w-full py-12 text-center">Loading components...</div>}>
          <ComponentsGrid />
        </Suspense>
      </div>
    </div>
  );
}

