export const revalidate = 60

import { unstable_cacheLife as cacheLife } from 'next/cache';

import { ImageResponse } from 'next/og'
import fs from 'fs'
import path from 'path'
import { createElement } from 'react'
import { renderBmp } from '@/utils/render-bmp'
import NotFoundScreen from '@/app/examples/screens/not-found/not-found'
import screens from '@/app/examples/screens.json'

let blockKieFont: Buffer | null = null

// Load fonts as Buffer for Node.js as specified in Satori docs
try {
    blockKieFont = Buffer.from(
        fs.readFileSync(
            path.resolve('./public/fonts/BlockKie.ttf')
        )
    )
    console.log('Fonts loaded successfully')
} catch (error) {
    console.error('Error loading fonts:', error)
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
}

// Helper function to load a screen component
async function loadScreenBuffer(screenId: string) {
    'use cache'
    cacheLife('minutes')
    try {
        // Check if the screen exists in our components registry
        let element
        if (screens[screenId as keyof typeof screens]) {
            const { default: Component } = await import(
                `@/app/examples/screens/${screenId}/${screenId}.tsx`
            )
            console.log(`Screen component loaded: ${screenId}`)
            let props = screens[screenId as keyof typeof screens].props || {};
            if (screens[screenId as keyof typeof screens].hasDataFetch) {
                try {
                    const { default: fetchDataFunction } = await import(
                        `@/app/examples/screens/${screenId}/getData.ts`
                    );
                    props = await fetchDataFunction();
                } catch (error) {
                    console.warn(`Error fetching data for ${screenId}:`, error);
                }
            }
            element = createElement(Component, { ...props })
        } else {
            // If screen component not found, use the NotFoundScreen
            element = createElement(NotFoundScreen, { slug: screenId })
        }

        const pngResponse = await new ImageResponse(element, santoriOptions)

        return await renderBmp(pngResponse)
    } catch (error) {
        console.error(`Error loading screen component ${screenId}:`, error)
        return null
    }
}

export async function generateStaticParams() {
    return Object.keys(screens).map((screen) => ({
        slug: [screen],
    }))
}

type Params = Promise<{ slug?: string[] }>

export async function GET(req: Request, segmentData: { params: Params }) {
    try {
        const slug = (await segmentData.params)?.slug || ['default']

        // Extract the screen slug from the URL
        // Format: [screen_slug].bmp
        const screenSlug = (Array.isArray(slug) ? slug[slug.length - 1] : slug).replace('.bmp', '')

        // Default to 'simple-text' if no screen is specified
        let screenId = 'simple-text'

        // Check if the requested screen exists in our screens registry
        if (screens[screenSlug as keyof typeof screens]) {
            screenId = screenSlug
            console.log(`Screen found: ${screenSlug}`)
        } else {
            console.log(`Screen not found: ${screenSlug}, using default`)
        }

        // Try to load the screen component
        const screenBuffer = await loadScreenBuffer(screenId)

        return new Response(screenBuffer, {
            headers: {
                'content-type': 'image/bmp',
            }
        })

    } catch (error) {
        console.error('Error generating image:', error)

        // Instead of returning an error, return the NotFoundScreen as a fallback
        try {
            const element = createElement(NotFoundScreen, { slug: 'Error occurred' })
            const pngResponse = await new ImageResponse(element, santoriOptions)

            // Check if BMP was requested
            const slug = (await segmentData.params)?.slug || ['default']
            const path = Array.isArray(slug) ? slug.join('/') : slug
            const shouldConvertToBmp = typeof path === 'string' && path.toLowerCase().endsWith('.bmp')

            if (!shouldConvertToBmp) {
                return pngResponse
            }

            const buffer = await renderBmp(pngResponse)
            return new Response(buffer, {
                headers: {
                    'content-type': 'image/bmp',
                }
            })
        } catch (fallbackError) {
            console.error('Error generating fallback image:', fallbackError)
            return new Response('Error generating image', {
                status: 500,
                headers: {
                    'content-type': 'text/plain',
                }
            })
        }
    }
}