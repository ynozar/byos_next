import { z } from "zod";

// Define the schema for PostgreSQL connection URL
export const postgresUrlSchema = z.object({
	protocol: z.string().refine((val) => val === "postgresql", {
		message: "Protocol must be 'postgresql'",
	}),
	username: z.string().min(1, "Username is required"),
	password: z
		.string()
		.min(1, "Password is required")
		.refine((val) => val !== "[YOUR-PASSWORD]", {
			message: "Please replace with your actual password",
		}),
	host: z.string().min(1, "Host is required"),
	port: z.string().optional(),
	database: z.string().optional(),
});

export type PostgresUrlParts = z.infer<typeof postgresUrlSchema>;

// Function to extract parts from a connection URL
export function extractUrlParts(url: string): {
	protocol: string;
	username: string;
	password: string;
	host: string;
	port: string;
	database: string;
	isValid: boolean;
	errors: Record<string, string>;
} {
	// Default return for invalid URLs
	const defaultReturn = {
		protocol: "",
		username: "",
		password: "",
		host: "",
		port: "",
		database: "",
		isValid: false,
		errors: {},
	};

	try {
		// Remove DATABASE_URL= prefix if present
		let cleanUrl = url.trim();
		if (cleanUrl.startsWith("DATABASE_URL=")) {
			cleanUrl = cleanUrl.substring("DATABASE_URL=".length).trim();
		}

		// Basic validation
		if (!cleanUrl) {
			return { ...defaultReturn, errors: { general: "URL is empty" } };
		}

		if (!cleanUrl.includes("://")) {
			return {
				...defaultReturn,
				errors: { protocol: "Missing protocol (postgresql://)" },
			};
		}

		if (!cleanUrl.includes("@")) {
			return { ...defaultReturn, errors: { general: "Missing @ separator" } };
		}

		// Extract protocol
		const protocolSplit = cleanUrl.split("://");
		const protocol = protocolSplit[0].toLowerCase();
		const restAfterProtocol = protocolSplit[1];

		// Find the position of the @ that separates credentials from host
		const atPos = restAfterProtocol.lastIndexOf("@");
		if (atPos === -1) {
			return { ...defaultReturn, errors: { general: "Invalid URL format" } };
		}

		// Extract credentials and host parts
		const credentials = restAfterProtocol.substring(0, atPos);
		const hostPart = restAfterProtocol.substring(atPos + 1);

		// Extract username and password
		const colonPos = credentials.indexOf(":");
		if (colonPos === -1) {
			return {
				...defaultReturn,
				errors: { password: "Missing password separator (:)" },
			};
		}

		const username = credentials.substring(0, colonPos);
		const password = credentials.substring(colonPos + 1);

		// Extract host, port, and database
		let host = hostPart;
		let port = "";
		let database = "";

		// Extract port if present
		const portPos = hostPart.indexOf(":");
		if (portPos !== -1) {
			host = hostPart.substring(0, portPos);
			const afterPort = hostPart.substring(portPos + 1);

			// Extract database if present
			const slashPos = afterPort.indexOf("/");
			if (slashPos !== -1) {
				port = afterPort.substring(0, slashPos);
				database = afterPort.substring(slashPos + 1);
			} else {
				port = afterPort;
			}
		} else {
			// Check for database without port
			const slashPos = hostPart.indexOf("/");
			if (slashPos !== -1) {
				host = hostPart.substring(0, slashPos);
				database = hostPart.substring(slashPos + 1);
			}
		}

		// Validate the parts
		const errors: Record<string, string> = {};

		if (protocol !== "postgresql") {
			errors.protocol = "Protocol must be 'postgresql'";
		}

		if (!username) {
			errors.username = "Username is required";
		}

		if (!password) {
			errors.password = "Password is required";
		} else if (password === "[YOUR-PASSWORD]") {
			errors.password = "Please replace with your actual password";
		}

		if (!host) {
			errors.host = "Host is required";
		}

		const isValid = Object.keys(errors).length === 0;

		return {
			protocol,
			username,
			password,
			host,
			port,
			database,
			isValid,
			errors,
		};
	} catch (error) {
		return {
			...defaultReturn,
			errors: { general: `Invalid URL format: ${error}` },
		};
	}
}

// Function to validate a PostgreSQL connection URL
export function validatePostgresUrl(url: string): {
	isValid: boolean;
	errors: Record<string, string>;
	parts: {
		protocol: string;
		username: string;
		password: string;
		host: string;
		port: string;
		database: string;
	};
} {
	const result = extractUrlParts(url);

	return {
		isValid: result.isValid,
		errors: result.errors,
		parts: {
			protocol: result.protocol,
			username: result.username,
			password: result.password,
			host: result.host,
			port: result.port,
			database: result.database,
		},
	};
}

// Function to fix common issues in PostgreSQL URLs
export function fixCommonUrlIssues(url: string): string {
	// Remove leading/trailing whitespace
	let fixedUrl = url.trim();

	// Remove DATABASE_URL= prefix if present (we'll add it back later if needed)
	if (fixedUrl.startsWith("DATABASE_URL=")) {
		fixedUrl = fixedUrl.substring("DATABASE_URL=".length).trim();
	}

	// If empty, return a template
	if (!fixedUrl) {
		return "postgresql://username:[YOUR-PASSWORD]@host:port/database";
	}

	// Fix protocol
	if (!fixedUrl.includes("://")) {
		fixedUrl = `postgresql://${fixedUrl}`;
	} else {
		const protocolParts = fixedUrl.split("://");
		const protocol = protocolParts[0].toLowerCase();

		// Fix common protocol misspellings
		if (protocol !== "postgresql") {
			const commonMisspellings = [
				"postgres",
				"postgre",
				"postgress",
				"postgressql",
				"postgrsql",
				"psql",
			];

			if (commonMisspellings.includes(protocol)) {
				fixedUrl = `postgresql://${protocolParts[1]}`;
			}
		}
	}

	// Ensure there's an @ symbol for credentials
	if (!fixedUrl.includes("@")) {
		// If no credentials part exists, insert a placeholder
		const protocolParts = fixedUrl.split("://");
		if (protocolParts.length === 2) {
			fixedUrl = `${protocolParts[0]}://username:[YOUR-PASSWORD]@${protocolParts[1]}`;
		}
	} else {
		// Check if username:password format is correct
		const parts = fixedUrl.split("://");
		if (parts.length === 2) {
			const credentialsPart = parts[1].split("@")[0];
			if (!credentialsPart.includes(":")) {
				// If there's a username but no password
				fixedUrl = fixedUrl.replace(
					`${credentialsPart}@`,
					`${credentialsPart}:[YOUR-PASSWORD]@`,
				);
			}
		}
	}

	return fixedUrl;
}

// Function to build a PostgreSQL URL from parts
export function buildPostgresUrl(parts: Partial<PostgresUrlParts>): string {
	const {
		protocol = "postgresql",
		username = "[USERNAME]",
		password = "[YOUR-PASSWORD]",
		host = "[HOST]",
		port = "",
		database = "",
	} = parts;

	let url = `${protocol}://${username}:${password}@${host}`;

	if (port) {
		url += `:${port}`;
	}

	if (database) {
		url += `/${database}`;
	}

	return url;
}

// Function to sanitize the password in a connection URL
export function sanitizeConnectionUrl(url: string): string {
	const parts = extractUrlParts(url);

	if (!parts.isValid) return url;

	// Reconstruct the URL with masked password
	return buildPostgresUrl({
		protocol: "postgresql" as const,
		username: parts.username,
		password:
			parts.password && parts.password !== "[YOUR-PASSWORD]"
				? "********"
				: parts.password,
		host: parts.host,
		port: parts.port,
		database: parts.database,
	});
}

// Function to transform POSTGRES_URL to PostgreSQL connection format
export function transformPostgresUrl(postgresUrl: string): string {
	const parts = extractUrlParts(postgresUrl);

	if (!parts.isValid) {
		throw new Error("Invalid database connection URL format");
	}

	// Construct the new URL format
	let transformed = `postgresql://${parts.username}:${parts.password}@${parts.host}`;
	if (parts.port) transformed += `:${parts.port}`;
	if (parts.database) transformed += `/${parts.database}`;

	return transformed;
}
