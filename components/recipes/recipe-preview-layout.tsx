"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Columns2, Rows2, ZoomIn, ZoomOut } from "lucide-react";

type LayoutToggleProps = {
	layout: "columns" | "rows";
	onLayoutChange: (layout: "columns" | "rows") => void;
} & React.HTMLAttributes<HTMLDivElement>;

const LayoutToggle = React.forwardRef<HTMLDivElement, LayoutToggleProps>(
	({ className, layout, onLayoutChange, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					"inline-flex items-center rounded-md border bg-muted p-1",
					className,
				)}
				{...props}
			>
				<button
					type="button"
					onClick={() => onLayoutChange("columns")}
					className={cn(
						"inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
						layout === "columns"
							? "bg-primary text-primary-foreground"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
					aria-label="Column layout"
				>
					<Columns2 className="h-4 w-4" />
				</button>
				<button
					type="button"
					onClick={() => onLayoutChange("rows")}
					className={cn(
						"inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
						layout === "rows"
							? "bg-primary text-primary-foreground"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
					aria-label="Row layout"
				>
					<Rows2 className="h-4 w-4" />
				</button>
			</div>
		);
	},
);

LayoutToggle.displayName = "LayoutToggle";

type ScaleToggleProps = {
	scale: "full" | "half";
	onScaleChange: (scale: "full" | "half") => void;
} & React.HTMLAttributes<HTMLDivElement>;

const ScaleToggle = React.forwardRef<HTMLDivElement, ScaleToggleProps>(
	({ className, scale, onScaleChange, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					"inline-flex items-center rounded-md border bg-muted p-1",
					className,
				)}
				{...props}
			>
				<button
					type="button"
					onClick={() => onScaleChange("full")}
					className={cn(
						"inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
						scale === "full"
							? "bg-primary text-primary-foreground"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
					aria-label="Full scale (1x)"
				>
					<ZoomIn className="h-4 w-4" />
				</button>
				<button
					type="button"
					onClick={() => onScaleChange("half")}
					className={cn(
						"inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
						scale === "half"
							? "bg-primary text-primary-foreground"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
					aria-label="Half scale (0.5x)"
				>
					<ZoomOut className="h-4 w-4" />
				</button>
			</div>
		);
	},
);

ScaleToggle.displayName = "ScaleToggle";

type RecipePreviewLayoutProps = {
	children: React.ReactNode;
	defaultLayout?: "columns" | "rows";
	defaultScale?: "full" | "half";
};

const RecipePreviewLayout = ({
	children,
	defaultLayout = "columns",
	defaultScale = "full",
}: RecipePreviewLayoutProps) => {
	const [layout, setLayout] = React.useState<"columns" | "rows">(defaultLayout);
	const [scale, setScale] = React.useState<"full" | "half">(defaultScale);
	const [isInitialized, setIsInitialized] = React.useState(false);
	
	// Constants for width calculations
	const singleColumnWidth = 800+2; // adding 2px for the border
	const spacing = 16; // This is equivalent to gap-4 in Tailwind (4 * 4px)

	// Load saved preferences from localStorage on component mount
	React.useEffect(() => {
		// Use a non-blocking approach to read from localStorage
		const loadPreferences = () => {
			try {
				const savedLayout = localStorage.getItem("recipePreviewLayout") as "columns" | "rows" | null;
				const savedScale = localStorage.getItem("recipePreviewScale") as "full" | "half" | null;
				
				if (savedLayout) {
					setLayout(savedLayout);
				}
				
				if (savedScale) {
					setScale(savedScale);
				}
				
				setIsInitialized(true);
			} catch (error) {
				console.error("Error loading preferences from localStorage:", error);
				setIsInitialized(true);
			}
		};

		// Use requestIdleCallback for non-blocking operation if available
		if (typeof window !== 'undefined') {
			if ('requestIdleCallback' in window) {
				(window as unknown as Window).requestIdleCallback(loadPreferences);
			} else {
				// Fallback to setTimeout for browsers that don't support requestIdleCallback
				setTimeout(loadPreferences, 0);
			}
		}
	}, []);

	// Handle layout change
	const handleLayoutChange = React.useCallback((newLayout: "columns" | "rows") => {
		setLayout(newLayout);
		// Defer localStorage update to not block rendering
		setTimeout(() => {
			try {
				localStorage.setItem("recipePreviewLayout", newLayout);
			} catch (error) {
				console.error("Error saving layout preference:", error);
			}
		}, 0);
	}, []);

	// Handle scale change
	const handleScaleChange = React.useCallback((newScale: "full" | "half") => {
		setScale(newScale);
		// Defer localStorage update to not block rendering
		setTimeout(() => {
			try {
				localStorage.setItem("recipePreviewScale", newScale);
			} catch (error) {
				console.error("Error saving scale preference:", error);
			}
		}, 0);
	}, []);

	// Calculate width based on layout

	const getContainerWidth = React.useCallback(({ l, sCW, sP }: { l: "columns" | "rows", sCW: number, sP: number }) => {
		if (l === "columns") {
			return `${sCW * 2 + sP * 3}px`;
		}
		return `${sCW}px`;
	}, []);

	// If not initialized yet, render a placeholder with the same dimensions
	// to prevent layout shifts when preferences load
	if (!isInitialized) {
		return (
			<div className="flex flex-col gap-4 items-start">
				<div className="flex gap-2">
					<div className="inline-flex items-center rounded-md border bg-muted p-1 h-10 w-24" />
					<div className="inline-flex items-center rounded-md border bg-muted p-1 h-10 w-24" />
				</div>
				<div className="w-full">
					<div 
						className="grid gap-4 transition-all duration-200 grid-cols-2"
						style={{ width: `${singleColumnWidth * 2 + spacing * 3}px` }}
					>
						{children}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 items-start">
			<div className="flex gap-2">
				<LayoutToggle 
					layout={layout} 
					onLayoutChange={handleLayoutChange} 
				/>
				<ScaleToggle 
					scale={scale} 
					onScaleChange={handleScaleChange} 
				/>
			</div>
			<div className={cn(
				"w-full",
				layout === "rows" && "max-w-full overflow-x-auto pb-4"
			)}>
				<div
					className={cn(
						"grid gap-4 transition-all duration-200",
						layout === "columns" ? "grid-cols-2" : "grid-cols-1",
						scale === "half" && "transform scale-50 origin-top-left"
					)}
					style={{
						width: getContainerWidth({ l: layout, sCW: singleColumnWidth, sP: spacing }),
						height: scale === "half" ? "200%" : "auto",
					}}
				>
					{children}
				</div>
			</div>
		</div>
	);
};

RecipePreviewLayout.displayName = "RecipePreviewLayout";

export { RecipePreviewLayout };
