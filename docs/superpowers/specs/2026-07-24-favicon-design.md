# Dreamscale Labs Favicon Design

## Goal

Create a complete modern favicon set from the existing full `DSL` header mark and wire it into every public page. The icons must preserve the supplied metallic artwork, use an opaque white background, and include enough whitespace that the mark does not feel crowded or get clipped by mobile launcher masks.

## Approved Artwork

- Source: `assets/logo/dsl-mark.png`
- Source dimensions: 1302 × 960 pixels
- Non-transparent artwork bounds: `(129, 103)` through `(1216, 859)`
- Content: the complete `DSL` mark, not an isolated letter
- Treatment: preserve the source artwork without recoloring, redrawing, sharpening, or adding effects
- Background: solid white in every exported icon

The standard composition centers the visible artwork on a square canvas at exactly 82% of the canvas width. This leaves 9% horizontal whitespace on each side and proportionally larger vertical whitespace because the DSL mark is wider than it is tall.

The Android maskable composition centers the same artwork at exactly 72% of the canvas width. This additional safety padding keeps adaptive launcher masks from clipping the `D` or `L`.

## Output Files

Create these files at the site root:

- `favicon.ico`, containing 16 × 16, 32 × 32, and 48 × 48 frames
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png` at 180 × 180
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`
- `android-chrome-maskable-512x512.png`
- `site.webmanifest`

PNG exports must be opaque RGB or RGBA images whose visible background is white. Downsampling must use a high-quality filter so the metallic highlights remain as legible as possible at small sizes.

## Manifest

`site.webmanifest` will identify the site as Dreamscale Labs with `DSL` as its short name. It will declare:

- the 192 × 192 and 512 × 512 Android icons with purpose `any`
- the padded 512 × 512 Android icon with purpose `maskable`
- white theme and background colors
- root start URL and scope

## Page Integration

Add the same favicon metadata to:

- `index.html`
- `blog/index.html`
- `blog/why-robot-brains-will-live-in-the-cloud/index.html`

Each page head will reference:

- the multi-frame ICO fallback
- the 16 × 16 and 32 × 32 PNG icons
- the 180 × 180 Apple touch icon
- `site.webmanifest`
- a white browser theme color

No other page content, styling, or metadata will change.

## Generation Flow

1. Load `assets/logo/dsl-mark.png`.
2. Find the non-transparent artwork bounds.
3. Crop to those bounds.
4. Scale the full mark to the approved proportion.
5. Center it on a square white master canvas.
6. Produce the standard PNG sizes with high-quality downsampling.
7. Produce the maskable 512 × 512 variant with additional padding.
8. Package the 16, 32, and 48 pixel images into one ICO.
9. Write the manifest and add the icon links to all three HTML documents.

Generation is deterministic from the checked-in source asset. A permanent build dependency or generative image model is not required.

## Failure Handling

Generation must stop if the source image is missing, unreadable, has unexpected dimensions, or contains no non-transparent artwork. Page wiring must not be considered complete if any referenced icon is missing.

## Verification

Before completion:

- confirm each PNG has its declared dimensions
- confirm every PNG has an opaque white background
- confirm the ICO contains 16, 32, and 48 pixel frames
- parse `site.webmanifest` as valid JSON and confirm every declared file exists
- confirm all three HTML pages contain the complete icon-link set
- inspect a contact sheet at 512, 192, 180, 48, 32, and 16 pixels
- confirm the standard icon has the approved whitespace and the maskable icon has additional safety padding
- run repository checks that are relevant to this static site

## Out of Scope

- redesigning the DSL artwork
- converting the raster mark into vector paths
- changing the existing header logo
- adding legacy Apple touch sizes or Windows tile metadata
- changing page layout, typography, or content
