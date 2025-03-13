import { cn } from "@/lib/utils";
import React from "react";

interface PreSatoriProps {
	useDoubling?: boolean;
	children: (
		transform: (child: React.ReactNode) => React.ReactNode,
		props: Record<
			string,
			React.CSSProperties | string | undefined | React.ReactNode
		>,
	) => React.ReactNode;
}

// Dither pattern mapping
const ditherPatterns: Record<
	string,
	{
		backgroundImage?: string;
		background?: string;
		backgroundSize?: string;
		backgroundColor?: string;
		backgroundRepeat?: string;
		imageRendering?: "auto" | "pixelated" | "crisp-edges";
		color?: string;
	}
> = {
	"dither-0": { background: "white" },
	"dither-15": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAB1JREFUKFNj/P///38GPIBxsCpgZGRkgLmdckcCAA+VIumpUMkGAAAAAElFTkSuQmCC)",
		backgroundSize: "8px 8px",
	},
	"dither-25": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAACVJREFUKFNj/P///38GPIARpICRkZEBlzqwAoImUF8BspsodwMApr8l6f1RibAAAAAASUVORK5CYII=)",
		backgroundSize: "8px 8px",
	},
	"dither-50": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAACRJREFUKFNj/P///38GPIARpICRkZEBWR0yH6yAoAmUK6CtGwAZEyvpL4ld4AAAAABJRU5ErkJggg==)",
		backgroundSize: "8px 8px",
	},
	"dither-100": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAACxJREFUKFNj/P///38GPICRgYEBRQ0jIyNIAK6FkaAJMAUYOqEmETaB9m4AABNDMekwLxh9AAAAAElFTkSuQmCC)",
		backgroundSize: "8px 8px",
	},
	"dither-150": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAADJJREFUKFNj/P///38GPICRgYEBRQ0jIyNIgAFOEzQBpgCmA2Yb8SbA3IBuN9wkit0AAG2IN+kEJ1tPAAAAAElFTkSuQmCC)",
		backgroundSize: "8px 8px",
	},
	"dither-250": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAB9JREFUKFNj/P///38GPICRgYEBrIaRkRHEwKSHhQkAfhtD6Ucw9IAAAAAASUVORK5CYII=)",
		backgroundSize: "8px 8px",
	},
	"dither-300": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAACpJREFUKFNj/P///38GPICRgYEBrIaRkRHEwKRBsjBJmEHIfOJMGGA3AADWlk/pFjm3rAAAAABJRU5ErkJggg==)",
		backgroundSize: "8px 8px",
	},
	"dither-400": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAC9JREFUKFNj/P///39GRkaG////M8AAMp+RgQEk958BJohBg2WhAJtJxJkwwG4AAJ1sVe/92Y1jAAAAAElFTkSuQmCC)",
		backgroundSize: "8px 8px",
	},
	"dither-450": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAC1JREFUKFNj/P///39GRkaG////M8AAMp+RgQEk958BJohBI5uATRFpJgyQGwD152Hv3xKg5QAAAABJRU5ErkJggg==)",
		backgroundSize: "8px 8px",
	},
	"dither-500": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAACNJREFUKFNjZGBg+P///38GRkZGEAOTBsnilGRkZGAcFiYAADCuZ/UGINVQAAAAAElFTkSuQmCC)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-550": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAC1JREFUKFNjZGBg+P///38GRkZGBhhA5jOCZEGSMEF0GqQNbgJWRSSZMEBuAAD0L1v7ZeLPqQAAAABJRU5ErkJggg==)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-600": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAADBJREFUKFNjZGBg+P///38GRkZGBhhA5jOCZEGSMEF0GqTtPzadIDGwYqJMGGA3AABsFE/7ZTZQPQAAAABJRU5ErkJggg==)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-700": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAC5JREFUKFNjZGBg+M+ABzD+////PyMjI8P///8ZsNGMIBNgkjCDkPnEmTDAbgAALhhEAQn0O+sAAAAASUVORK5CYII=)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-750": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAACJJREFUKFPdzDERAAAIgEDoHxoLeAaQ5TcE4sgqlYpNXxwGpe44ASPfdroAAAAASUVORK5CYII=)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-850": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAADdJREFUKFOljjEKADAMAvX/j77S4Tp0CIVmCSF62iRkmAK0PRIg+3bvz0xQoEPUO8EOd7ak/w4LB80mAaT38REAAAAASUVORK5CYII=)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-900": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAADBJREFUKFNjZGBg+M+ABzD+////PyMjI1zJ////GZD5IBn8JsAUoOuE8QmbQHs3AACVqSAB6oX+JwAAAABJRU5ErkJggg==)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-950": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAChJREFUKFNjZGBg+M+ABzCCFPz//5+BkRHEhABkPlgBQRMoV0BbNwAAmZ0UAR0pHrAAAAAASUVORK5CYII=)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-975": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAChJREFUKFNjZGBg+M+ABzCCFPz//5+BkRHExARgBQRNoL4CZDdR7gYAD4gOAY4oCDAAAAAASUVORK5CYII=)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-985": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAACFJREFUKFNjZGBg+M+ABzAOVgX///9nYGQEOY+BgXJHAgBsZwsBMq9u9gAAAABJRU5ErkJggg==)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-1000": { background: "black", color: "white" },
	dither: {
		backgroundRepeat: "repeat",
		imageRendering: "pixelated",
	},
};

/*
	This function helps Satori figure out the font size of the text.
*/
const calculateFontSize = (
	parentFontSize: number,
	className?: string,
): number => {
	if (!className) return parentFontSize;

	// Define Tailwind text size mappings
	const tailwindTextSizes: Record<string, number> = {
		"text-xs": 12,    // 0.75rem
		"text-sm": 14,    // 0.875rem
		"text-base": 16,  // 1rem
		"text-lg": 18,    // 1.125rem
		"text-xl": 20,    // 1.25rem
		"text-2xl": 24,   // 1.5rem
		"text-3xl": 30,   // 1.875rem
		"text-4xl": 36,   // 2.25rem
		"text-5xl": 48,   // 3rem
		"text-6xl": 60,   // 3.75rem
		"text-7xl": 72,   // 4.5rem
		"text-8xl": 96,   // 6rem
		"text-9xl": 128,  // 8rem
	};

	// Split the className into individual classes
	const classes = className.split(" ");

	// First check for standard Tailwind text size classes
	for (const cls of classes) {
		if (tailwindTextSizes[cls]) {
			return tailwindTextSizes[cls];
		}
	}

	// Then check for custom pixel-based size
	const fontSizeClass = classes.find((cls) => cls.startsWith("text-[") && cls.endsWith("px]"));
	
	if (fontSizeClass) {
		// Extract the numeric value from the class, e.g., text-[24px]
		const match = fontSizeClass.match(/text-\[(\d+)px\]/);
		if (match?.[1]) {
			return Number.parseInt(match[1], 10);
		}
	}

	// Return the parent font size if no specific font size class is found
	return parentFontSize;
};

// Calculate line height based on Tailwind text size classes
const calculateLineHeight = (
	fontSize: number,
	className?: string,
): number | undefined => {
	if (!className) return undefined;

	// Define Tailwind line height mappings based on text size classes
	const tailwindLineHeights: Record<string, number> = {
		"text-xs": 1 / 0.75,      // calc(1 / 0.75)
		"text-sm": 1.25 / 0.875,  // calc(1.25 / 0.875)
		"text-base": 1.5 / 1,     // calc(1.5 / 1)
		"text-lg": 1.75 / 1.125,  // calc(1.75 / 1.125)
		"text-xl": 1.75 / 1.25,   // calc(1.75 / 1.25)
		"text-2xl": 2 / 1.5,      // calc(2 / 1.5)
		"text-3xl": 2.25 / 1.875, // calc(2.25 / 1.875)
		"text-4xl": 2.5 / 2.25,   // calc(2.5 / 2.25)
		"text-5xl": 1,            // 1
		"text-6xl": 1,            // 1
		"text-7xl": 1,            // 1
		"text-8xl": 1,            // 1
		"text-9xl": 1,            // 1
	};

	// Split the className into individual classes
	const classes = className.split(" ");

	// Check for Tailwind text size classes to determine line height
	for (const cls of classes) {
		if (tailwindLineHeights[cls]) {
			return tailwindLineHeights[cls] * fontSize;
		}
	}

	// If no specific line height class is found, return undefined
	return undefined;
};

// Add new helper function to extract font family
const extractFontFamily = (className?: string): string | undefined => {
	if (!className) return undefined;

	// Look for font-* classes
	const fontClass = className
		.split(" ")
		.find((cls) => cls.startsWith("font-"));

	if (fontClass) {
		switch (fontClass) {
			case "font-blockkie":
				return "BlockKie";
			case "font-geneva9":
				return "Geneva9";
			default:
				return undefined;
		}
	}
	return undefined;
};

export const PreSatori: React.FC<PreSatoriProps> = ({ useDoubling = false, children, ...props }) => {
	// Define a helper to recursively transform children.
	const transform = (
		child: React.ReactNode,
		parentFontSize = 16,
	): React.ReactNode => {
		if (React.isValidElement(child)) {
			const newProps: {
				className?: string;
				style?: React.CSSProperties;
				children?: React.ReactNode;
				tw?: string;
			} = {};
			const { className, style, children, ...restProps } = child.props as {
				className?: string;
				style?: React.CSSProperties;
				children?: React.ReactNode;
				[key: string]:
					| React.CSSProperties
					| string
					| undefined
					| React.ReactNode;
			};

			// Calculate the font size
			const fontSize = calculateFontSize(parentFontSize, className);

			// Extract font family
			const fontFamily = extractFontFamily(className);

			// Handle style props
			const newStyle: React.CSSProperties = {
				...style,
				fontSize: `${fontSize}px`,
				...(fontFamily ? { fontFamily } : {}),
				fontSmooth: "always",
			};
			if (child.type === "div") {
				newStyle.display = "flex";
			}

			// Process className for dither patterns
			if (className) {
				const remainingClassName: string[] = [];
				// Extract dither classes
				const classes = className.split(" ");
				// Check for dither classes and apply their styles
				for (const cls of classes) {
					if (cls.startsWith("dither-")) {
						Object.assign(newStyle, ditherPatterns[cls], ditherPatterns.dither);
					} else {
						// Add non-dither classes to the front
						remainingClassName.push(cls);
					}
				}

				if (
					child.type === "h1" ||
					child.type === "h2" ||
					child.type === "h3" ||
					child.type === "h4" ||
					child.type === "h5" ||
					child.type === "p" ||
					child.type === "span" ||
					child.type === "div"
				) {
					const baseClasses =
						"antialiased m-0 p-0 border-0 outline-none bg-transparent shadow-none text-inherit font-inherit leading-none tracking-normal appearance-none select-none align-baseline list-none no-underline";
					newProps.className = cn(baseClasses, remainingClassName.join(" ")); // for tailwind engine on normal website rendering
					newProps.tw = cn(baseClasses, remainingClassName.join(" "));// Set the transformed classes for satori rendering
				}
			}

			// Apply the combined styles
			if (Object.keys(newStyle).length > 0) {
				newProps.style = newStyle;
			}

			// If the element has children, transform them recursively.
			if (children) {
				newProps.children = React.Children.map(children, (child) =>
					transform(child, fontSize),
				);
			}

			return React.cloneElement(child, { ...restProps, ...newProps });
		}
		return child;
	};

	// The render prop provides the transformation helper to the parent.
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: "100%",
				fontFamily: "BlockKie",
				color: "black",
				backgroundColor: "#ffffff",
				fontSize: "16px",
				transformOrigin: "top left",
				...(useDoubling ? {transform: "scale(2)"} : {}),
			}}
		>
			{children(transform, props)}
		</div>
	);
};
