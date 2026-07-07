# Dreamscale Landing Page Design

## Goal

Create a minimal Dreamscale Labs landing page for GitHub Pages, using the supplied Nabla and Mluvka fonts and a restrained ML lab aesthetic.

## References

- Overall composition follows `flappingairplanes.com`: sparse top navigation, centered identity, and a single explanatory sentence near the bottom.
- The gradient follows the supplied purple screenshot: a soft lavender top third fading into a pale, nearly white lower field.
- Are.na MCP search for `landing` was unavailable because the API returned a Premium-only error, and direct access to the `landing` channel returned no blocks.

## Page Structure

- Single static `index.html` page.
- Top-right navigation contains one `blog` link.
- Center of the viewport contains the exact text `dreamscale labs`, split across two lines as `dreamscale` and `labs`.
- Bottom sentence is exactly: `DSL is an applied research company working towards a future of truly general robotics.`

## Typography

- Hero wordmark uses Nabla from `/Users/ezr/Downloads/Nabla/Nabla-Regular-VariableFont_EDPT,EHLT.ttf`.
- Body and navigation use Mluvka from `/Users/ezr/Downloads/Mluvka_v3.001/Web/Mluvka-Regular-web.woff2`.
- Bottom sentence uses Mluvka at weight 400.

## Visual System

- Background is full viewport with no cards, panels, or decorative blobs.
- Top third uses a gentle purple gradient, fading toward pale lavender-white.
- Nabla text uses purple tones compatible with the background gradient.
- Overall density is low, quiet, and research-lab minimal.

## Responsiveness

- The layout remains one viewport on desktop and mobile.
- Hero type scales with `clamp()` so long words do not overflow.
- The bottom sentence wraps cleanly on narrow screens.

## Verification

- Static tests should confirm the required copy, font declarations, local font references, blog link, gradient, and responsive safeguards.
- Browser or static-file verification should confirm the page can be served locally and the primary files load.
