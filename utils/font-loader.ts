import fs from "fs";
import path from "path";
import { cache } from "react";

// Load fonts once at module initialization time
export const fonts = cache(() => {
	try {
		return {
			blockKie: fs.readFileSync(path.resolve("./public/fonts/BlockKie.ttf")),
		};
	} catch (error) {
		console.error("Error loading font:", error);
		return { blockKie: null };
	}
})();
