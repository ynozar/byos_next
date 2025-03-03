**Satori**: Enlightened library to convert HTML and CSS to SVG.

!!The ImageResponse component requires explicit display: flex styling for the parent div when it has multiple children. 

> **Note**
>
> To use Satori in your project to generate PNG images like Open Graph images and social cards, check out our [announcement](https://vercel.com/blog/introducing-vercel-og-image-generation-fast-dynamic-social-card-images) and [Vercel’s Open Graph Image Generation →](https://vercel.com/docs/concepts/functions/edge-functions/og-image-generation)
>
> To use it in Next.js, take a look at the [Next.js Open Graph Image Generation template →](https://vercel.com/templates/next.js/og-image-generation)

## Overview

Satori supports the JSX syntax, which makes it very straightforward to use. Here’s an overview of the basic usage:

```
// api.jsx
import satori from 'satori'

const svg = await satori(
  <div style={{ color: 'black' }}>hello, world</div>,
  {
    width: 600,
    height: 400,
    fonts: [
      {
        name: 'Roboto',
        // Use `fs` (Node.js only) or `fetch` to read the font as Buffer/ArrayBuffer and provide `data` here.
        data: robotoArrayBuffer,
        weight: 400,
        style: 'normal',
      },
    ],
  },
)
```

Satori will render the element into a 600×400 SVG, and return the SVG string:

```
'<svg ...><path d="..." fill="black"></path></svg>'
```

Under the hood, it handles layout calculation, font, typography and more, to generate a SVG that matches the exact same HTML and CSS in a browser.

## Documentation

### JSX

Satori only accepts JSX elements that are pure and stateless. You can use a subset of HTML elements (see section below), or custom React components, but React APIs such as `useState`, `useEffect`, `dangerouslySetInnerHTML` are not supported.

#### Use without JSX

If you don't have JSX transpiler enabled, you can simply pass [React-elements-like objects](https://reactjs.org/docs/introducing-jsx.html) that have `type`, `props.children` and `props.style` (and other properties too) directly:

```
await satori(
  {
    type: 'div',
    props: {
      children: 'hello, world',
      style: { color: 'black' },
    },
  },
  options
)
```

### HTML Elements

Satori supports a limited subset of HTML and CSS features, due to its special use cases. In general, only these static and visible elements and properties that are implemented.

For example, the `<input>` HTML element, the `cursor` CSS property are not in consideration. And you can't use `<style>` tags or external resources via `<link>` or `<script>`.

Also, Satori does not guarantee that the SVG will 100% match the browser-rendered HTML output since Satori implements its own layout engine based on the [SVG 1.1 spec](https://www.w3.org/TR/SVG11).

You can find the list of supported HTML elements and their preset styles [here](https://github.com/vercel/satori/blob/main/src/handler/presets.ts).

#### Images

You can use `<img>` to embed images. However, `width`, and `height` attributes are recommended to set:

```
await satori(
  <img src="https://picsum.photos/200/300" width={200} height={300} />,
  options
)
```

When using `background-image`, the image will be stretched to fit the element by default if you don't specify the size.

If you want to render the generated SVG to another image format such as PNG, it would be better to use base64 encoded image data (or buffer) directly as `props.src` so no extra I/O is needed in Satori:

```
await satori(
  <img src="data:image/png;base64,..." width={200} height={300} />,
  // Or src={arrayBuffer}, src={buffer}
  options
)
```

### CSS

Satori uses the same Flexbox [layout engine](https://yogalayout.com) as React Native, and it’s **not** a complete CSS implementation. However, it supports a subset of the spec that covers most common CSS features:


| **Property** | **Property Expanded** | **Supported Values** | **Example** |
|---|---|---|---|
| display | none and flex, default to flex |  |
| position | relative and absolute, default to relative |  |
| color | Supported |  |
| margin |
| marginTop | Supported |  |
| marginRight | Supported |  |
| marginBottom | Supported |  |
| marginLeft | Supported |  |
| Position |
| top | Supported |  |
| right | Supported |  |
| bottom | Supported |  |
| left | Supported |  |
| Size |
| width | Supported |  |
| height | Supported |  |
| Min & max size |
| minWidth | Supported except for min-content, max-content and fit-content |  |
| minHeight | Supported except for min-content, max-content and fit-content |  |
| maxWidth | Supported except for min-content, max-content and fit-content |  |
| maxHeight | Supported except for min-content, max-content and fit-content |  |
| border |
| Width (borderWidth, borderTopWidth, ...) | Supported |  |
| Style (borderStyle, borderTopStyle, ...) | solid and dashed, default to solid |  |
| Color (borderColor, borderTopColor, ...) | Supported |  |
| Shorthand (border, borderTop, ...) | Supported, i.e. 1px solid gray |  |
| borderRadius |
| borderTopLeftRadius | Supported |  |
| borderTopRightRadius | Supported |  |
| borderBottomLeftRadius | Supported |  |
| borderBottomRightRadius | Supported |  |
| Shorthand | Supported, i.e. 5px, 50% / 5px |  |
| Flex |
| flexDirection | column, row, row-reverse, column-reverse, default to row |  |
| flexWrap | wrap, nowrap, wrap-reverse, default to wrap |  |
| flexGrow | Supported |  |
| flexShrink | Supported |  |
| flexBasis | Supported except for auto |  |
| alignItems | stretch, center, flex-start, flex-end, baseline, normal, default to stretch |  |
| alignContent | Supported |  |
| alignSelf | Supported |  |
| justifyContent | Supported |  |
| gap | Supported |  |
| Font |
| fontFamily | Supported |  |
| fontSize | Supported |  |
| fontWeight | Supported |  |
| fontStyle | Supported |  |
| Text |
| tabSize | Supported |  |
| textAlign | start, end, left, right, center, justify, default to start |  |
| textTransform | none, lowercase, uppercase, capitalize, defaults to none |  |
| textOverflow | clip, ellipsis, defaults to clip |  |
| textDecoration | Support line types underline and line-through, and styles dotted, dashed, solid | Example |
| textShadow | Supported |  |
| lineHeight | Supported |  |
| letterSpacing | Supported |  |
| whiteSpace | normal, pre, pre-wrap, pre-line, nowrap, defaults to normal |  |
| wordBreak | normal, break-all, break-word, keep-all, defaults to normal |  |
| textWrap | wrap, balance, defaults to wrap |  |
| Background |
| backgroundColor | Supported, single value |  |
| backgroundImage | linear-gradient, radial-gradient, url, single value |  |
| backgroundPosition | Support single value |  |
| backgroundSize | Support two-value size i.e. \`10px 20%\` |  |
| backgroundClip | border-box, text |  |
| backgroundRepeat | repeat, repeat-x, repeat-y, no-repeat, defaults to repeat |  |
| transform |
| Translate (translate, translateX, translateY) | Supported |  |
| Rotate | Supported |  |
| Scale (scale, scaleX, scaleY) | Supported |  |
| Skew (skew, skewX, skewY) | Supported |  |
| transformOrigin | Support one-value and two-value syntax (both relative and absolute values) |  |
| objectFit | contain, cover, none, default to none |  |
| opacity | Supported |  |
| boxShadow | Supported |  |
| overflow | visible and hidden, default to visible |  |
| filter | Supported |  |
| clipPath | Supported | Example |
| lineClamp | Supported | Example |
| Mask |
| maskImage | linear-gradient(...), radial-gradient(...), url(...) | Example |
| maskPosition | Supported | Example |
| maskSize | Support two-value size i.e. \`10px 20%\` | Example |
| maskRepeat | repeat, repeat-x, repeat-y, no-repeat, defaults to repeat | Example |
| WebkitTextStroke | WebkitTextStrokeWidth | Supported |  |
| WebkitTextStrokeColor | Supported |  |

Note:

1. Three-dimensional transforms are not supported.

2. There is no `z-index` support in SVG. Elements that come later in the document will be painted on top.

3. `box-sizing` is set to `border-box` for all elements.

4. `calc` isn't supported.

5. `currentcolor` support is only available for the `color` property.

### Language and Typography

Advanced typography features such as kerning, ligatures and other OpenType features are not currently supported.

RTL languages are not supported either.

#### Fonts

Satori currently supports three font formats: TTF, OTF and WOFF. Note that WOFF2 is not supported at the moment. You must specify the font if any text is rendered with Satori, and pass the font data as ArrayBuffer (web) or Buffer (Node.js):

```
await satori(
  <div style={{ fontFamily: 'Inter' }}>Hello</div>,
  {
    width: 600,
    height: 400,
    fonts: [
      {
        name: 'Inter',
        data: inter,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Inter',
        data: interBold,
        weight: 700,
        style: 'normal',
      },
    ],
  }
)
```

Multiple fonts can be passed to Satori and used in `fontFamily`.

Tip

We recommend you define global fonts instead of creating a new object and pass it to satori for better performace, if your fonts do not change. [Read it for more detail](https://github.com/vercel/satori/issues/590)

#### Emojis

To render custom images for specific graphemes, you can use `graphemeImages` option to map the grapheme to an image source:

```
await satori(
  <div>Next.js is 🤯!</div>,
  {
    ...,
    graphemeImages: {
      '🤯': 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f92f.svg',
    },
  }
)
```

The image will be resized to the current font-size (both width and height) as a square.

#### Locales

Satori supports rendering text in different locales. You can specify the supported locales via the `lang` attribute:

```
await satori(
  <div lang="ja-JP">骨</div>
)
```

Same characters can be rendered differently in different locales, you can specify the locale when necessary to force it to render with a specific font and locale. Check out [this example](https://og-playground.vercel.app/?share=nVLdSsMwFH6VcEC86VgdXoyweTMVpyiCA296kzWnbWaalCZ160rfwAcRH8Bn0rcwWVdQEYTdnJzz_ZyEnNNArDkChQkXz5EixNha4rRpfE4IF6aQrKbkOJG4OQ461OfnosTYCq0cF2tZ5apnMxRpZh18EoZHPbgW3Ga_sIJxLlS6Q4sNGbnQU0yKVM0t5sa3R2Wx7KlVZaxI6pl2oPLX_KQTh1-yXEj_6LlnAhLBLXOJYJLMY61MBN_VD2KLlIzGe2jJ4qe01JXiMy116bqsM2Gxc7Stj2edcmIKpohkKp1GsGKD6_sI9hQhn2-vHy_ve-HQK_9ybbPB7O4Q1-LxENfVzX-uydDtgTshAF348RqgDeymB3QchgF04wV66guOyyoFmjBpMADM9Uos6sLvk13vKtfH__FFvkQO1JYVtu0X) to learn more.

Supported locales are exported as the `Locale` enum type.

#### Dynamically Load Emojis and Fonts

Satori supports dynamically loading emoji images (grapheme pictures) and fonts. The `loadAdditionalAsset` function will be called when a text segment is rendered but missing the image or font:

```
await satori(
  <div>👋 你好</div>,
  {
    // `code` will be the detected language code, `emoji` if it's an Emoji, or `unknown` if not able to tell.
    // `segment` will be the content to render.
    loadAdditionalAsset: async (code: string, segment: string) => {
      if (code === 'emoji') {
        // if segment is an emoji
        return `data:image/svg+xml;base64,...`
      }

      // if segment is normal text
      return loadFontFromSystem(code)
    }
  }
)
```

### Runtime and WASM

Satori can be used in browser, Node.js (>= 16), and Web Workers.

By default, Satori depends on asm.js for the browser runtime, and native module in Node.js. However, you can optionally load WASM instead by importing `satori/wasm` and provide the initialized WASM module instance of Yoga to Satori:

```
import satori, { init } from 'satori/wasm'
import initYoga from 'yoga-wasm-web'

const yoga = initYoga(await fetch('/yoga.wasm').then(res => res.arrayBuffer()))
init(yoga)

await satori(...)
```

When running in the browser or in the Node.js environment, WASM files need to be hosted and fetched before initializing. asm.js can be bundled together with the lib. In this case WASM should be faster.

When running on the Node.js server, native modules should be faster. However there are Node.js environments where native modules are not supported (e.g. StackBlitz's WebContainers), or other JS runtimes that support WASM (e.g. Vercel's Edge Runtime, Cloudflare Workers, or Deno).

Additionally, there are other difference between asm.js, native and WASM, such as security and compatibility.

Overall there are many trade-offs between each choice, and it's better to pick the one that works the best for your use case.

### Font Embedding

By default, Satori renders the text as `<path>` in SVG, instead of `<text>`. That means it embeds the font path data as inlined information, so succeeding processes (e.g. render the SVG on another platform) don’t need to deal with font files anymore.

You can turn off this behavior by setting `embedFont` to `false`, and Satori will use `<text>` instead:

```
const svg = await satori(
  <div style={{ color: 'black' }}>hello, world</div>,
  {
    ...,
    embedFont: false,
  },
)
```

### Debug

To draw the bounding box for debugging, you can pass `debug: true` as an option:

```
const svg = await satori(
  <div style={{ color: 'black' }}>hello, world</div>,
  {
    ...,
    debug: true,
  },
)
```

## Contribute

You can use the [Vercel OG Image Playground](https://og-playground.vercel.app/) to test and report bugs of Satori. Please follow our [contribution guidelines](/vercel/satori/blob/main/CONTRIBUTING.md) before opening a Pull Request.

## Author

* Shu Ding ([@shuding\_](https://twitter.com/shuding_))