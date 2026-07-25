# 75% Site Scale and SVG Wordmark Design

## Goal

Make the site appear as it does after three browser zoom-out steps (approximately 75%) while the browser itself remains at 100%. Increase the vertical space between “Dreamscale” and “Labs,” and replace the landing page’s font-rendered wordmark with one fast-loading SVG.

## Scope

- Apply the 75% zoom-equivalent presentation to the landing page and blog.
- Keep each page filling the viewport at the scaled size.
- Preserve the existing monochrome 3D brand appearance.
- Replace only the large landing wordmark. The small DSL header mark remains unchanged.
- Preserve the existing copy, links, content, and interaction behavior.

## Layout

Each page will use a 4/3-size logical canvas rendered at 75%. This reproduces the visual density of browser zoom more faithfully than multiplying individual font sizes and spacing values.

- The scaled canvas fills the physical viewport.
- Fixed edge spacing and typography shrink with the rest of the interface.
- The landing breakpoint moves from 640 CSS pixels to 480 physical pixels. The blog breakpoints move from 960 and 720 CSS pixels to 720 and 540 physical pixels. This preserves their activation points under the 75% scale.
- Scrolling continues to use the full content height without clipped or unreachable content.

## Wordmark

The large “Dreamscale Labs” mark will become one external, self-contained SVG:

- Both words live in the same SVG and load in one request.
- The SVG preserves the current monochrome 3D appearance.
- The SVG has a tight view box and no external font dependency.
- The line gap is `0.16em`, visibly larger than the current near-touching treatment.
- The HTML retains an accessible `h1`; the decorative SVG is hidden from assistive technology.
- The 1.64 MB Nabla font preload and landing-page font rules are removed once no longer needed.

The SVG should be optimized for transfer size without introducing visible degradation at normal display sizes.

## Failure and Fallback Behavior

- Explicit SVG dimensions and aspect ratio prevent layout shift.
- If the SVG cannot load, the accessible heading still exposes the company name.
- Existing body-font fallbacks remain unchanged.
- The scaled layout must not create horizontal scrolling at viewport widths of 320 physical pixels or wider.

## Verification

Automated checks will confirm:

- Both pages declare the shared 75% scale behavior.
- The landing page references exactly one large wordmark SVG.
- The Nabla font is no longer preloaded or referenced by the landing page.
- The SVG contains both words in one asset and has no external dependencies.
- Existing landing and blog content remains present.
- Local asset references resolve.

Visual checks will compare the landing page at desktop and mobile widths, confirming:

- The result matches the density of 75% browser zoom.
- The canvas still fills the viewport.
- The wordmark retains its appearance and has the increased line gap.
- Header, tagline, blog content, and scrolling remain usable.

Asset sizes before and after the change will be recorded to verify that the new wordmark reduces the landing page’s branding payload.
