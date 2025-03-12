"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Columns2, Rows2 } from "lucide-react";

type LayoutToggleProps = {
	defaultLayout?: "columns" | "rows";
	onLayoutChange?: (layout: "columns" | "rows") => void;
} & React.HTMLAttributes<HTMLDivElement>;

const LayoutToggle = React.forwardRef<HTMLDivElement, LayoutToggleProps>(
	({ className, defaultLayout = "columns", onLayoutChange, ...props }, ref) => {
		const [layout, setLayout] = React.useState<"columns" | "rows">(
			defaultLayout,
		);

		const handleLayoutChange = (newLayout: "columns" | "rows") => {
			setLayout(newLayout);
			onLayoutChange?.(newLayout);
		};

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
					onClick={() => handleLayoutChange("columns")}
					className={cn(
						"inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
						layout === "columns"
							? "bg-primary text-primary-foreground"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
				>
					<Columns2 className="h-4 w-4" />
				</button>
				<button
					type="button"
					onClick={() => handleLayoutChange("rows")}
					className={cn(
						"inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
						layout === "rows"
							? "bg-primary text-primary-foreground"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
				>
					<Rows2 className="h-4 w-4" />
				</button>
			</div>
		);
	},
);

LayoutToggle.displayName = "LayoutToggle";

const RecipePreviewLayout = ({ children }: { children: React.ReactNode }) => {
	const [layout, setLayout] = React.useState<"columns" | "rows">("columns");

	return (
		<div className="flex flex-col gap-4 items-start">
			<LayoutToggle onLayoutChange={setLayout} />
			<div
				className={cn(
					"grid grid-cols-2 gap-4 w-[calc(800px*2+var(--spacing)*4)]",
					layout === "rows" && "grid-cols-1 w-[800px]",
				)}
			>
				{children}
			</div>
		</div>
	);
};

RecipePreviewLayout.displayName = "RecipePreviewLayout";

export { RecipePreviewLayout };
