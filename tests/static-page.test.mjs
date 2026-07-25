import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const html = existsSync("index.html") ? readFileSync("index.html", "utf8") : "";
const landingCssPath = "styles-75.css";
const blogCssPath = "blog/blog-index.css";
const articlePath = "blog/why-robot-brains-will-live-in-the-cloud/index.html";
const articleCssPath =
  "blog/why-robot-brains-will-live-in-the-cloud/article.css";
const css = existsSync(landingCssPath)
  ? readFileSync(landingCssPath, "utf8")
  : "";
const wordmarkPath = "assets/logo/dreamscale-labs.svg";
const wordmarkSvg = existsSync(wordmarkPath)
  ? readFileSync(wordmarkPath, "utf8")
  : "";
const blogIndex = existsSync("blog/index.html")
  ? readFileSync("blog/index.html", "utf8")
  : "";
const blogCss = existsSync(blogCssPath)
  ? readFileSync(blogCssPath, "utf8")
  : "";
const articleHtml = existsSync(articlePath)
  ? readFileSync(articlePath, "utf8")
  : "";
const articleCss = existsSync(articleCssPath)
  ? readFileSync(articleCssPath, "utf8")
  : "";

test("landing page contains the required Dreamscale copy and links directly to the blog", () => {
  assert.ok(existsSync("assets/logo/dsl-mark.png"));
  assert.match(html, /<a class="site-logo" href="\/" aria-label="Dreamscale Labs home">/);
  assert.match(html, /src="\/assets\/logo\/dsl-mark\.png"/);
  assert.match(html, /width="1302"/);
  assert.match(html, /height="960"/);
  assert.match(html, /aria-label="Dreamscale Labs"/);
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

test("pages load fresh scaled styles and expose no visible fallback wordmark", () => {
  assert.ok(existsSync(landingCssPath));
  assert.ok(existsSync(blogCssPath));
  assert.match(html, /<link rel="stylesheet" href="\/styles-75\.css">/);
  assert.match(
    blogIndex,
    /<link rel="stylesheet" href="\/blog\/blog-index\.css">/
  );
  assert.match(
    html,
    /<h1 class="wordmark" id="wordmark" aria-label="Dreamscale Labs">\s*<img/
  );
  assert.doesNotMatch(html, /visually-hidden|>Dreamscale Labs<\/span>/);
  assert.ok(!existsSync("blog/blog-75.css"));
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
  assert.match(
    css,
    /\.site-logo\s*{[^}]*width:\s*clamp\(4\.25rem,\s*7vw,\s*5\.5rem\)/s
  );
  assert.match(css, /\.site-logo img\s*{[^}]*height:\s*auto/s);
  assert.match(css, /\.site-logo img\s*{[^}]*transform:\s*scaleY\(0\.8\)/s);
  assert.match(css, /\.site-logo img\s*{[^}]*transform-origin:\s*top left/s);
  assert.match(css, /\.wordmark-image\s*{[^}]*width:\s*100%/s);
  assert.match(css, /\.wordmark-image\s*{[^}]*height:\s*auto/s);
  assert.match(css, /min-height:\s*100svh/);
  assert.match(css, /clamp\(/);
  assert.match(css, /overflow-wrap:\s*balance|text-wrap:\s*balance/);
  assert.match(
    css,
    /@media \(max-width:\s*480px\)[\s\S]*\.wordmark\s*{[\s\S]*width:\s*min\(117\.333333vw,\s*24rem\)/
  );
});

test("landing page reproduces 75 percent browser zoom", () => {
  assert.match(css, /body\s*{[^}]*zoom:\s*0\.75/s);
  assert.match(css, /\.landing\s*{[^}]*min-height:\s*133\.333333svh/s);
  assert.match(css, /\.wordmark\s*{[^}]*width:\s*min\(104vw,\s*64rem\)/s);
  assert.match(css, /@media \(max-width:\s*480px\)/);
  assert.doesNotMatch(css, /@media \(max-width:\s*640px\)/);
});

test("blog index matches the Dreamscale identity and lists the canonical essay", () => {
  assert.match(blogIndex, /<h1 class="index-title">Blog<\/h1>/);
  assert.match(blogIndex, /<title>Blog — Dreamscale Labs<\/title>/);
  assert.match(blogIndex, /aria-label="Blog posts"/);
  assert.doesNotMatch(blogIndex, /<article class="article">/);
  assert.match(
    blogIndex,
    /href="\/blog\/why-robot-brains-will-live-in-the-cloud\/"/
  );
  assert.match(blogIndex, /<time datetime="2026-07-24">July 24, 2026<\/time>/);
  assert.match(blogIndex, /Why Robot Brains Will Live in the Cloud/);
  assert.match(blogIndex, /The case for off-board robotics inference/);
  assert.match(blogIndex, /src="\/assets\/logo\/dsl-mark\.png"/);
});

test("blog index uses Mluvka titles and Crimson Text descriptions at the shared scale", () => {
  assert.match(blogCss, /@font-face\s*{[^}]*font-family:\s*"Mluvka"/s);
  assert.match(blogCss, /Mluvka-Regular-web\.woff2/);
  assert.match(
    blogIndex,
    /fonts\.googleapis\.com\/css2\?family=Crimson\+Text:wght@400;600&amp;display=swap/
  );
  assert.match(blogCss, /--title-font:\s*"Mluvka"/);
  assert.match(blogCss, /--text-font:\s*"Crimson Text"/);
  assert.match(
    blogCss,
    /\.index-title\s*{[^}]*font-family:\s*var\(--title-font\)/s
  );
  assert.match(
    blogCss,
    /\.post-title\s*{[^}]*font-family:\s*var\(--title-font\)/s
  );
  assert.match(
    blogCss,
    /\.post-description\s*{[^}]*font-family:\s*var\(--text-font\)/s
  );
  assert.match(
    blogCss,
    /\.post-description\s*{[^}]*font-size:\s*clamp\(1\.2rem,\s*2\.8vw,\s*1\.45rem\)/s
  );
  assert.match(blogCss, /body\s*{[^}]*zoom:\s*0\.75/s);
  assert.match(blogCss, /@media \(max-width:\s*510px\)/);
  assert.match(blogCss, /:focus-visible/);
});

test("canonical article route preserves the complete research essay and latest additions", () => {
  assert.ok(existsSync(articlePath));
  assert.ok(existsSync(articleCssPath));
  assert.ok(existsSync("assets/blog/cloud-inference-architecture.png"));
  assert.match(articleHtml, /<article class="article">/);
  assert.match(articleHtml, /<h1>Why Robot Brains Will Live in the Cloud<\/h1>/);
  assert.match(articleHtml, /The case for off-board robotics inference/);
  assert.doesNotMatch(articleHtml, /Essay 001|18 min read/);
  assert.doesNotMatch(articleHtml, /<div class="article-meta">/);
  assert.match(articleHtml, /Scaling Laws are Here to Stay/);
  assert.match(articleHtml, /The State of On-board Compute/);
  assert.match(
    articleHtml,
    /Impacts on Robot Cost, Hardware, Access, and Beyond/
  );
  assert.match(articleHtml, /Critiques on Off-board Inference/);
  assert.match(articleHtml, /cloud-inference-architecture\.png/);
  assert.match(articleHtml, /<table>/);
  assert.match(articleHtml, /<figcaption>/);
  assert.equal([...articleHtml.matchAll(/<figcaption>/g)].length, 2);
  assert.match(articleHtml, /class="end-note"/);
  assert.match(articleHtml, /mailto:contact@dreamscalelabs\.com/);
  assert.match(articleHtml, /src="\/assets\/logo\/dsl-mark\.png"/);
  assert.match(
    articleHtml,
    /href="\/blog\/why-robot-brains-will-live-in-the-cloud\/article\.css"/
  );
  assert.equal([...articleHtml.matchAll(/<p(?:\s|>)/g)].length, 60);
  assert.equal([...articleHtml.matchAll(/<h2>/g)].length, 6);
  assert.equal([...articleHtml.matchAll(/<h3>/g)].length, 6);
});

test("article titles use Mluvka and reading text uses Crimson Text at the shared scale", () => {
  assert.match(
    articleHtml,
    /fonts\.googleapis\.com\/css2\?family=Crimson\+Text:wght@400;600&amp;display=swap/
  );
  assert.match(articleCss, /@font-face\s*{[^}]*font-family:\s*"Mluvka"/s);
  assert.match(articleCss, /--title-font:\s*"Mluvka"/);
  assert.match(articleCss, /--text-font:\s*"Crimson Text"/);
  assert.match(
    articleCss,
    /\.article-title-block h1\s*{[^}]*font-family:\s*var\(--title-font\)/s
  );
  assert.match(
    articleCss,
    /\.article\s*{[^}]*font-family:\s*var\(--text-font\)/s
  );
  assert.match(
    articleCss,
    /\.article\s*{[^}]*font-size:\s*clamp\(1\.25rem,\s*2\.266667vw,\s*1\.4rem\)/s
  );
  assert.match(articleCss, /\.table-wrap\s*{[^}]*overflow-x:\s*auto/s);
  assert.match(articleCss, /body\s*{[^}]*zoom:\s*0\.75/s);
  assert.match(articleCss, /@media \(max-width:\s*510px\)/);
  assert.match(articleCss, /\.end-note\s*{/);
  assert.match(articleCss, /figcaption\s*{/);
  assert.match(articleCss, /:focus-visible/);
});

test("blog routes use root-relative local references that exist", () => {
  const pages = new Map([
    ["blog/index.html", blogIndex],
    [articlePath, articleHtml],
  ]);

  for (const [pagePath, pageHtml] of pages) {
    const refs = [...pageHtml.matchAll(/(?:href|src)="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((ref) => !/^(?:https?:|mailto:|#)/.test(ref));

    for (const ref of refs) {
      assert.match(ref, /^\//, `${pagePath} must use a root-relative reference`);
      const targetPath = ref.endsWith("/")
        ? `${ref.slice(1)}index.html`
        : ref.slice(1);
      assert.ok(
        existsSync(targetPath),
        `${pagePath} resolves ${ref} to missing ${targetPath}`
      );
    }
  }

  for (const [cssPath, cssSource] of [
    [blogCssPath, blogCss],
    [articleCssPath, articleCss],
  ]) {
    const fontRef = cssSource.match(
      /url\("([^"]+Mluvka-Regular-web\.woff2)"\)/
    )?.[1];
    assert.equal(fontRef, "/assets/fonts/Mluvka-Regular-web.woff2");
    assert.ok(existsSync(fontRef.slice(1)), `${cssPath} resolves ${fontRef}`);
  }
});
