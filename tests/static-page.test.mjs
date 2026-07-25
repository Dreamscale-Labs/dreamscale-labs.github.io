import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const html = existsSync("index.html") ? readFileSync("index.html", "utf8") : "";
const css = existsSync("styles.css") ? readFileSync("styles.css", "utf8") : "";
const blogIndex = existsSync("blog/index.html")
  ? readFileSync("blog/index.html", "utf8")
  : "";
const blogCss = existsSync("blog/blog.css")
  ? readFileSync("blog/blog.css", "utf8")
  : "";
const articlePath = "blog/why-robot-brains-will-live-in-the-cloud/index.html";
const articleCssPath =
  "blog/why-robot-brains-will-live-in-the-cloud/article.css";
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
  assert.match(html, /<span class="wordmark-line wordmark-line-primary">Dreamscale<\/span>/);
  assert.match(html, /<span class="wordmark-line wordmark-line-secondary">Labs<\/span>/);
  assert.match(
    html,
    /DSL is an applied research company working towards a future of truly general robots\./
  );
  assert.match(html, /<a class="nav-link" href="\/blog\/">Blog<\/a>/);
});

test("landing page uses the local Nabla wordmark and Mluvka body font", () => {
  assert.match(css, /@font-face\s*{[^}]*font-family:\s*"Nabla"/s);
  assert.match(css, /Nabla-Regular-VariableFont_EDPT,EHLT\.ttf/);
  assert.match(css, /@font-face\s*{[^}]*font-family:\s*"Mluvka"/s);
  assert.match(css, /Mluvka-Regular-web\.woff2/);
  assert.match(css, /\.wordmark\s*{[^}]*font-family:\s*"Nabla"/s);
  assert.match(css, /\.wordmark\s*{[^}]*font-variation-settings:\s*"EDPT"\s+100,\s*"EHLT"\s+12/s);
  assert.match(css, /\.tagline\s*{[^}]*font-family:\s*"Mluvka"/s);
  assert.match(css, /\.tagline\s*{[^}]*font-weight:\s*400/s);
});

test("landing page uses the D45 ink-on-white palette and responsive safeguards", () => {
  assert.match(css, /@font-palette-values\s+--d45-ink-on-white/);
  assert.match(
    css,
    /override-colors:\s*0 #212121,\s*1 #000000,\s*2 #111111,\s*3 #292929,\s*4 #575757,\s*5 #989898,\s*6 #202020,\s*7 #686868,\s*8 #e9e9e9,\s*9 #ffffff;/s
  );
  assert.match(css, /\.wordmark-line\s*{[^}]*font-palette:\s*--d45-ink-on-white/s);
  assert.match(css, /--paper:\s*#ffffff/);
  assert.match(css, /body\s*{[^}]*background:\s*var\(--paper\)/s);
  assert.match(css, /\.site-header\s*{[^}]*justify-content:\s*space-between/s);
  assert.match(css, /\.site-logo\s*{[^}]*width:\s*clamp\(4\.25rem,\s*5\.25vw,\s*5\.5rem\)/s);
  assert.match(css, /\.site-logo img\s*{[^}]*height:\s*auto/s);
  assert.match(css, /\.site-logo img\s*{[^}]*transform:\s*scaleY\(0\.8\)/s);
  assert.match(css, /\.site-logo img\s*{[^}]*transform-origin:\s*top left/s);
  assert.match(css, /min-height:\s*100svh/);
  assert.match(css, /clamp\(/);
  assert.match(css, /overflow-wrap:\s*balance|text-wrap:\s*balance/);
  assert.match(css, /\.wordmark\s*{[^}]*gap:\s*clamp\(0\.1rem,\s*0\.3vw,\s*0\.3rem\)/s);
  assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*\.wordmark\s*{[\s\S]*width:\s*min\(88vw,\s*24rem\)/);
  assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*\.tagline\s*{[\s\S]*left:\s*50%/);
  assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*\.tagline\s*{[\s\S]*transform:\s*translateX\(-50%\)/);
});

test("blog index matches the Dreamscale identity and lists the canonical essay", () => {
  assert.ok(existsSync("blog/blog.css"));
  assert.match(blogIndex, /<h1 class="index-title">Research<\/h1>/);
  assert.doesNotMatch(blogIndex, /<article class="article">/);
  assert.match(
    blogIndex,
    /href="\/blog\/why-robot-brains-will-live-in-the-cloud\/"/
  );
  assert.match(blogIndex, /<time datetime="2026-07-24">July 24, 2026<\/time>/);
  assert.match(blogIndex, /Why Robot Brains Will Live in the Cloud/);
  assert.match(blogIndex, /The case for off-board robotics inference/);
  assert.match(blogIndex, /src="\/assets\/logo\/dsl-mark\.png"/);
  assert.match(blogIndex, /href="\/blog\/blog\.css"/);
});

test("blog index uses Mluvka titles and Crimson Text descriptions", () => {
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
  assert.match(blogCss, /:focus-visible/);
  assert.match(blogCss, /@media \(max-width:\s*680px\)/);
});

test("canonical article route preserves the complete research essay", () => {
  assert.ok(existsSync(articlePath));
  assert.ok(existsSync(articleCssPath));
  assert.ok(existsSync("assets/blog/cloud-inference-architecture.png"));
  assert.match(articleHtml, /<article class="article">/);
  assert.match(articleHtml, /<h1>Why Robot Brains Will Live in the Cloud<\/h1>/);
  assert.match(articleHtml, /The case for off-board robotics inference/);
  assert.match(articleHtml, /Essay 001/);
  assert.match(articleHtml, /18 min read/);
  assert.match(articleHtml, /Scaling Laws are Here to Stay/);
  assert.match(articleHtml, /The State of On-board Compute/);
  assert.match(
    articleHtml,
    /Impacts on Robot Cost, Hardware, Access, and Beyond/
  );
  assert.match(articleHtml, /Critiques on Off-board Inference/);
  assert.match(articleHtml, /cloud-inference-architecture\.png/);
  assert.match(articleHtml, /<table>/);
  assert.match(articleHtml, /contact@dreamscalelabs\.com/);
  assert.match(articleHtml, /src="\/assets\/logo\/dsl-mark\.png"/);
  assert.match(
    articleHtml,
    /href="\/blog\/why-robot-brains-will-live-in-the-cloud\/article\.css"/
  );
  assert.equal([...articleHtml.matchAll(/<p(?:\s|>)/g)].length, 60);
  assert.equal([...articleHtml.matchAll(/<h2>/g)].length, 6);
  assert.equal([...articleHtml.matchAll(/<h3>/g)].length, 6);
});

test("article titles use Mluvka and reading text uses Crimson Text", () => {
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
  assert.match(articleCss, /\.table-wrap\s*{[^}]*overflow-x:\s*auto/s);
  assert.match(articleCss, /:focus-visible/);
  assert.match(articleCss, /@media \(max-width:\s*680px\)/);
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
    ["blog/blog.css", blogCss],
    [articleCssPath, articleCss],
  ]) {
    const fontRef = cssSource.match(
      /url\("([^"]+Mluvka-Regular-web\.woff2)"\)/
    )?.[1];
    assert.equal(fontRef, "/assets/fonts/Mluvka-Regular-web.woff2");
    assert.ok(existsSync(fontRef.slice(1)), `${cssPath} resolves ${fontRef}`);
  }
});
