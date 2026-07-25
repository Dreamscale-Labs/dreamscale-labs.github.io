# Shared Header Favicon Design

## Goal

Replace the existing raw DSL header mark with the newly generated standard favicon on every public page, so the home button and browser/mobile icon use the same approved composition.

## Scope

Apply the change to:

- `index.html`
- `blog/index.html`
- `blog/why-robot-brains-will-live-in-the-cloud/index.html`

Each page’s `.site-logo` image will use:

- source: `/android-chrome-512x512.png`
- intrinsic width: `512`
- intrinsic height: `512`
- empty alternative text because the surrounding link already has the accessible label `Dreamscale Labs home`
- the existing high-priority loading behavior

## Styling

Keep the existing `.site-logo` responsive width, positioning, pointer behavior, and navigation layout.

Remove these declarations from the `.site-logo img` rule in all three page stylesheets:

```css
transform: scaleY(0.8);
transform-origin: top left;
```

The new favicon is square and must render without distortion. No replacement transform is needed.

## Verification

- update the existing static-page checks to require `/android-chrome-512x512.png` and 512 × 512 intrinsic dimensions on all three pages
- confirm the old `/assets/logo/dsl-mark.png` header reference is absent from all three pages
- confirm the old vertical compression is absent from all three stylesheets
- run the complete static-site test suite
- inspect the header on the homepage, blog index, and article at desktop and narrow viewport sizes

## Out of Scope

- changing the favicon artwork or spacing
- changing the header’s responsive width
- changing navigation positioning or behavior
- changing the large landing-page wordmark
- changing page content
