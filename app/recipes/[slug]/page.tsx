import fs from "fs";
import path from "path";
import { createElement, Suspense, use } from "react";
import { ImageResponse } from "next/og";
import { renderBmp } from "@/utils/render-bmp";
import screens from "@/app/recipes/screens.json";
import { notFound } from "next/navigation";
import Image from "next/image";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { RecipePreviewLayout } from "@/components/recipes/recipe-preview-layout";
import { revalidateTag } from "next/cache";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
// Load fonts as Buffer for Node.js as specified in Satori docs
const loadFont = () => {
	try {
		const blockKieFont = Buffer.from(
			fs.readFileSync(path.resolve("./public/fonts/BlockKie.ttf")),
		);
		console.log("Fonts loaded successfully");
		return blockKieFont;
	} catch (error) {
		console.error("Error loading fonts:", error);
		return null;
	}
};

const blockKieFont = loadFont();

export async function generateStaticParams() {
	return Object.keys(screens).map((slug) => ({ slug }));
}

// Separate data fetching functions for better Suspense support
const fetchConfig = (slug: string) => {
	const config = screens[slug as keyof typeof screens];
	if (!config || (!config.published && process.env.NODE_ENV === "production")) {
		return null;
	}
	return config;
};

const fetchComponent = async (slug: string) => {
	try {
		const { default: Component } = await import(
			`@/app/recipes/screens/${slug}/${slug}.tsx`
		);
		return Component;
	} catch (error) {
		console.error(`Error loading component for ${slug}:`, error);
		return null;
	}
};

const fetchProps = async (
	slug: string,
	config: (typeof screens)[keyof typeof screens],
) => {
	let props = config.props || {};
	if (config.hasDataFetch) {
		try {
			const { default: fetchDataFunction } = await import(
				`@/app/recipes/screens/${slug}/getData.ts`
			);
			props = await fetchDataFunction();
		} catch (error) {
			console.error(`Error fetching data for ${slug}:`, error);
		}
	}
	return props;
};

const generateBitmap = async (
	Component: React.ComponentType<
		(typeof screens)[keyof typeof screens]["props"]
	>,
	props: (typeof screens)[keyof typeof screens]["props"],
) => {
	try {
		const santoriOptions = {
			width: 800,
			height: 480,
			fonts: [
				...(blockKieFont
					? [
							{
								name: "BlockKie",
								data: blockKieFont,
								weight: 400 as const,
								style: "normal" as const,
							},
						]
					: []),
			],
			debug: false,
		};

		const pngResponse = await new ImageResponse(
			createElement(Component, props),
			santoriOptions,
		);
		return await renderBmp(pngResponse);
	} catch (error) {
		console.error("Error generating bitmap:", error);
		return null;
	}
};

// Component to render the bitmap image
const BitmapImage = ({
	bmpBuffer,
	title,
}: { bmpBuffer: Buffer; title: string }) => {
	return (
		<Image
			width={800}
			height={480}
			src={`data:image/bmp;base64,${bmpBuffer.toString("base64")}`}
			style={{ imageRendering: "pixelated" }}
			alt={`${title} BMP render`}
			className="w-full object-cover"
		/>
	);
};

// Component to render the component props
const RecipeProps = ({
	props,
	slug,
}: {
	props: (typeof screens)[keyof typeof screens]["props"];
	slug: string;
}) => {
	if (Object.keys(props).length === 0) return null;

	async function refreshData() {
		"use server";
		revalidateTag(slug);
	}
	return (
		<div className="mt-8">
			<form
				action={refreshData}
				className="flex flex-row gap-2 items-center mb-4"
			>
				<h2 className="text-xl font-semibold">Recipe Props</h2>
				<Button type="submit">
					<RefreshCcw className="size-4" />
				</Button>
			</form>
			<pre className="p-4 rounded-md overflow-x-auto bg-muted">
				{JSON.stringify(props, null, 2)}
			</pre>
		</div>
	);
};

// Component to render the bitmap with Suspense
const SuspendedBitmap = ({
	Component,
	props,
	title,
}: {
	Component: React.ComponentType<
		(typeof screens)[keyof typeof screens]["props"]
	>;
	props: (typeof screens)[keyof typeof screens]["props"];
	title: string;
}) => {
	// Create a promise for the bitmap generation
	const bmpPromise = generateBitmap(Component, props);
	const bmpBuffer = use(bmpPromise);

	if (!bmpBuffer) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				Failed to generate bitmap
			</div>
		);
	}

	return <BitmapImage bmpBuffer={bmpBuffer} title={title} />;
};

// Main component that uses the data
const RecipeContent = ({ slug }: { slug: string }) => {
	// Fetch config first
	const config = fetchConfig(slug);
	if (!config) {
		notFound();
	}

	// Create promises for component and props
	const componentPromise = fetchComponent(slug);
	const Component = use(componentPromise);

	if (!Component) {
		notFound();
	}

	// Fetch props with Suspense
	const propsPromise = fetchProps(slug, config);
	const props = use(propsPromise);

	return (
		<div className="@container">
			<div className="flex flex-col">
				<div className="border-b pb-4 mb-4">
					<Suspense
						fallback={
							<>
								<h1 className="text-3xl font-semibold">Loading...</h1>
								<p className="mt-2 max-w-prose">Loading...</p>
							</>
						}
					>
						<h1 className="text-3xl font-semibold">{config.title}</h1>
						<p className="mt-2 max-w-prose">{config.description}</p>
					</Suspense>
				</div>

				<RecipePreviewLayout>
					<div className="flex flex-col gap-0 mb-2">
						<div className="w-[800px] h-[480px] ring-2 ring-gray-200 rounded-xs">
							<AspectRatio ratio={5 / 3}>
								<Suspense
									fallback={
										<div className="w-full h-full flex items-center justify-center">
											Rendering bitmap...
										</div>
									}
								>
									<SuspendedBitmap
										Component={Component}
										props={props}
										title={config.title}
									/>
								</Suspense>
							</AspectRatio>
						</div>
						<p className="leading-7">Bitmap rendering of the recipe</p>
					</div>
					<div className="flex flex-col gap-0">
						<div className="w-[800px] h-[480px] ring-2 ring-gray-200 rounded-xs">
							<AspectRatio ratio={5 / 3} className="w-[800px] h-[480px]">
								<Suspense
									fallback={
										<div className="w-full h-full flex items-center justify-center">
											Rendering recipe...
										</div>
									}
								>
									<Component {...props} />
								</Suspense>
							</AspectRatio>
						</div>
						<p className="leading-7">Direct rendering of the recipe</p>
					</div>
				</RecipePreviewLayout>

				{config.hasDataFetch && (
					<Suspense
						fallback={
							<div className="w-full h-full flex items-center justify-center">
								Loading props...
							</div>
						}
					>
						<RecipeProps props={props} slug={slug} />
					</Suspense>
				)}
			</div>
		</div>
	);
};

export default async function RecipePage({
	params,
}: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;

	return (
		<Suspense
			fallback={
				<div className="w-full h-full flex items-center justify-center">
					Loading recipe...
				</div>
			}
		>
			<RecipeContent slug={slug} />
		</Suspense>
	);
}
