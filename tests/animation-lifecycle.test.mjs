import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

for (const [file, id] of [['cloud-hero.js', 'cloud-canvas'], ['cloud-hero.js', 'inference-canvas'], ['loss-curve.js', 'loss-canvas']]) {
  test(`${id} pauses when peripheral or hidden and renders at 30 FPS`, () => {
    let intersection, visibility, renders = 0, nextId = 0;
    const frames = new Map();
    const context = new Proxy({}, { get: (_, name) => name === 'clearRect' ? () => renders++ : () => {} });
    const canvas = { id, getContext: () => context };
    const document = {
      hidden: false,
      querySelectorAll: () => [canvas], getElementById: () => canvas,
      querySelector: () => ({}), createElement: () => ({ getContext: () => ({ getImageData: () => ({ data: [] }) }) }),
      fonts: { ready: { then() {} } },
      addEventListener: (_, callback) => { visibility = callback; }
    };
    runInNewContext(readFileSync(new URL(`../assets/landing/${file}`, import.meta.url), 'utf8'), {
      document, Path2D: class {}, devicePixelRatio: 2,
      DreamscaleRobot: { draw() {} },
      matchMedia: () => ({ addEventListener() {}, removeEventListener() {} }),
      ResizeObserver: class { observe() {} },
      IntersectionObserver: class { constructor(callback) { intersection = callback; } observe() {} },
      requestAnimationFrame: callback => { frames.set(++nextId, callback); return nextId; },
      cancelAnimationFrame: id => frames.delete(id)
    });
    const show = ratio => intersection([{ isIntersecting: ratio > 0, intersectionRatio: ratio }]);
    const tick = time => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(time)); };
    assert.equal(frames.size, 0);
    show(.1); assert.equal(frames.size, 0);
    show(.5); assert.equal(frames.size, 1);
    for (let i = 0; i < 120; i++) tick(i * 1000 / 120);
    assert.equal(renders, 30);
    document.hidden = true; visibility(); assert.equal(frames.size, 0);
    document.hidden = false; visibility(); assert.equal(frames.size, 1);
    show(0); assert.equal(frames.size, 0);
    show(.5); tick(5000); assert.equal(renders, 31);
  });
}
