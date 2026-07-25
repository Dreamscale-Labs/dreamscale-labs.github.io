# Shared Header Favicon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for inline execution. The user explicitly requested no subagents and no test-first workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home logo on all three public pages with the approved 512 × 512 favicon while preserving the current header layout and accessibility.

**Architecture:** Reuse the checked-in `/android-chrome-512x512.png` asset directly in each shared header instance. Remove the old image-only vertical compression from all three page stylesheets, then update the existing static-page contract and visually inspect desktop and narrow layouts.

**Tech Stack:** Static HTML and CSS, Node.js built-in test runner, local browser inspection.

## Global Constraints

- Apply the change to `index.html`, `blog/index.html`, and `blog/why-robot-brains-will-live-in-the-cloud/index.html`.
- Use `/android-chrome-512x512.png` with intrinsic dimensions 512 × 512.
- Keep empty image alternative text because the containing home link is labeled `Dreamscale Labs home`.
- Preserve the existing responsive `.site-logo` width, home link, loading priority, pointer behavior, and navigation layout.
- Remove `transform: scaleY(0.8)` and `transform-origin: top left` from each `.site-logo img` rule.
- Do not change favicon artwork, page content, the large landing wordmark, or navigation behavior.
- Add and run validation only after implementation; do not use a test-first cycle.

## File Structure

- Modify `index.html`: replace the homepage header image source and intrinsic dimensions.
- Modify `blog/index.html`: replace the blog-index header image source and intrinsic dimensions.
- Modify `blog/why-robot-brains-will-live-in-the-cloud/index.html`: replace the article header image source and intrinsic dimensions.
- Modify `styles-75.css`: remove the homepage header image distortion.
- Modify `blog/blog-index.css`: remove the blog-index header image distortion.
- Modify `blog/why-robot-brains-will-live-in-the-cloud/article.css`: remove the article header image distortion.
- Modify `tests/static-page.test.mjs`: require the shared favicon header contract and remove expectations for the old source and transform.

---

### Task 1: Replace the Shared Header Logo

**Files:**
- Modify: `index.html`
- Modify: `blog/index.html`
- Modify: `blog/why-robot-brains-will-live-in-the-cloud/index.html`
- Modify: `styles-75.css`
- Modify: `blog/blog-index.css`
- Modify: `blog/why-robot-brains-will-live-in-the-cloud/article.css`
- Modify: `tests/static-page.test.mjs`

**Interfaces:**
- Consumes: `/android-chrome-512x512.png`, already checked in and declared by the favicon manifest.
- Produces: three visually identical, undistorted home-logo images that retain the existing `.site-logo` link contract.

- [ ] **Step 1: Replace the image markup on all three pages**

In each page, replace:

```html
<img
  src="/assets/logo/dsl-mark.png"
  alt=""
  width="1302"
  height="960"
  fetchpriority="high"
>
```

with:

```html
<img
  src="/android-chrome-512x512.png"
  alt=""
  width="512"
  height="512"
  fetchpriority="high"
>
```

Do not change the surrounding `<a class="site-logo" href="/" aria-label="Dreamscale Labs home">`.

- [ ] **Step 2: Remove the old image distortion**

In `styles-75.css`, `blog/blog-index.css`, and `blog/why-robot-brains-will-live-in-the-cloud/article.css`, change:

```css
.site-logo img {
  display: block;
  width: 100%;
  height: auto;
  transform: scaleY(0.8);
  transform-origin: top left;
}
```

to:

```css
.site-logo img {
  display: block;
  width: 100%;
  height: auto;
}
```

- [ ] **Step 3: Update the static-page contract after implementation**

In the first landing-page test, replace:

```js
assert.ok(existsSync("assets/logo/dsl-mark.png"));
assert.match(html, /src="\/assets\/logo\/dsl-mark\.png"/);
assert.match(html, /width="1302"/);
assert.match(html, /height="960"/);
```

with:

```js
assert.ok(existsSync("android-chrome-512x512.png"));
assert.match(html, /src="\/android-chrome-512x512\.png"/);
assert.match(html, /width="512"/);
assert.match(html, /height="512"/);
```

Delete these expectations from `landing page uses monochrome branding and responsive safeguards`:

```js
assert.match(css, /\.site-logo img\s*{[^}]*transform:\s*scaleY\(0\.8\)/s);
assert.match(css, /\.site-logo img\s*{[^}]*transform-origin:\s*top left/s);
```

Replace the blog-index expectation:

```js
assert.match(blogIndex, /src="\/assets\/logo\/dsl-mark\.png"/);
```

with:

```js
assert.match(blogIndex, /src="\/android-chrome-512x512\.png"/);
```

Replace the article expectation:

```js
assert.match(articleHtml, /src="\/assets\/logo\/dsl-mark\.png"/);
```

with:

```js
assert.match(articleHtml, /src="\/android-chrome-512x512\.png"/);
```

Add this test after the favicon metadata test:

```js
test("site headers use the undistorted standard favicon", () => {
  const pages = new Map([
    ["index.html", html],
    ["blog/index.html", blogIndex],
    [articlePath, articleHtml],
  ]);

  for (const [path, source] of pages) {
    assert.match(source, /src="\/android-chrome-512x512\.png"/);
    assert.match(source, /width="512"\s+height="512"/);
    assert.doesNotMatch(source, /src="\/assets\/logo\/dsl-mark\.png"/);
  }

  for (const [path, source] of [
    [landingCssPath, css],
    [blogCssPath, blogCss],
    [articleCssPath, articleCss],
  ]) {
    assert.doesNotMatch(
      source,
      /\.site-logo img\s*{[^}]*\btransform(?:-origin)?:/s,
      `${path} must not distort the header favicon`
    );
  }
});
```

- [ ] **Step 4: Run post-change verification**

Run:

```bash
/Users/ezr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  --test tests/static-page.test.mjs
```

Expected: 14 tests pass with zero failures.

- [ ] **Step 5: Commit the shared-header change**

```bash
git add \
  index.html \
  blog/index.html \
  blog/why-robot-brains-will-live-in-the-cloud/index.html \
  styles-75.css \
  blog/blog-index.css \
  blog/why-robot-brains-will-live-in-the-cloud/article.css \
  tests/static-page.test.mjs
git commit -m "Use favicon as shared home logo"
```

---

### Task 2: Verify Header Layout and Repository State

**Files:**
- Inspect: `index.html`
- Inspect: `blog/index.html`
- Inspect: `blog/why-robot-brains-will-live-in-the-cloud/index.html`
- Inspect: `styles-75.css`
- Inspect: `blog/blog-index.css`
- Inspect: `blog/why-robot-brains-will-live-in-the-cloud/article.css`

**Interfaces:**
- Consumes: the committed header replacement from Task 1.
- Produces: visual and automated evidence that the home logo is consistent and the existing layout remains intact.

- [ ] **Step 1: Serve the isolated worktree**

Start a local static server from the worktree root:

```bash
/Users/ezr/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  -m http.server 4173 --bind 127.0.0.1
```

Expected: the server listens at `http://127.0.0.1:4173/`.

- [ ] **Step 2: Inspect all three pages at desktop and narrow widths**

Using the in-app browser, inspect:

- `http://127.0.0.1:4173/`
- `http://127.0.0.1:4173/blog/`
- `http://127.0.0.1:4173/blog/why-robot-brains-will-live-in-the-cloud/`

At desktop and a 390-pixel-wide viewport, confirm:

- the complete favicon composition is visible
- the mark is not stretched or compressed
- the home logo remains aligned in the upper-left corner
- the navigation remains aligned and clickable
- no page content shifts unexpectedly beneath the fixed header

- [ ] **Step 3: Re-run complete automated verification**

Run:

```bash
/Users/ezr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  --test tests/static-page.test.mjs
```

Expected: 14 tests pass with zero failures.

- [ ] **Step 4: Check patch scope and cleanliness**

Run:

```bash
git diff --check
git status --short
```

Expected: `git diff --check` prints nothing, and the worktree has no uncommitted changes.
