import type { ImageResponse } from "next/og";
import sharp from 'sharp';

// The exact size expected by the firmware
export const DISPLAY_BMP_IMAGE_SIZE = 48062;

/** Bayer matrix (8x8) for dithering */
const BAYER_MATRIX_8x8: number[][] = [
	[  0,  32,  8,  40,  2,  34, 10, 42 ],
	[ 48, 16, 56, 24, 50, 18, 58, 26 ],
	[ 12, 44,  4, 36, 14, 46,  6, 38 ],
	[ 60, 28, 52, 20, 62, 30, 54, 22 ],
	[  3, 35, 11, 43,  1, 33,  9, 41 ],
	[ 51, 19, 59, 27, 49, 17, 57, 25 ],
	[ 15, 47,  7, 39, 13, 45,  5, 37 ],
	[ 63, 31, 55, 23, 61, 29, 53, 21 ]
];

export async function renderBmp(pngResponse: ImageResponse) {
	const pngBuffer = await pngResponse.arrayBuffer();

	// Fixed dimensions to match the device requirements
	const targetWidth = 800;
	const targetHeight = 480;
	const targetPixelCount = targetWidth * targetHeight;

	// Load image metadata
	const metadata = await sharp(Buffer.from(pngBuffer)).metadata();
	const isDoubleSize = metadata.width === targetWidth * 2 && metadata.height === targetHeight * 2;

	// Step 1: Resize to 800x480 if necessary
	let image = sharp(Buffer.from(pngBuffer));
	if (isDoubleSize) {
		image = image.resize(targetWidth, targetHeight, { kernel: sharp.kernel.nearest });
	}

	const grayscaleImage = await image
		.grayscale()
		.raw()
		.toBuffer({ resolveWithObject: true });

	const { data } = grayscaleImage; // `data` is a Uint8Array of grayscale values

	// Step 3: Apply dithering & thresholding
	const grayscale = new Uint8Array(targetPixelCount);
	const dithered = new Uint8Array(targetPixelCount);
	const isEdge = new Uint8Array(targetPixelCount);
	
	// First, copy grayscale data
	for (let y = 0; y < targetHeight; y++) {
		for (let x = 0; x < targetWidth; x++) {
			const i = y * targetWidth + x;
			grayscale[i] = data[i];
		}
	}
	
	// Process dithering and edge detection in a single pass
	for (let y = 0; y < targetHeight; y++) {
		const yOffset = y * targetWidth;
		const bayerY = y & 7; // y % 8 using bit mask
		const bayerYOffset = bayerY << 3; // bayerY * 8 using bit shift
		
		for (let x = 0; x < targetWidth; x++) {
			const idx = yOffset + x;
			const gray = grayscale[idx];
			
			// Dithering using bit operations
			const bayerX = x & 7; // x % 8 using bit mask
			const thresholdValue = BAYER_MATRIX_8x8[bayerY][bayerX];
			const normalizedGray = gray >> 2; // Divide by 4 using bit shift (approximates * 64/255)
			dithered[idx] = normalizedGray <= thresholdValue ? 1 : 0;
			
			// Edge detection for pixels not on the border
			if (y > 0 && y < targetHeight - 1 && x > 0 && x < targetWidth - 1) {
				// Check if this pixel has high contrast with neighbors
				const fuzziness = 20;
				const hasExtreme = 
					gray < fuzziness || gray > 255 - fuzziness || 
					grayscale[idx - 1] < fuzziness || grayscale[idx - 1] > 255 - fuzziness ||
					grayscale[idx + 1] < fuzziness || grayscale[idx + 1] > 255 - fuzziness ||
					grayscale[idx - targetWidth] < fuzziness || grayscale[idx - targetWidth] > 255 - fuzziness ||
					grayscale[idx + targetWidth] < fuzziness || grayscale[idx + targetWidth] > 255 - fuzziness;
				
				isEdge[idx] = hasExtreme ? 1 : 0;
			}
		}
	}

	// BMP file header (14 bytes) + Info header (40 bytes)
	const fileHeaderSize = 14;
	const infoHeaderSize = 40;
	const bitsPerPixel = 1; // 1-bit monochrome
	const rowSize = Math.floor((targetWidth * bitsPerPixel + 31) / 32) * 4;
	const paletteSize = 8; // 2 colors * 4 bytes each
	const fileSize = DISPLAY_BMP_IMAGE_SIZE; // Exactly match the expected size

	// Create a buffer of exactly the required size
	const buffer = Buffer.alloc(fileSize);

	// BMP File Header - matching firmware expectations
	buffer.write("BM", 0); // Signature
	buffer.writeUInt32LE(fileSize, 2); // File Size
	buffer.writeUInt32LE(0, 6); // Reserved
	buffer.writeUInt32LE(fileHeaderSize + infoHeaderSize + paletteSize, 10); // Pixel data offset

	// BMP Info Header - matching firmware expectations
	buffer.writeUInt32LE(infoHeaderSize, 14); // Info Header Size
	buffer.writeInt32LE(targetWidth, 18); // Width
	buffer.writeInt32LE(targetHeight, 22); // Height
	buffer.writeUInt16LE(1, 26); // Planes
	buffer.writeUInt16LE(bitsPerPixel, 28); // Bits per pixel (1-bit)
	buffer.writeUInt32LE(0, 30); // Compression
	buffer.writeUInt32LE(rowSize * targetHeight, 34); // Image Size
	buffer.writeInt32LE(0, 38); // X pixels per meter
	buffer.writeInt32LE(0, 42); // Y pixels per meter
	buffer.writeUInt32LE(2, 46); // Total Colors (2 for monochrome)
	buffer.writeUInt32LE(2, 50); // Important Colors

	// Color Palette (2 colors: black and white)
	const paletteOffset = fileHeaderSize + infoHeaderSize;
	buffer.writeUInt32LE(0x00ffffff, paletteOffset); // White
	buffer.writeUInt32LE(0x00000000, paletteOffset + 4); // Black

	// Step 4: Generate the final bitmap
	const dataOffset = fileHeaderSize + infoHeaderSize + paletteSize;
	
	// Process 8 pixels at a time where possible
	for (let y = 0; y < targetHeight; y++) {
		// BMP is stored bottom-up, so we need to flip the y-coordinate
		const targetY = targetHeight - 1 - y;
		const yOffset = targetY * targetWidth;
		const destRowOffset = dataOffset + (y * rowSize);
		
		// Process 8 pixels at a time
		for (let x = 0; x < targetWidth; x += 8) {
			let byte = 0;
			const remainingPixels = Math.min(8, targetWidth - x);
			
			// Process each bit in the byte
			for (let bit = 0; bit < remainingPixels; bit++) {
				const pixelX = x + bit;
				const idx = yOffset + pixelX;
				const gray = grayscale[idx];
				
				// Determine pixel value with optimized logic
				let isBlack = false;
				
				if (gray < 10) {
					// Pure black pixel
					isBlack = true;
				} else if (gray > 240) {
					// Pure white pixel
					isBlack = false;
				} else if (isEdge[idx]) {
					// On an edge (likely text) - round to black for better contrast
					isBlack = gray < 128;
				} else {
					// Not on an edge (likely in an image) - use dithered result
					isBlack = dithered[idx] === 1;
				}
				
				// Set the bit in the byte if black using bit operations
				if (isBlack) {
					byte |= 1 << (7 - bit);
				}
			}
			
			// Write the byte to the buffer
			buffer[destRowOffset + (x >> 3)] = byte; // x / 8 using bit shift
		}
	}

	// Ensure the buffer is exactly DISPLAY_BMP_IMAGE_SIZE bytes
	if (buffer.length !== DISPLAY_BMP_IMAGE_SIZE) {
		console.warn(
			`BMP size mismatch: ${buffer.length} vs expected ${DISPLAY_BMP_IMAGE_SIZE}`,
		);
	}

	return buffer;
}
