import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const html = existsSync("index.html") ? readFileSync("index.html", "utf8") : "";
const landingCssPath = "assets/landing/landing.css";
const blogCssPath = "blog/blog-index.css";
const articlePath = "blog/why/index.html";
const articleCssPath =
  "blog/why/article.css";
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

function readPngMetadata(path) {
  const png = readFileSync(path);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.deepEqual(png.subarray(0, 8), signature, `${path} must be a PNG`);
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    colorType: png[25],
  };
}

function readIcoSizes(path) {
  const ico = readFileSync(path);
  assert.equal(ico.readUInt16LE(0), 0, `${path} has an invalid reserved field`);
  assert.equal(ico.readUInt16LE(2), 1, `${path} must contain icons`);
  const count = ico.readUInt16LE(4);
  return Array.from({ length: count }, (_, index) => {
    const offset = 6 + index * 16;
    return {
      width: ico[offset] || 256,
      height: ico[offset + 1] || 256,
    };
  });
}

test("favicon raster assets cover modern platform sizes", () => {
  const pngSizes = new Map([
    ["favicon-16x16.png", 16],
    ["favicon-32x32.png", 32],
    ["apple-touch-icon.png", 180],
    ["android-chrome-192x192.png", 192],
    ["android-chrome-512x512.png", 512],
    ["android-chrome-maskable-512x512.png", 512],
  ]);

  for (const [path, size] of pngSizes) {
    assert.ok(existsSync(path), `${path} must exist`);
    assert.deepEqual(readPngMetadata(path), {
      width: size,
      height: size,
      colorType: path.includes("maskable") ? 2 : 6,
    });
  }

  assert.ok(existsSync("favicon.ico"), "favicon.ico must exist");
  assert.deepEqual(readIcoSizes("favicon.ico").sort((a, b) => a.width - b.width), [
    { width: 16, height: 16 },
    { width: 32, height: 32 },
    { width: 48, height: 48 },
  ]);
});

test("every public page declares the complete favicon metadata set", () => {
  const pages = new Map([
    ["index.html", html],
    ["blog/index.html", blogIndex],
    [articlePath, articleHtml],
  ]);
  const requiredTags = [
    '<link rel="icon" href="/favicon.ico" sizes="any">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
    '<link rel="manifest" href="/site.webmanifest">',
    '<meta name="theme-color" content="#ffffff">',
  ];

  for (const [path, source] of pages) {
    for (const tag of requiredTags) {
      assert.ok(source.includes(tag), `${path} must contain ${tag}`);
    }
  }

  assert.ok(existsSync("site.webmanifest"), "site.webmanifest must exist");
  const manifest = JSON.parse(readFileSync("site.webmanifest", "utf8"));
  assert.deepEqual(manifest, {
    name: "Dreamscale Labs",
    short_name: "DSL",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    theme_color: "#ffffff",
    background_color: "#ffffff",
    display: "browser",
    start_url: "/",
    scope: "/",
  });

  for (const icon of manifest.icons) {
    assert.ok(existsSync(icon.src.slice(1)), `${icon.src} must resolve`);
  }
});

test("site headers use the undistorted standard favicon", () => {
  const pages = new Map([
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

test("blog index matches the Dreamscale identity and lists the canonical essay", () => {
  assert.match(blogIndex, /<h1 class="index-title">Blog<\/h1>/);
  assert.match(blogIndex, /<title>Blog — Dreamscale Labs<\/title>/);
  assert.match(blogIndex, /aria-label="Blog posts"/);
  assert.doesNotMatch(blogIndex, /<article class="article">/);
  assert.match(
    blogIndex,
    /href="\/blog\/why\/"/
  );
  assert.match(blogIndex, /<time datetime="2026-07-24">July 24, 2026<\/time>/);
  assert.match(blogIndex, /Why Robot Brains Will Live in the Cloud/);
  assert.match(blogIndex, /The case for off-board robotics inference/);
  assert.match(blogIndex, /src="\/android-chrome-512x512\.png"/);
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
  assert.match(articleHtml, /src="\/android-chrome-512x512\.png"/);
  assert.match(
    articleHtml,
    /href="\/blog\/why\/article\.css"/
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

test("landing serves the selected design with working local assets and demo links", () => {
  assert.doesNotMatch(html, /Dropbear|dropbear|noindex|prototypes\/|All concepts/);
  assert.match(html, /on a single H100/);
  assert.match(html, /Real-Time Chunking \(RTC\)/);
  assert.match(html, /<span class="yc-launch">/);
  assert.match(html, /https:\/\/cal.com\/team\/dreamscale-labs\/demo/);
  assert.ok(html.indexOf('youtube.com/embed') < html.indexOf('class="proof"'));
  for (const [, ref] of html.matchAll(/(?:src|href|poster)="(\/[^"?#]*)"/g)) {
    const target = ref.endsWith('/') ? ref.slice(1) + 'index.html' : ref.slice(1);
    assert.ok(existsSync(target), `Missing asset: ${ref}`);
  }
  assert.match(css, /prefers-reduced-motion/);
});
