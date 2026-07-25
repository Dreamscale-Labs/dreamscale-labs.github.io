# Site Scale and SVG Wordmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduce the visual density of 75% browser zoom on the landing page and blog, and replace the landing page’s Nabla font wordmark with one optimized self-contained SVG with a larger line gap.

**Architecture:** Apply `zoom: 0.75` to each page body, compensate viewport-relative values by 4/3, and adjust responsive breakpoints by 0.75 so the result matches browser zoom instead of merely shrinking fixed measurements. Render the existing color-font wordmark once at 2× density, encode it as WebP inside one SVG, then remove the 1.64 MB Nabla runtime dependency.

**Tech Stack:** Static HTML and CSS, Node’s built-in test runner, local Chromium through Playwright for rendering and visual QA, Sharp for WebP encoding.

## Global Constraints

- Apply the 75% zoom-equivalent presentation to the landing page and blog.
- Keep each page filling the viewport at the scaled size.
- Preserve the existing monochrome 3D brand appearance.
- Replace only the large landing wordmark; leave the small DSL header mark unchanged.
- Preserve the existing copy, links, content, and interaction behavior.
- Use one self-contained SVG with no runtime font dependency.
- Use a `0.16em` line gap.
- Do not create horizontal page scrolling at viewport widths of 320 physical pixels or wider.

## File Structure

- Modify `tests/static-page.test.mjs`: define the new SVG, payload, accessibility, and 75% scaling contract.
- Create `assets/logo/dreamscale-labs.svg`: contain both wordmark lines as one high-density, self-contained SVG asset.
- Modify `index.html`: preload and render the new SVG while keeping an accessible text heading.
- Modify `styles.css`: remove the Nabla runtime rules, style the SVG, and add landing-page zoom compensation.
- Modify `blog/blog.css`: apply the same zoom model and compensate its viewport-relative rules and breakpoints.
- Modify `docs/superpowers/specs/2026-07-24-landing-scale-and-svg-wordmark-design.md`: correct the complete set of responsive breakpoint conversions.

---

### Task 1: Define and Build the Optimized Wordmark

**Files:**
- Test: `tests/static-page.test.mjs`
- Create: `assets/logo/dreamscale-labs.svg`
- Modify: `index.html`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `assets/fonts/Nabla-Regular-VariableFont_EDPT,EHLT.ttf` as generation input only.
- Produces: `/assets/logo/dreamscale-labs.svg`, a standalone image with a numeric `viewBox`, an embedded `data:image/webp;base64` image, and a file size below 200,000 bytes.

- [ ] **Step 1: Write the failing asset and markup test**

Add SVG loading at the top of `tests/static-page.test.mjs`:

```js
const wordmarkPath = "assets/logo/dreamscale-labs.svg";
const wordmarkSvg = existsSync(wordmarkPath)
  ? readFileSync(wordmarkPath, "utf8")
  : "";
```

Replace the landing wordmark expectations with:

```js
test("landing page uses one optimized self-contained SVG wordmark", () => {
  assert.ok(existsSync(wordmarkPath));
  assert.match(html, /rel="preload" href="\/assets\/logo\/dreamscale-labs\.svg" as="image"/);
  assert.equal(
    [...html.matchAll(/src="\/assets\/logo\/dreamscale-labs\.svg"/g)].length,
    1
  );
  assert.match(html, /<span class="visually-hidden">Dreamscale Labs<\/span>/);
  assert.match(html, /class="wordmark-image"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(wordmarkSvg, /<svg\b/);
  assert.match(wordmarkSvg, /viewBox="0 0 [0-9.]+ [0-9.]+"/);
  assert.match(wordmarkSvg, /data:image\/webp;base64,/);
  assert.doesNotMatch(wordmarkSvg, /https?:|@font-face|Nabla-Regular/);
  assert.ok(
    statSync(wordmarkPath).size < 200_000,
    `wordmark SVG is ${statSync(wordmarkPath).size} bytes`
  );
  assert.doesNotMatch(html, /Nabla-Regular-VariableFont/);
  assert.doesNotMatch(css, /font-family:\s*"Nabla"|@font-palette-values/);
});
```

Add `statSync` to the existing `node:fs` import.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
/Users/ezr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  --test --test-name-pattern="optimized self-contained SVG wordmark" \
  tests/static-page.test.mjs
```

Expected: FAIL because `assets/logo/dreamscale-labs.svg` does not exist and the HTML still renders two text spans.

- [ ] **Step 3: Generate the wordmark image**

Use a temporary Playwright page that loads the local Nabla font, uses the existing monochrome palette and `"EDPT" 100, "EHLT" 12`, lays out the two words with `font-size: 192px`, `line-height: 0.92`, and `gap: 0.16em`, and screenshots only the transparent wordmark at `deviceScaleFactor: 2`.

Trim the transparent screenshot, then normalize it to a fixed 2× artboard and encode it with Sharp:

```js
const webp = await sharp(png)
  .trim()
  .resize({
    width: 2048,
    height: 1040,
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .webp({ quality: 90, alphaQuality: 100, effort: 6 })
  .toBuffer();
```

Wrap the data in one fixed-size SVG, mapping the 2× raster dimensions back to a `1024×520` logical canvas:

```js
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="520" viewBox="0 0 1024 520">
  <image width="1024" height="520" preserveAspectRatio="xMidYMid meet" href="data:image/webp;base64,${webp.toString("base64")}"/>
</svg>
`;

writeFileSync("assets/logo/dreamscale-labs.svg", svg);
```

Write the generated output to `assets/logo/dreamscale-labs.svg`. Confirm the file is below 200,000 bytes with:

```bash
wc -c assets/logo/dreamscale-labs.svg
```

- [ ] **Step 4: Integrate the SVG in the landing page**

Replace the Nabla font preload in `index.html` with:

```html
<link
  rel="preload"
  href="/assets/logo/dreamscale-labs.svg"
  as="image"
  type="image/svg+xml"
  fetchpriority="high"
>
```

Replace the wordmark’s two text spans with:

```html
<h1 class="wordmark" id="wordmark">
  <span class="visually-hidden">Dreamscale Labs</span>
  <img
    class="wordmark-image"
    src="/assets/logo/dreamscale-labs.svg"
    alt=""
    width="1024"
    height="520"
    fetchpriority="high"
    decoding="async"
    aria-hidden="true"
  >
</h1>
```

Remove the Nabla `@font-face`, `@font-palette-values`, font variation, line-font, and palette declarations from `styles.css`. Add:

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.wordmark-image {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
}
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run the focused command from Step 2.

Expected: PASS for the optimized SVG test.

- [ ] **Step 6: Commit the wordmark task**

```bash
git add tests/static-page.test.mjs assets/logo/dreamscale-labs.svg index.html styles.css
git commit -m "Optimize landing wordmark as one SVG"
```

---

### Task 2: Reproduce 75% Browser Zoom Across Both Pages

**Files:**
- Test: `tests/static-page.test.mjs`
- Modify: `styles.css`
- Modify: `blog/blog.css`

**Interfaces:**
- Consumes: the existing landing and blog layouts.
- Produces: a shared contract of `body { zoom: 0.75; }`, a `133.333333svh` landing canvas, 4/3-compensated `vw` rules, and 0.75-adjusted responsive breakpoints.

- [ ] **Step 1: Write the failing scaling tests**

Add:

```js
test("landing page reproduces 75 percent browser zoom", () => {
  assert.match(css, /body\s*{[^}]*zoom:\s*0\.75/s);
  assert.match(css, /\.landing\s*{[^}]*min-height:\s*133\.333333svh/s);
  assert.match(css, /\.wordmark\s*{[^}]*width:\s*min\(104vw,\s*64rem\)/s);
  assert.match(css, /@media \(max-width:\s*480px\)/);
  assert.doesNotMatch(css, /@media \(max-width:\s*640px\)/);
});

test("blog reproduces 75 percent browser zoom", () => {
  assert.match(blogCss, /body\s*{[^}]*zoom:\s*0\.75/s);
  assert.match(blogCss, /@media \(max-width:\s*720px\)/);
  assert.match(blogCss, /@media \(max-width:\s*540px\)/);
  assert.doesNotMatch(blogCss, /@media \(max-width:\s*960px\)/);
});
```

- [ ] **Step 2: Run the scaling tests and verify RED**

Run:

```bash
/Users/ezr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  --test --test-name-pattern="75 percent browser zoom" \
  tests/static-page.test.mjs
```

Expected: both tests FAIL because neither stylesheet declares `zoom: 0.75`.

- [ ] **Step 3: Implement landing-page zoom compensation**

In `styles.css`:

```css
body {
  min-height: 100svh;
  margin: 0;
  background: var(--paper);
  zoom: 0.75;
}

.landing {
  position: relative;
  min-height: 133.333333svh;
  padding:
    clamp(4rem, 12vw, 7rem)
    clamp(1.25rem, 5.333333vw, 4rem)
    clamp(2rem, 6vw, 3.5rem);
}
```

Change the landing stylesheet’s remaining viewport-relative values:

```css
.site-header {
  padding: clamp(1.25rem, 3.733333vw, 2.5rem);
}

.site-logo {
  width: clamp(4.25rem, 7vw, 5.5rem);
}

.nav-link {
  font-size: clamp(0.875rem, 0.7rem + 0.466667vw, 1rem);
}

.wordmark {
  width: min(104vw, 64rem);
}

.tagline {
  right: clamp(1.25rem, 5.333333vw, 4rem);
  bottom: clamp(2rem, 6vw, 3.5rem);
  left: clamp(1.25rem, 5.333333vw, 4rem);
  font-size: clamp(1rem, 0.83rem + 0.693333vw, 1.35rem);
}
```

Change the landing breakpoint and mobile viewport-relative widths:

```css
@media (max-width: 480px) {
  .wordmark {
    width: min(117.333333vw, 24rem);
  }

  .tagline {
    width: min(calc(133.333333vw - 2rem), 22rem);
  }
}
```

- [ ] **Step 4: Implement blog zoom compensation**

Add `zoom: 0.75` to the existing `body` rule in `blog/blog.css`.

Multiply every `vw` term by 4/3:

```css
.blog-nav { gap: clamp(1rem, 3.333333vw, 2rem); }
.article-shell { padding: clamp(4.5rem, 12vw, 8rem) 0 8rem; }
.article-hero { margin-bottom: clamp(4rem, 10.666667vw, 7rem); }
.article-meta { gap: 0.6rem clamp(1rem, 4vw, 2rem); }
.article-title-block h1 { font-size: clamp(3.7rem, 11.2vw, 8.4rem); }
.article-dek { font-size: clamp(1.35rem, 3.2vw, 2rem); }
.article { font-size: clamp(1.08rem, 1.6vw, 1.2rem); }
.article h2 { font-size: clamp(2.2rem, 5.333333vw, 3.8rem); }
.figure-frame { padding: clamp(0.5rem, 2vw, 1.25rem); }
```

Change `@media (max-width: 960px)` to `@media (max-width: 720px)`, and change `@media (max-width: 720px)` to `@media (max-width: 540px)`. Inside the 540px rule, change the title sizing to:

```css
.article-title-block h1 {
  font-size: clamp(3.4rem, 22.666667vw, 5.5rem);
}
```

- [ ] **Step 5: Run the complete static suite and verify GREEN**

Run:

```bash
/Users/ezr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  --test tests/static-page.test.mjs
```

Expected: all tests PASS with zero failures.

- [ ] **Step 6: Commit the scaling task**

```bash
git add tests/static-page.test.mjs styles.css blog/blog.css \
  docs/superpowers/specs/2026-07-24-landing-scale-and-svg-wordmark-design.md
git commit -m "Apply 75 percent site scaling"
```

---

### Task 3: Browser and Payload Verification

**Files:**
- Verify: `index.html`
- Verify: `styles.css`
- Verify: `blog/index.html`
- Verify: `blog/blog.css`
- Verify: `assets/logo/dreamscale-labs.svg`

**Interfaces:**
- Consumes: the completed static pages.
- Produces: fresh test output, desktop/mobile screenshots, geometry checks, and before/after asset-size evidence.

- [ ] **Step 1: Start a local static server**

Run:

```bash
/Users/ezr/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  -m http.server 4173
```

- [ ] **Step 2: Verify landing and blog geometry in Chromium**

At physical viewports `2048×1152`, `390×844`, and `320×700`, use Playwright to assert:

```js
const metrics = await page.evaluate(() => ({
  viewport: [innerWidth, innerHeight],
  pageWidth: document.documentElement.scrollWidth,
  landingHeight: document.querySelector(".landing")?.getBoundingClientRect().height,
  wordmarkWidth: document.querySelector(".wordmark-image")?.getBoundingClientRect().width,
}));

assert.equal(metrics.pageWidth, metrics.viewport[0]);
if (metrics.landingHeight) {
  assert.ok(Math.abs(metrics.landingHeight - metrics.viewport[1]) <= 1);
}
```

Also fail the verification on any request error or browser console error.

- [ ] **Step 3: Capture and inspect screenshots**

Capture:

```text
/tmp/dreamscale-landing-2048x1152.png
/tmp/dreamscale-landing-390x844.png
/tmp/dreamscale-blog-390x844.png
```

Inspect all three for clipping, unexpected blank space, horizontal overflow, illegible text, and the intended wider gap between the wordmark lines.

- [ ] **Step 4: Verify payload reduction and final diff**

Run:

```bash
wc -c \
  assets/fonts/Nabla-Regular-VariableFont_EDPT,EHLT.ttf \
  assets/logo/dreamscale-labs.svg
git diff --check
git status --short
```

Expected:

- The new SVG is under 200,000 bytes.
- The landing page no longer loads the 1,643,364-byte Nabla font.
- `git diff --check` exits 0.
- Only the known unrelated `.worktrees/` path may remain untracked.

- [ ] **Step 5: Run final verification**

Run:

```bash
/Users/ezr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  --test tests/static-page.test.mjs
```

Expected: all tests PASS with zero failures.
