import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const html = existsSync("index.html") ? readFileSync("index.html", "utf8") : "";
const css = existsSync("styles.css") ? readFileSync("styles.css", "utf8") : "";
const dreamscaleSvg = existsSync("assets/logo/dreamscale.svg")
  ? readFileSync("assets/logo/dreamscale.svg", "utf8")
  : "";
const labsSvg = existsSync("assets/logo/labs.svg")
  ? readFileSync("assets/logo/labs.svg", "utf8")
  : "";
const blogIndex = existsSync("blog/index.html")
  ? readFileSync("blog/index.html", "utf8")
  : "";
const blogCss = existsSync("blog/blog.css")
  ? readFileSync("blog/blog.css", "utf8")
  : "";

test("landing page contains the required Dreamscale copy and links directly to the blog", () => {
  assert.match(html, /aria-label="Dreamscale Labs"/);
  assert.match(html, /src="\/assets\/logo\/dreamscale\.svg"/);
  assert.match(html, /src="\/assets\/logo\/labs\.svg"/);
  assert.match(
    html,
    /DSL is an applied research company working towards a future of truly general robots\./
  );
  assert.match(html, /href="\/blog\/"/);
});

test("landing page uses static SVG logo assets and the required local body font", () => {
  assert.match(dreamscaleSvg, /<svg\b/);
  assert.match(dreamscaleSvg, /viewBox="0 52 939 224"/);
  assert.match(dreamscaleSvg, /data:image\/png;base64/);
  assert.match(labsSvg, /<svg\b/);
  assert.match(labsSvg, /viewBox="0 52 366 224"/);
  assert.match(labsSvg, /data:image\/png;base64/);
  assert.match(css, /@font-face\s*{[^}]*font-family:\s*"Mluvka"/s);
  assert.match(css, /Mluvka-Regular-web\.woff2/);
  assert.doesNotMatch(css, /\.wordmark\s*{[^}]*font-family:\s*"Nabla"/s);
  assert.match(css, /\.tagline\s*{[^}]*font-family:\s*"Mluvka"/s);
  assert.match(css, /\.tagline\s*{[^}]*font-weight:\s*400/s);
});

test("landing page includes the approved purple gradient and responsive safeguards", () => {
  assert.match(css, /linear-gradient\(/);
  assert.match(css, /#9b8df4|#a79af6|#b9aff8|#d9ddf6/i);
  assert.match(css, /min-height:\s*100svh/);
  assert.match(css, /clamp\(/);
  assert.match(css, /overflow-wrap:\s*balance|text-wrap:\s*balance/);
  assert.match(css, /\.wordmark\s*{[^}]*gap:\s*clamp\(0\.2rem,\s*0\.45vw,\s*0\.45rem\)/s);
  assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*\.wordmark\s*{[\s\S]*width:\s*min\(78vw,\s*21rem\)/);
  assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*\.wordmark\s*{[\s\S]*gap:\s*clamp\(0\.1rem,\s*0\.6vw,\s*0\.25rem\)/);
  assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*\.tagline\s*{[\s\S]*left:\s*50%/);
  assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*\.tagline\s*{[\s\S]*transform:\s*translateX\(-50%\)/);
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
