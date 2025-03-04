// test use cache behaviour
import { unstable_cacheLife as cacheLife } from 'next/cache';

async function generateText(){
    'use cache'
    cacheLife('minutes')
    return 'Hello, world!'+Math.random()
}

export async function GET() {
    return new Response(await generateText())
}

