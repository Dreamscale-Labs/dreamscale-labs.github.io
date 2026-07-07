import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const html = existsSync("index.html") ? readFileSync("index.html", "utf8") : "";
const css = existsSync("styles.css") ? readFileSync("styles.css", "utf8") : "";
const dreamscaleSvg = existsSync("assets/logo/dreamscale.svg")
  ? readFileSync("assets/logo/dreamscale.svg", "utf8")
  : "";
const labsSvg = existsSync("assets/logo/labs.svg")
  ? readFileSync("assets/logo/labs.svg", "utf8")
  : "";

test("landing page contains the required Dreamscale copy and blog link", () => {
  assert.match(html, /aria-label="Dreamscale Labs"/);
  assert.match(html, /src="\/assets\/logo\/dreamscale\.svg"/);
  assert.match(html, /src="\/assets\/logo\/labs\.svg"/);
  assert.match(
    html,
    /DSL is an applied research company working towards a future of truly general robots\./
  );
  assert.match(html, /href="\/blog\/?"/);
});

test("landing page uses static SVG logo assets and the required local body font", () => {
  assert.match(dreamscaleSvg, /<svg\b/);
  assert.match(dreamscaleSvg, /data:image\/png;base64/);
  assert.match(labsSvg, /<svg\b/);
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
  assert.match(css, /\.wordmark\s*{[^}]*gap:\s*clamp\(0\.55rem,\s*1\.2vw,\s*1\.05rem\)/s);
  assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*\.tagline\s*{[\s\S]*left:\s*50%/);
  assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*\.tagline\s*{[\s\S]*transform:\s*translateX\(-50%\)/);
});
