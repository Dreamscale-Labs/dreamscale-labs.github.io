import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const html = existsSync("index.html") ? readFileSync("index.html", "utf8") : "";
const css = existsSync("styles.css") ? readFileSync("styles.css", "utf8") : "";
const wordmarkPath = "assets/logo/dreamscale-labs.svg";
const wordmarkSvg = existsSync(wordmarkPath)
  ? readFileSync(wordmarkPath, "utf8")
  : "";
const blogIndex = existsSync("blog/index.html")
  ? readFileSync("blog/index.html", "utf8")
  : "";
const blogCss = existsSync("blog/blog.css")
  ? readFileSync("blog/blog.css", "utf8")
  : "";

test("landing page contains the required Dreamscale copy and links directly to the blog", () => {
  assert.ok(existsSync("assets/logo/dsl-mark.png"));
  assert.match(html, /<a class="site-logo" href="\/" aria-label="Dreamscale Labs home">/);
  assert.match(html, /src="\/assets\/logo\/dsl-mark\.png"/);
  assert.match(html, /width="1302"/);
  assert.match(html, /height="960"/);
  assert.match(html, /<span class="visually-hidden">Dreamscale Labs<\/span>/);
  assert.match(
    html,
    /DSL is an applied research company working towards a future of truly general robots\./
  );
  assert.match(html, /<a class="nav-link" href="\/blog\/">Blog<\/a>/);
});

test("landing page uses one optimized self-contained SVG wordmark", () => {
  assert.ok(existsSync(wordmarkPath));
  assert.match(
    html,
    /rel="preload"\s+href="\/assets\/logo\/dreamscale-labs\.svg"\s+as="image"/
  );
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
  assert.doesNotMatch(
    wordmarkSvg,
    /(?:href|src)="https?:|@font-face|Nabla-Regular/
  );
  assert.ok(
    statSync(wordmarkPath).size < 200_000,
    `wordmark SVG is ${statSync(wordmarkPath).size} bytes`
  );
  assert.doesNotMatch(html, /Nabla-Regular-VariableFont/);
  assert.doesNotMatch(css, /font-family:\s*"Nabla"|@font-palette-values/);
});

test("landing page uses the local Mluvka body font", () => {
  assert.match(css, /@font-face\s*{[^}]*font-family:\s*"Mluvka"/s);
  assert.match(css, /Mluvka-Regular-web\.woff2/);
  assert.match(css, /\.tagline\s*{[^}]*font-family:\s*"Mluvka"/s);
  assert.match(css, /\.tagline\s*{[^}]*font-weight:\s*400/s);
});

test("landing page uses monochrome branding and responsive safeguards", () => {
  assert.match(css, /--paper:\s*#ffffff/);
  assert.match(css, /body\s*{[^}]*background:\s*var\(--paper\)/s);
  assert.match(css, /\.site-header\s*{[^}]*justify-content:\s*space-between/s);
  assert.match(css, /\.site-logo\s*{[^}]*width:\s*clamp\(4\.25rem,\s*7vw,\s*5\.5rem\)/s);
  assert.match(css, /\.site-logo img\s*{[^}]*height:\s*auto/s);
  assert.match(css, /\.site-logo img\s*{[^}]*transform:\s*scaleY\(0\.8\)/s);
  assert.match(css, /\.site-logo img\s*{[^}]*transform-origin:\s*top left/s);
  assert.match(css, /\.wordmark-image\s*{[^}]*width:\s*100%/s);
  assert.match(css, /\.wordmark-image\s*{[^}]*height:\s*auto/s);
  assert.match(css, /min-height:\s*100svh/);
  assert.match(css, /clamp\(/);
  assert.match(css, /overflow-wrap:\s*balance|text-wrap:\s*balance/);
  assert.match(css, /@media \(max-width:\s*480px\)[\s\S]*\.wordmark\s*{[\s\S]*width:\s*min\(117\.333333vw,\s*24rem\)/);
  assert.match(css, /@media \(max-width:\s*480px\)[\s\S]*\.tagline\s*{[\s\S]*left:\s*50%/);
  assert.match(css, /@media \(max-width:\s*480px\)[\s\S]*\.tagline\s*{[\s\S]*transform:\s*translateX\(-50%\)/);
});

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

test("blog uses a shared responsive visual system", () => {
  assert.ok(existsSync("blog/blog.css"));
  assert.match(blogCss, /@font-face\s*{[^}]*font-family:\s*"Mluvka"/s);
  assert.match(blogCss, /Mluvka-Regular-web\.woff2/);
  assert.match(blogCss, /--lavender:/);
  assert.match(blogCss, /:focus-visible/);
  assert.match(blogCss, /@media \(max-width:\s*720px\)/);
  assert.match(blogCss, /prefers-reduced-motion/);
});

test("blog goes directly to the only article and drops both archive experiments", () => {
  assert.match(blogIndex, /<article\b/);
  assert.match(blogIndex, /<h1>Why Robot Brains Will Live in the Cloud<\/h1>/);
  assert.match(blogIndex, /href="\.\/blog\.css"/);
  assert.ok(!existsSync("blog/gallery/index.html"));
  assert.ok(!existsSync("blog/why-robot-brains-will-live-in-the-cloud/index.html"));
  assert.doesNotMatch(blogCss, /\.research-card\b/);
  assert.doesNotMatch(blogCss, /\.field-shell\b/);
});

test("canonical article is semantic and includes the draft's core research sections", () => {
  assert.ok(existsSync("assets/blog/cloud-inference-architecture.png"));
  assert.match(blogIndex, /<article\b/);
  assert.match(blogIndex, /<h1>Why Robot Brains Will Live in the Cloud<\/h1>/);
  assert.match(blogIndex, /The case for off-board robotics inference/);
  assert.match(blogIndex, /Scaling Laws are Here to Stay/);
  assert.match(blogIndex, /The State of On-board Compute/);
  assert.match(blogIndex, /Impacts on Robot Cost, Hardware, Access, and Beyond/);
  assert.match(blogIndex, /Critiques on Off-board Inference/);
  assert.match(blogIndex, /cloud-inference-architecture\.png/);
  assert.match(blogIndex, /<table>/);
  assert.match(blogIndex, /contact@dreamscalelabs\.com/);
  assert.match(blogIndex, /href="\.\/blog\.css"/);
});

test("every prototype asset and navigation path resolves when HTML is opened with file://", () => {
  const pages = new Map([
    ["blog/index.html", blogIndex],
  ]);

  for (const [pagePath, pageHtml] of pages) {
    const pageUrl = pathToFileURL(resolve(pagePath));
    const refs = [...pageHtml.matchAll(/(?:href|src)="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((ref) => !/^(?:https?:|mailto:|#)/.test(ref));

    for (const ref of refs) {
      assert.doesNotMatch(ref, /^\//, `${pagePath} uses root-relative reference ${ref}`);
      const target = fileURLToPath(new URL(ref, pageUrl));
      assert.ok(existsSync(target), `${pagePath} resolves ${ref} to missing ${target}`);
    }
  }

  const cssUrl = pathToFileURL(resolve("blog/blog.css"));
  const fontRef = blogCss.match(/url\("([^"]+Mluvka-Regular-web\.woff2)"\)/)?.[1];
  assert.ok(fontRef, "blog CSS declares the local Mluvka font");
  assert.doesNotMatch(fontRef, /^\//, "blog CSS font reference is root-relative");
  assert.ok(existsSync(fileURLToPath(new URL(fontRef, cssUrl))));
});
