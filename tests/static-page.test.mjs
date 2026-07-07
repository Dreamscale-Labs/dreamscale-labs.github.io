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
