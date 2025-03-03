import { ImageResponse } from 'next/og'
// import { BitmapGreeting } from '@/app/screens/BitmapGreeting'
// import { BitmapPatterns } from '@/app/screens/BitmapPatterns'
// import { TailwindTest } from '@/app/screens/tailwindTest'
import fs from 'fs'
import path from 'path'
import SimpleText from '@/app/examples/screens/simple-text/simple-text'
import { createElement } from 'react'
import { renderBmp } from '@/utils/render-bmp'

export const revalidate = 60 // 1 minute

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









export async function generateStaticParams() {
    return [
        { slug: ['t.bmp'] },
    ]
}

type Params = Promise<{ slug?: string[] }>



export async function GET(req: Request, segmentData: { params: Params }) {
    try {
        const slug = (await segmentData.params)?.slug || 'default'
        const path = Array.isArray(slug) ? slug.join(' ') : slug
        const shouldConvertToBmp = typeof path === 'string' && path.toLowerCase().endsWith('.bmp')


        const element = createElement(SimpleText);

        const pngResponse = await new ImageResponse( element, santoriOptions)

        // Return PNG if not requesting BMP
        if (!shouldConvertToBmp) {
            return pngResponse
        }

        const buffer = await renderBmp(pngResponse)

        return new Response(buffer, {
            headers: {
                'content-type': 'image/bmp',
            }
        })

    } catch (error) {
        console.error('Error generating image:', error)
        return new Response('Error generating image', {
            status: 500,
            headers: {
                'content-type': 'text/plain',
            }
        })
    }
}
