# Dreamscale Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static Dreamscale Labs landing page matching the approved minimal composition, typography, gradient, and copy.

**Architecture:** This is a dependency-free GitHub Pages site. `index.html` owns semantic structure, `styles.css` owns visual design and responsive behavior, `assets/fonts/` stores the local web fonts, and `tests/static-page.test.mjs` verifies the static contract.

**Tech Stack:** HTML, CSS, local WOFF2/TTF fonts, Node.js built-in test runner and assertions.

## Global Constraints

- The hero text must be exactly `dreamscale labs`, split across two visible lines.
- The hero font must be Nabla.
- The bottom sentence must be exactly `DSL is an applied research company working towards a future of truly general robotics.`
- The bottom sentence must use Mluvka at font weight 400.
- The top-right navigation must link to `blog`.
- The background must include a gentle purple gradient concentrated in the top third.
- The implementation must remain static and suitable for GitHub Pages.
- No framework, build system, or external network dependency should be added.

---

### Task 1: Static Page Contract Test

**Files:**
- Create: `tests/static-page.test.mjs`

**Interfaces:**
- Consumes: future `index.html` and `styles.css` files.
- Produces: a test command, `node --test tests/static-page.test.mjs`, that verifies the landing page contract.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const html = existsSync("index.html") ? readFileSync("index.html", "utf8") : "";
const css = existsSync("styles.css") ? readFileSync("styles.css", "utf8") : "";

test("landing page contains the required Dreamscale copy and blog link", () => {
  assert.match(html, /dreamscale\s*<br\s*\/?>\s*labs/);
  assert.match(
    html,
    /DSL is an applied research company working towards a future of truly general robotics\./
  );
  assert.match(html, /href="\/blog\/?"/);
});

test("landing page declares and uses the required local fonts", () => {
  assert.match(css, /@font-face\s*{[^}]*font-family:\s*"Nabla"/s);
  assert.match(css, /@font-face\s*{[^}]*font-family:\s*"Mluvka"/s);
  assert.match(css, /Nabla-Regular-VariableFont_EDPT,EHLT\.ttf/);
  assert.match(css, /Mluvka-Regular-web\.woff2/);
  assert.match(css, /\.wordmark\s*{[^}]*font-family:\s*"Nabla"/s);
  assert.match(css, /\.tagline\s*{[^}]*font-family:\s*"Mluvka"/s);
  assert.match(css, /\.tagline\s*{[^}]*font-weight:\s*400/s);
});

test("landing page includes the approved purple gradient and responsive safeguards", () => {
  assert.match(css, /linear-gradient\(/);
  assert.match(css, /#9b8df4|#a79af6|#b9aff8|#d9ddf6/i);
  assert.match(css, /min-height:\s*100svh/);
  assert.match(css, /clamp\(/);
  assert.match(css, /overflow-wrap:\s*balance|text-wrap:\s*balance/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/static-page.test.mjs`

Expected: FAIL because `index.html` and `styles.css` do not exist yet.

### Task 2: Landing Page Files and Fonts

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `assets/fonts/Nabla-Regular-VariableFont_EDPT,EHLT.ttf`
- Create: `assets/fonts/Mluvka-Regular-web.woff2`

**Interfaces:**
- Consumes: the static contract test from Task 1.
- Produces: a GitHub Pages-ready landing page.

- [ ] **Step 1: Copy fonts into the site**

Copy:
- `/Users/ezr/Downloads/Nabla/Nabla-Regular-VariableFont_EDPT,EHLT.ttf` to `assets/fonts/Nabla-Regular-VariableFont_EDPT,EHLT.ttf`
- `/Users/ezr/Downloads/Mluvka_v3.001/Web/Mluvka-Regular-web.woff2` to `assets/fonts/Mluvka-Regular-web.woff2`

- [ ] **Step 2: Add semantic HTML**

Create `index.html` with a top-right blog link, centered wordmark, and bottom tagline.

- [ ] **Step 3: Add CSS**

Create `styles.css` with local `@font-face` rules, the lavender top-third gradient, centered Nabla wordmark, and Mluvka 400 tagline.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/static-page.test.mjs`

Expected: PASS.

### Task 3: Static Serving Verification

**Files:**
- Read: `index.html`
- Read: `styles.css`

**Interfaces:**
- Consumes: completed static site files.
- Produces: evidence that the page serves locally.

- [ ] **Step 1: Start a local static server**

Run: `python3 -m http.server 4173`

Expected: server listens on `http://localhost:4173/`.

- [ ] **Step 2: Fetch the page and stylesheet**

Run: `curl -I http://localhost:4173/` and `curl -I http://localhost:4173/styles.css`

Expected: both return HTTP 200.

- [ ] **Step 3: Stop the local server**

Stop the process after verification.

## Self-Review

- Spec coverage: page copy, fonts, gradient, blog link, responsiveness, and static hosting are covered.
- Placeholder scan: no placeholder requirements remain.
- Type consistency: not applicable; this is a static HTML/CSS implementation.
