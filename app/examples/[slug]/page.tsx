import fs from "fs";
import path from "path";
import { createElement } from "react";
import { ImageResponse } from "next/og";
import { renderBmp } from "@/utils/render-bmp";
import components from "@/app/examples/components.json";
import { notFound } from "next/navigation";
import Image from "next/image";
import { AspectRatio } from "@/components/ui/aspect-ratio"



export async function generateStaticParams() {
  return Object.keys(components).map((slug) => ({ slug }));
}

export default async function ComponentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const config = components[slug as keyof typeof components];

  if (!config || (!config.published && process.env.NODE_ENV === "production")) {
    notFound();
  }

  let blockKieFont: Buffer | null = null;

  // Load fonts as Buffer for Node.js as specified in Satori docs
  try {
    blockKieFont = Buffer.from(
      fs.readFileSync(
        path.resolve('./public/fonts/BlockKie.ttf')
      )
    );
    console.log('Fonts loaded successfully');
  } catch (error) {
    console.error('Error loading fonts:', error);
  }

  const santoriOptions = {
    width: 800,
    height: 480,
    fonts: [
      ...(blockKieFont ? [{
        name: 'BlockKie',
        data: blockKieFont,
        weight: 400 as const, // Type assertion for weight
        style: 'normal' as const, // Type assertion for style
      }] : [])
    ],
    debug: false, // this draws boundary lines around the text, no need for it!
  };


  const { default: Component } = await import(
    `@/app/examples/screens/${slug}/${slug}.tsx`
  );

  if (!Component) {
    notFound();
  }

  let props = config.props || {};
  if (config.hasDataFetch) {
    const { default: fetchDataFunction } = await import(
      `@/app/examples/screens/${slug}/getData.ts`
    );
    props = await fetchDataFunction();
  }
  // Generate BMP image
  const pngResponse = await new ImageResponse(createElement(Component, props), santoriOptions);
  const bmpBuffer = await renderBmp(pngResponse);

  return (
    <div className="w-full p-4 md:p-6">
      <div className="flex flex-col gap-8 mb-6">
        <div className="border-b pb-4 mb-4">
          <h1 className="text-3xl font-semibold">{config.title}</h1>
          <p className="mt-2">{config.description}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {config.tags.map((tag: string) => (
              <span key={tag} className="px-2 py-1 bg-gray-100 text-muted-foreground text-xs rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Version: {config.version}</p>
            <p>Created: {new Date(config.createdAt).toLocaleDateString()}</p>
            <p>Updated: {new Date(config.updatedAt).toLocaleDateString()}</p>
            <p>Author: {config.author.name} (<a href={`https://github.com/${config.author.github}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">@{config.author.github}</a>)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 w-full">
          <div className="flex flex-col gap-4" style={{ width: '40vw' }}>
            <h2 className="text-xl font-semibold text-center mb-4">BMP Render</h2>
            <p className="text-center mb-4">Bitmap rendering of the component</p>
            <AspectRatio ratio={5 / 3}>
              <Image
                width={800}
                height={480}
                src={`data:image/bmp;base64,${bmpBuffer.toString('base64')}`}
                style={{ imageRendering: 'pixelated' }}
                alt={`${config.title} BMP render`}
                className="border border-gray-200 rounded-xs w-full object-cover"
              />
            </AspectRatio>
          </div>
          <div className="flex flex-col gap-4" style={{ width: '40vw' }}>
            <h2 className="text-xl font-semibold text-center mb-4">Direct Component</h2>
            <p className="text-center mb-4">Direct rendering of the component</p>
            <div className="w-full *:origin-top-left *:scale-[calc(0.6)] md:*:scale-[calc((768-224)/4/480)] lg:*:scale-[calc((1024-224)/4/480)] xl:*:scale-[calc((1280-224)/4/480)] 2xl:*:scale-[calc((1536-224)/2/480)]">
              <Component {...props} />
            </div>
          </div>
        </div>

        {Object.keys(props).length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Component Props</h2>
            <pre className="p-4 rounded-md overflow-x-auto">
              {JSON.stringify(props, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div >
  );
} 