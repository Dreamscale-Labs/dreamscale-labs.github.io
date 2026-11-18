// Figures for "256 robots, one node". Every number drawn here is a measured value quoted in the
// post, except the simulator-driven figures (hero, Fig. 03), which are
// labelled as such.
(function () {
  'use strict';

  const C = {
    ink: '#212121', muted: '#686868', faint: '#b9bcbf', line: '#e9e9e9', paper: '#ffffff',
    scene: '#2a5fc9', sceneSoft: '#c9d6f2', loop: '#3d8a5f', loopSoft: '#cfe3d6',
    lora: '#c46a1e', loraSoft: '#f1dcc8', queue: '#9aa0a6',
  };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const MEASURED = {
    node: { pts: [[240, 46.9], [256, 49.5], [264, 54.7], [272, 66.4]], over: 280 },
    // The fine-tune limit the post states: 157 robots within 50 ms p99, between the measured 152 and 160.
    lora: { pts: [[152, 48.7], [160, 50.9], [168, 52.7], [176, 53.5], [184, 55.1]], limit: 157 },
    colocated: { pts: [[128, 35.0]], over: 144 },
  };
  const svgNS = 'http://www.w3.org/2000/svg';

  function el(name, attrs, parent) {
    const node = document.createElementNS(svgNS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function text(parent, x, y, str, attrs) {
    const t = el('text', Object.assign({ x, y, fill: C.muted, 'font-size': 12 }, attrs || {}), parent);
    t.textContent = str;
    return t;
  }
  function fmt(x, d) { return x.toFixed(d === undefined ? 1 : d); }
  // First of the candidate strings that fits maxW at the context's current font (the last one if none does).
  function fit(ctx, maxW, ...opts) { for (const s of opts) if (ctx.measureText(s).width <= maxW) return s; return opts[opts.length - 1]; }

  // Canvas helper: crisp at any pixel ratio; calls draw(ctx, w, h).
  function canvasFor(canvas) {
    const ctx = canvas.getContext('2d');
    const state = { w: 0, h: 0 };
    function resize() {
      // Drawing happens in CSS pixels (clientWidth). The backing store follows the size actually shown on screen
      // (which includes the page's CSS zoom) times the device pixel ratio, and never less than 2x, so text stays sharp.
      state.w = canvas.clientWidth; state.h = canvas.clientHeight;
      const shown = canvas.getBoundingClientRect().width || state.w;
      const scale = Math.max(2, (devicePixelRatio || 1) * shown / Math.max(1, state.w));
      canvas.width = Math.round(state.w * scale); canvas.height = Math.round(state.h * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    }
    resize();
    new ResizeObserver(resize).observe(canvas);
    return { ctx, state };
  }

  // Run an animation only while its element is on screen.
  function whenVisible(node, start, stop) {
    new IntersectionObserver(entries => {
      for (const e of entries) (e.isIntersecting ? start : stop)();
    }, { threshold: 0.05 }).observe(node);
  }

  // Per-robot request lists for fast lookup by time.
  function indexByRobot(sim) {
    const per = Array.from({ length: sim.robots }, () => []);
    for (const q of sim.reqs) per[q.robot].push(q);
    for (const list of per) list.sort((a, b) => a.t - b.t);
    return per;
  }
  function stageAt(list, cursor, t) {
    // cursor: index hint, advanced monotonically within a playback loop.
    let i = cursor;
    while (i < list.length && list[i].done < t) i++;
    const q = list[i];
    if (!q || q.t > t) return [i, 'idle'];
    if (t < q.sceneStart) return [i, 'queue'];
    if (t < q.sceneEnd) return [i, 'scene'];
    if (q.admit === undefined || t < q.admit) return [i, 'handoff'];
    return [i, 'loop'];
  }
  // First index in reqs (sorted by t) with t >= tt.
  function lowerBound(reqs, tt) {
    let lo = 0, hi = reqs.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (reqs[mid].t < tt) lo = mid + 1; else hi = mid; }
    return lo;
  }

  /* ---------------------------------------------------------------- hero */
  function hero() {
    const fig = document.getElementById('hero-figure');
    if (!fig) return;
    const canvas = fig.querySelector('canvas');
    const { ctx, state } = canvasFor(canvas);
    const buttons = [...fig.querySelectorAll('[data-hero]')];
    const readout = fig.querySelector('.hero-readout');
    const SLOW = 12; // 1 s on screen = 1/12 s on the node
    const t0 = 2000, t1 = 10000;
    let sim, perRobot, cursors, cols, rows, start = null, raf = null, mode = 'node';

    function load(m) {
      mode = m;
      const robots = m === 'node' ? 256 : 157;
      sim = NodeSim.simulate({ mode: m, robots, seconds: 11, seed: 3 });
      perRobot = indexByRobot(sim);
      cursors = new Array(robots).fill(0);
      cols = 16; rows = Math.ceil(robots / cols);
      start = null;
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.hero === m)));
      if (readout) readout.textContent = m === 'node'
        ? '256 robots · 1,024 requests a second · one model'
        : '157 robots · 628 requests a second · 24 different fine-tunes';
      if (reduceMotion) draw(t0 + 1234);
    }

    function draw(t) {
      const { w, h } = state;
      ctx.clearRect(0, 0, w, h);
      const gap = Math.min(w / (cols + 1), h / (16 + 1));
      const ox = (w - gap * (cols - 1)) / 2, oy = (h - gap * (16 - 1)) / 2 + (16 - rows) * gap / 2;
      for (let i = 0; i < sim.robots; i++) {
        const x = ox + (i % cols) * gap, y = oy + Math.floor(i / cols) * gap;
        const [c, s] = stageAt(perRobot[i], cursors[i], t);
        cursors[i] = c;
        let r, fill;
        if (s === 'idle') { r = 1.6 + 0.9 * Math.abs(Math.sin(i * 7.31 + t * 0.002)); fill = C.faint; }
        else if (s === 'queue') { r = gap * 0.2; fill = C.queue; }
        else if (s === 'scene') { r = gap * 0.3; fill = C.scene; }
        else if (s === 'handoff') { r = gap * 0.26; fill = C.sceneSoft; }
        else { r = gap * 0.3; fill = mode === 'lora' ? C.lora : C.loop; }
        ctx.fillStyle = fill;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    }

    function frame(now) {
      if (start === null) start = now;
      const t = t0 + ((now - start) / SLOW) % (t1 - t0);
      if (t < t0 + 20) cursors.fill(0);
      draw(t);
      raf = requestAnimationFrame(frame);
    }
    buttons.forEach(b => b.addEventListener('click', () => load(b.dataset.hero)));
    load('node');
    if (reduceMotion) {
      new ResizeObserver(() => draw(t0 + 1234)).observe(canvas);
    } else {
      whenVisible(fig, () => { if (!raf) raf = requestAnimationFrame(frame); },
        () => { cancelAnimationFrame(raf); raf = null; });
    }
  }

  /* ------------------------------------------------- Fig. 2: batching */
  function batching() {
    const fig = document.getElementById('fig-batching');
    if (!fig) return;
    const svg = fig.querySelector('svg');
    const W = 680, H = 330, L = 52, R = 24, T = 20, B = 46;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const x = n => L + (n - 1) / 31 * (W - L - R);
    const y = v => T + (1 - v / 11) * (H - T - B);
    for (let v = 0; v <= 10; v += 2) {
      el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: C.line }, svg);
      text(svg, L - 10, y(v) + 4, String(v), { 'text-anchor': 'end' });
    }
    for (const n of [1, 8, 16, 24, 32]) text(svg, x(n), H - B + 20, String(n), { 'text-anchor': 'middle' });
    text(svg, (L + W - R) / 2, H - 6, 'robots sharing one batch', { 'text-anchor': 'middle' });
    text(svg, 12, T + 4, 'GPU ms per robot', { 'text-anchor': 'start', transform: `rotate(-90 12 ${T + 4})`, dy: 0 })
      .setAttribute('transform', `translate(0 ${H / 2 - 40}) rotate(-90 12 ${T + 4})`);

    // Measured: loop step (ms) at 1/8/16/24/32 robots; 10 steps per robot.
    const loopPts = [[1, 1.07], [8, 1.23], [16, 1.44], [24, 1.75], [32, 2.0]].map(([n, s]) => [n, 10 * s / n]);
    // Measured: scene reading per robot at 1/2/3 per call (as served on the node).
    const scenePts = [[1, 7.70], [2, 6.60], [3, 6.23]];
    const interp = (pts, n) => {
      for (let i = 1; i < pts.length; i++) if (n <= pts[i][0]) {
        const [a, ya] = pts[i - 1], [b, yb] = pts[i];
        return ya + (yb - ya) * (n - a) / (b - a);
      }
      return pts[pts.length - 1][1];
    };
    // Loop curve between measured points: interpolate the step time, then divide.
    const steps = [[1, 1.07], [8, 1.23], [16, 1.44], [24, 1.75], [32, 2.0]];
    let d = '';
    for (let n = 1; n <= 32; n += 0.25) d += (d ? 'L' : 'M') + x(n) + ' ' + y(10 * interp(steps, n) / n);
    el('path', { d, fill: 'none', stroke: C.loop, 'stroke-width': 2 }, svg);
    el('path', { d: scenePts.map((p, i) => (i ? 'L' : 'M') + x(p[0]) + ' ' + y(p[1])).join(''), fill: 'none', stroke: C.scene, 'stroke-width': 2 }, svg);
    el('path', { d: `M${x(3)} ${y(6.23)}L${x(32)} ${y(6.23)}`, fill: 'none', stroke: C.scene, 'stroke-width': 1.5, 'stroke-dasharray': '3 5' }, svg);
    for (const p of loopPts) el('circle', { cx: x(p[0]), cy: y(p[1]), r: 4, fill: C.loop, stroke: C.paper, 'stroke-width': 2 }, svg);
    for (const p of scenePts) el('circle', { cx: x(p[0]), cy: y(p[1]), r: 4, fill: C.scene, stroke: C.paper, 'stroke-width': 2 }, svg);
    text(svg, x(6.2), y(7.15), 'Prefill', { fill: C.ink, 'font-size': 13 });
    text(svg, x(16), y(6.23) - 9, 'calls of 4–6 robots measured no better', { 'font-size': 12 });
    text(svg, x(7), y(2.75), 'Denoising (10 steps)', { fill: C.ink, 'font-size': 13 });

    // Hover crosshair + readout.
    const guide = el('line', { y1: T, y2: H - B, stroke: C.ink, 'stroke-width': 1, opacity: 0 }, svg);
    const dotS = el('circle', { r: 5, fill: C.scene, stroke: C.paper, 'stroke-width': 2, opacity: 0 }, svg);
    const dotL = el('circle', { r: 5, fill: C.loop, stroke: C.paper, 'stroke-width': 2, opacity: 0 }, svg);
    const out = fig.querySelector('.fig-readout');
    const defaultText = out.innerHTML;
    const hit = el('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent' }, svg);
    function show(n) {
      const lv = 10 * interp(steps, n) / n, sv = n <= 3 ? interp(scenePts, n) : 6.23;
      guide.setAttribute('x1', x(n)); guide.setAttribute('x2', x(n)); guide.setAttribute('opacity', 0.25);
      dotL.setAttribute('cx', x(n)); dotL.setAttribute('cy', y(lv)); dotL.setAttribute('opacity', 1);
      dotS.setAttribute('cx', x(n)); dotS.setAttribute('cy', y(sv)); dotS.setAttribute('opacity', 1);
      const measured = [1, 8, 16, 24, 32].includes(n) ? 'measured' : 'interpolated';
      out.innerHTML = `<strong>${n} robot${n > 1 ? 's' : ''}</strong>: the ten denoising steps cost <strong>${fmt(lv, 2)} ms</strong> of GPU per robot (${measured}), ` +
        `${fmt(10.7 / lv, 1)}× less than alone. The prefill: <strong>${fmt(sv, 2)} ms</strong> per robot` +
        (n > 3 ? ' (at its best batch of 3).' : '.');
    }
    function showAtPointer(e) {
      const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
      const lx = p.matrixTransform(svg.getScreenCTM().inverse()).x;
      show(Math.max(1, Math.min(32, Math.round(1 + (lx - L) / (W - L - R) * 31))));
    }
    hit.addEventListener('pointermove', showAtPointer);
    hit.addEventListener('pointerdown', showAtPointer);
    hit.addEventListener('pointerleave', e => {
      if (e.pointerType === 'touch') return;
      [guide, dotS, dotL].forEach(n => n.setAttribute('opacity', 0));
      out.innerHTML = defaultText;
    });
  }

  /* ---------------------------------------------- Fig. 3: the node */
  function node() {
    const fig = document.getElementById('fig-node');
    if (!fig) return;
    const canvas = fig.querySelector('canvas');
    const { ctx, state } = canvasFor(canvas);
    const modeSel = fig.querySelector('[name="node-mode"]');
    const slider = fig.querySelector('[name="node-robots"]');
    const robotsOut = fig.querySelector('.node-robots-value');
    const stats = fig.querySelector('.node-stats');
    const live = fig.querySelector('.node-live');
    const pause = fig.querySelector('.node-pause');
    const views = [...fig.querySelectorAll('[data-view]')];
    const speedSlider = fig.querySelector('[name="node-speed"]');
    const speedOut = fig.querySelector('.node-speed-value');
    const SLOWS = [200, 100, 50, 25, 20, 10, 5, 2, 1]; // slider left to right: slower to faster; 1 = real time
    let SLOW = 25;
    const WINDOW = 120; // ms of node time on screen (timeline view)
    const RET = 6; // ms of node time a returned request stays lit on its robot
    const t0 = 2000, t1 = 11000;
    let sim, raf = null, start = null, paused = false, tNow = t0, view = 'flow', util = null;
    // Fine-tunes: 24 of them in a Zipf-like mix. The six most used get their own colour; the other 18 share grey.
    const TENANT_COLORS = ['#d1495b', '#e09f3e', '#00798c', '#8e5ea2', '#3a7d44', '#2e4057'];
    const OTHER_TENANT = '#a7abb0';
    const tenantW = Array.from({ length: 24 }, (_, k) => 1 / (k + 1));
    const tenantCdf = tenantW.map((_, k) => tenantW.slice(0, k + 1).reduce((a, b) => a + b, 0) / tenantW.reduce((a, b) => a + b, 0));
    function tenantOf(robot) {
      const u = ((robot * 2654435761) >>> 0) / 4294967296;
      const k = tenantCdf.findIndex(c => u <= c);
      return k < 0 ? 23 : k;
    }
    const tenantColor = robot => { const k = tenantOf(robot); return k < TENANT_COLORS.length ? TENANT_COLORS[k] : OTHER_TENANT; };
    function computeUtil() {
      const warm = 1500, T = sim.seconds * 1000 - 400, span = T - warm;
      const busy = new Array(8).fill(0);
      for (const c of sim.calls) { if (c.start > warm && c.start < T) busy[c.gpu] += c.end - c.start; }
      let slotsUsed = 0, n = 0, stepBusy = 0;
      for (const s of sim.steps) { if (s.start > warm && s.start < T) { slotsUsed += s.robots.length; n++; stepBusy += s.end - s.start; } }
      return { gpu: busy.map(b => Math.min(1, b / span)), lanes: n ? slotsUsed / n / 32 : 0, stepBusy: Math.min(1, stepBusy / span) };
    }

    function run() {
      const robots = +slider.value;
      robotsOut.textContent = robots;
      sim = NodeSim.simulate({ mode: modeSel.value, robots, seconds: 12, seed: 3 });
      fig.classList.toggle('whole-calls', !!NodeSim.MODES[sim.mode].wholeGpus);
      util = computeUtil();
      const S = window.SIM_STATS, row = S && S.modes[sim.mode] && S.modes[sim.mode][robots - S.min];
      stats.innerHTML = !row ? ''
        : row[2] ? `<span><b>Overloaded</b>: requests arrive faster than the GPUs finish them, so the queue keeps growing.</span>`
        : `<span>p50 <b>${row[0].toFixed(1)} ms</b></span><span>p99 <b>${row[1].toFixed(1)} ms</b></span>` +
          `<span class="stat-note">simulated, within 3 ms of our measured runs</span>`;
      draw(tNow);
    }

    function rowsFor() {
      const m = NodeSim.MODES[sim.mode];
      if (m.wholeGpus) return Array.from({ length: 8 }, (_, g) => ({ kind: 'whole', gpu: g, label: `GPU ${g}` }));
      const rows = [];
      for (let g = 0; g < m.sceneGpus; g++) rows.push({ kind: 'scene', gpu: g, label: `GPU ${g}` });
      for (let g = 0; g < m.loopGpus; g++) rows.push({ kind: 'loop', gpu: g, label: `GPU ${m.sceneGpus + g}` });
      return rows;
    }

    function countStages(t) {
      let waiting = 0, behind = 0, inScene = 0, inLoop = 0;
      for (let i = lowerBound(sim.reqs, t - 2500); i < sim.reqs.length && sim.reqs[i].t <= t; i++) {
        const q = sim.reqs[i];
        if (q.done <= t) continue;
        if (t < q.taken) waiting++;
        else if (t < q.sceneStart) behind++;
        else if (t < q.sceneEnd) inScene++;
        else if (q.admit !== undefined && t >= q.admit && t < q.loopEnd) inLoop++;
      }
      return { waiting, behind, inScene, inLoop };
    }
    function showLive(c) {
      const whole = !!NodeSim.MODES[sim.mode].wholeGpus;
      live.innerHTML = `<span>simulation, right now: <b>${c.waiting}</b> waiting for a GPU</span>` +
        (whole ? '' : `<span><b>${c.behind}</b> behind a running call</span>`) +
        `<span><b>${c.inScene}</b> in ${whole ? 'calls' : 'prefill calls'}</span>` +
        (whole ? '' : `<span><b>${c.inLoop}</b> in denoising steps</span>`);
    }

    // Estimated share of the H100's peak compute (dense BF16, ~990 TFLOPS), from operation counts and measured times.
    // Prefill: ~4 TFLOP per robot. Denoising step: ~18 GFLOP per robot (300M parameters x 30 rows x 2).
    // Attention and small operations are left out, so these are estimates, not profiled utilisation.
    const PEAK = 990; // TFLOPS
    const callUtil = c => {
      if (c.whole) return null;
      return Math.min(1, (c.robots.length * 4) / (c.end - c.start) / PEAK * 1000);
    };
    const WHOLE_PREFILL = 4 / 8.3 / PEAK * 1000;      // ~0.49
    const WHOLE_DENOISE = (10 * 0.018) / 6.5 / PEAK * 1000; // ~0.028
    const stepUtil = s => Math.min(1, (s.robots.length * 0.018) / (s.end - s.start) / PEAK * 1000);
    function utilAt(c, x) { // utilisation of a whole call at node time x
      return x < c.start + 8.3 ? WHOLE_PREFILL : WHOLE_DENOISE;
    }

    function drawTimeline(t) {
      const { w, h } = state;
      ctx.clearRect(0, 0, w, h);
      const rows = rowsFor();
      const foot = w > 640 ? 26 : 40, left = 96, right = 8, top = 8, rowH = (h - top - foot) / rows.length;
      const lora = sim.mode === 'lora';
      const xs = v => left + (v - (t - WINDOW)) / WINDOW * (w - left - right);
      const lo = t - WINDOW;
      ctx.font = SANS(12);
      ctx.textBaseline = 'middle';
      rows.forEach((row, i) => {
        const y = top + i * rowH;
        const three = rowH > 44, mid = y + rowH / 2;
        ctx.font = MONO(11); ctx.fillStyle = C.muted;
        ctx.fillText(row.label, 0, three ? mid - 13 : mid - 6);
        if (three) {
          const role = row.kind === 'loop' ? ['denoising', C.loop] : row.kind === 'scene' ? ['prefill', C.scene] : ['whole calls', C.muted];
          ctx.font = MONO(10); ctx.fillStyle = role[1]; ctx.fillText(fit(ctx, left - 8, role[0], ''), 0, mid);
        }
        ctx.font = SANS(12);
        // Live estimate over the last 100 ms of node time: average share of peak compute, idle time counting as zero.
        const UW = 100, a0 = t - UW; let acc = 0;
        if (row.kind === 'loop') {
          for (const s of sim.steps) { if (s.gpu !== row.gpu || s.end < a0 || s.start > t) continue; acc += (Math.min(s.end, t) - Math.max(s.start, a0)) * stepUtil(s); }
        } else {
          for (const c of sim.calls) {
            if (c.gpu !== row.gpu || c.end < a0 || c.start > t) continue;
            const s0 = Math.max(c.start, a0), s1 = Math.min(c.end, t);
            if (c.whole) {
              const sp = c.start + 8.3;
              acc += Math.max(0, Math.min(s1, sp) - s0) * WHOLE_PREFILL + Math.max(0, s1 - Math.max(s0, sp)) * WHOLE_DENOISE;
            } else acc += (s1 - s0) * callUtil(c);
          }
        }
        const pct = Math.round(100 * Math.min(1, acc / UW));
        ctx.fillStyle = C.ink;
        ctx.fillText(`≈ ${pct}%`, 0, three ? mid + 13 : mid + 7);   // estimated share of peak compute, not busy time
        rrect(left, y + 2, w - left - right, rowH - 4, 6); ctx.fillStyle = P.fill; ctx.fill(); ctx.strokeStyle = P.edge; ctx.lineWidth = 1; ctx.stroke();
        // Dashed line at 100% of peak compute.
        ctx.strokeStyle = C.faint; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(left, y + 3.5); ctx.lineTo(w - right, y + 3.5); ctx.stroke(); ctx.setLineDash([]);
      });
      // Prefill calls (or whole calls): block height = estimated share of peak compute.
      for (const c of sim.calls) {
        if (c.end < lo || c.start > t) continue;
        const i = rows.findIndex(r => (r.kind === 'scene' || r.kind === 'whole') && r.gpu === c.gpu);
        const y = top + i * rowH + 3, hh = rowH - 6;
        const x0 = Math.max(left, xs(c.start)), x1 = Math.min(xs(Math.min(c.end, t)), w - right);
        if (x1 <= x0) continue;
        if (c.whole) {
          const split = Math.max(x0, Math.min(xs(Math.min(c.start + 8.3, t)), x1));
          const ph = hh * WHOLE_PREFILL, gh = Math.max(3, hh * WHOLE_DENOISE);
          ctx.fillStyle = C.scene; ctx.fillRect(x0, y + hh - ph, Math.max(0, split - x0 - 1), ph);
          ctx.fillStyle = C.loop; if (x1 > split) ctx.fillRect(split, y + hh - gh, x1 - split - 1, gh);
        } else {
          const n = c.robots.length, uh = hh * callUtil(c), seg = uh / n;
          for (let k = 0; k < n; k++) {
            const yy = y + hh - uh + k * seg;
            ctx.fillStyle = lora ? [C.scene, '#5079d4'][k % 2] : [C.scene, '#5079d4', '#7491db'][k % 3];
            ctx.fillRect(x0, yy, x1 - x0 - 1.5, seg - (k < n - 1 ? 1 : 0));
            if (lora && x1 - x0 > 6) { ctx.fillStyle = tenantColor(c.robots[k]); ctx.fillRect(x0, yy, 4, seg - (k < n - 1 ? 1 : 0)); }
          }
        }
      }
      // Denoising steps: bar height = estimated share of peak compute; robots stacked within it.
      for (const s of sim.steps) {
        if (s.end < lo || s.start > t) continue;
        const i = rows.findIndex(r => r.kind === 'loop' && r.gpu === s.gpu);
        const y = top + i * rowH + 3, hh = rowH - 6;
        const x0 = Math.max(left, xs(s.start)), x1 = Math.min(xs(Math.min(s.end, t)), w - right);
        if (x1 <= x0) continue;
        const bw = Math.max(1, x1 - x0 - 1), uh = Math.max(2, hh * stepUtil(s));
        if (lora) {
          const cols = s.robots.map(tenantColor).sort(), per = uh / cols.length;
          cols.forEach((col, k) => { ctx.fillStyle = col; ctx.fillRect(x0, y + hh - (k + 1) * per, bw, per); });
        } else {
          ctx.fillStyle = C.loop;
          ctx.fillRect(x0, y + hh - uh, bw, uh);
        }
      }
      // Time axis.
      ctx.fillStyle = C.muted;
      ctx.textBaseline = 'alphabetic';
      for (let k = Math.ceil(lo / 20) * 20; k <= t; k += 20) {
        const xx = xs(k);
        ctx.fillRect(xx, h - foot + 4, 1, 4);
      }
      ctx.font = SANS(12);
      if (w > 640) ctx.fillText(`${WINDOW} ms of node time · height ≈ share of peak compute; dashed line = 100%`, left, h - 4);
      else {
        ctx.fillText(`${WINDOW} ms of node time`, left, h - 18);
        ctx.fillText(fit(ctx, w, '≈ % and height: share of peak compute (est.)', '≈ %: share of peak compute'), 0, h - 3);
      }
      showLive(countStages(t));
    }

    const INB = 8; // ms of node time a request takes to travel from its robot into the queue (drawing only)
    const OUTB = 2.5; // ms of node time a request is shown travelling from the queue to its GPU (drawing only)
    const WAIT_COL = wt => wt < 10 ? C.queue : wt < 20 ? '#e09f3e' : '#b3261e';

    // Where every request is at time t: one pass over the requests, shared by both flow layouts.
    function flowState(t) {
      const m = NodeSim.MODES[sim.mode], whole = !!m.wholeGpus;
      const st = { waitDots: [], behindDots: [], inbound: [], dispatch: [], scene: [], handoff: [], loop: [],
        robotStage: new Array(sim.robots).fill(null), robotFade: new Array(sim.robots).fill(0), inScene: 0, inLoop: 0 };
      for (let i = lowerBound(sim.reqs, t - 2500); i < sim.reqs.length && sim.reqs[i].t <= t + INB; i++) {
        const q = sim.reqs[i];
        if (q.t > t) { st.inbound.push(q); if (!st.robotStage[q.robot]) st.robotStage[q.robot] = 'send'; continue; }
        if (q.done + RET < t) continue;
        if (t < q.taken) { st.waitDots.push(q); st.robotStage[q.robot] = 'queue'; continue; }
        if (t < q.taken + OUTB) st.dispatch.push({ q, p: (t - q.taken) / OUTB });
        // Taken by a GPU's worker but queued on its stream behind the running call.
        if (t < q.sceneStart) { (st.behindDots[q.gpu] ||= []).push(q); st.robotStage[q.robot] = 'queue'; continue; }
        if (t < q.sceneEnd) {
          st.inScene++; st.robotStage[q.robot] = 'scene';
          const p = (t - q.sceneStart) / (q.sceneEnd - q.sceneStart);
          if (whole && p > 8.3 / m.wholeMs) st.robotStage[q.robot] = 'loop';
          st.scene.push({ q, p });
          continue;
        }
        if (whole) {
          if (t < q.done) { st.robotStage[q.robot] = 'loop'; continue; }
          st.robotStage[q.robot] = 'done'; st.robotFade[q.robot] = 1 - (t - q.done) / RET; continue;
        }
        if (t < q.admit) {
          st.robotStage[q.robot] = 'handoff';
          st.handoff.push({ q, p: Math.min(1, (t - q.sceneEnd) / Math.max(0.4, q.admit - q.sceneEnd)) });
          continue;
        }
        if (t < q.loopEnd) {
          // The lane comes from the simulator, so it is the same whenever and however often this moment is drawn.
          st.inLoop++; st.robotStage[q.robot] = 'loop';
          st.loop.push({ q, steps: Math.min(10, Math.floor(10 * (t - q.admit) / Math.max(0.1, q.loopEnd - q.admit))) });
          continue;
        }
        if (t < q.done) { st.robotStage[q.robot] = 'loop'; continue; } // actions on their way back to the robot
        st.robotStage[q.robot] = 'done'; st.robotFade[q.robot] = 1 - (t - q.done) / RET;
      }
      return st;
    }

    // Shared pieces of the two flow layouts.
    const STAGE_KEY = [['idle', C.faint, 0.5], ['queued', C.queue, 0.8], ['prefill', C.scene, 1], ['denoising', C.loop, 1]];
    const ringKeyItems = () => [...TENANT_COLORS.map((col, k) => [`F${k + 1}`, col]), ['18 others', OTHER_TENANT]];
    function keyRows(items, maxW, x0) {
      let x = x0 || 0, rows = 1;
      for (const [lab] of items) { const iw = ctx.measureText(lab).width + 20; if (x > (x0 || 0) && x + iw > maxW) { rows++; x = 0; } x += iw; }
      return rows;
    }
    // Robot field with dots of one size and spacing for every robot count (and layout): the spacing is the largest that
    // fits the slider's maximum in a reference box (refW x refH), and the block, as tall as the count needs, is centred
    // on cy and within boxW. So more robots make a visibly bigger block.
    function robotField(x0, boxW, cy, refW, refH) {
      const N = +slider.max;
      let cols = 1, gap = 0;
      for (let c = 2; c <= 64; c++) {
        const g = Math.min(refW / c, refH / Math.ceil(N / c));
        if (g > gap) { gap = g; cols = c; }
      }
      const rows = Math.ceil(sim.robots / cols), used = Math.min(cols, sim.robots);
      const left = x0 + (boxW - used * gap) / 2, top0 = cy - rows * gap / 2;
      return { gap, gx: i => left + (i % cols) * gap + gap / 2, gy: i => top0 + Math.floor(i / cols) * gap + gap / 2 };
    }
    function drawRobots(st, grid) {
      const lora = sim.mode === 'lora', { gap, gx, gy } = grid;
      for (let i = 0; i < sim.robots; i++) {
        const s = st.robotStage[i];
        let r = Math.max(1.2, gap * 0.16), fill = C.faint;
        // Only the key's colours: sending counts as queued, the hop to the denoising GPU as prefill.
        if (s === 'send') { r = gap * 0.22; fill = C.queue; }
        else if (s === 'queue') { r = gap * 0.3; fill = C.queue; }
        else if (s === 'scene') { r = gap * 0.36; fill = C.scene; }
        else if (s === 'handoff') { r = gap * 0.3; fill = C.scene; }
        else if (s === 'loop') { r = gap * 0.36; fill = C.loop; }
        else if (s === 'done') { r = gap * (0.2 + 0.2 * st.robotFade[i]); fill = C.loop; }
        ctx.fillStyle = fill;
        ctx.beginPath(); ctx.arc(gx(i), gy(i), r, 0, Math.PI * 2); ctx.fill();
        if (lora && s && s !== 'done') {
          ctx.strokeStyle = tenantColor(i); ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(gx(i), gy(i), r + 1.6, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }
    // Dot key (and the fine-tune ring key): title on its own line, items wrapping within maxW.
    function drawKeys(x0, ky, maxW) {
      ctx.font = SANS(10);
      const drawKey = (title, items, ring) => {
        ctx.fillStyle = C.muted; ctx.fillText(title, x0, ky);
        let x = 0; ky += 14;
        for (const [lab, col, sz] of items) {
          const iw = ctx.measureText(lab).width + 20;
          if (x > 0 && x + iw > maxW) { x = 0; ky += 14; }
          if (ring) { ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x0 + x + 4, ky - 3.5, 3.4, 0, Math.PI * 2); ctx.stroke(); }
          else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x0 + x + 4, ky - 3.5, 3.6 * (sz || 1), 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = C.muted; ctx.fillText(lab, x0 + x + 11, ky);
          x += iw;
        }
        ky += 18;
      };
      drawKey(fit(ctx, maxW, 'Dot: where its request is', 'Dot: request stage', 'Dot'), STAGE_KEY, false);
      if (sim.mode === 'lora') drawKey(fit(ctx, maxW, 'Ring: its fine-tune', 'Ring: fine-tune', 'Ring'), ringKeyItems(), true);
    }
    function keysHeight(maxW, ring = sim.mode === 'lora') {
      ctx.font = SANS(10);
      return 16 + keyRows(STAGE_KEY, maxW) * 14 + (ring ? 18 + keyRows(ringKeyItems(), maxW) * 14 : 0);
    }
    // The launch video's look: pale-blue GPU panels with monospace labels, curved fan-out and fan-in lines, call bars
    // on pale tracks, and denoising lanes that fill ten segments (green here, the post's colour for the denoising
    // steps). Everything drawn comes from the simulator's state at time t.
    const P = { fill: '#eef2fa', edge: '#c9d3e8', track: '#dbe3f2', curve: '#c5d1ea' };
    const MONO = px => `${px}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    const SANS = px => `${px}px Mluvka, ui-sans-serif, system-ui, sans-serif`;
    function rrect(x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    // A GPU panel: its number in grey and, when there is room, its role in the role's colour.
    function panel(x, y, w, h, gpu, role, roleCol, size, twoLine) {
      rrect(x, y, w, h, 7); ctx.fillStyle = P.fill; ctx.fill(); ctx.strokeStyle = P.edge; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = MONO(size || 11); ctx.textBaseline = 'alphabetic';
      const lab = `GPU ${gpu}`, by = y + (size || 11) + 4;
      ctx.fillStyle = C.muted; ctx.fillText(lab, x + (twoLine ? 4 : 7), by);
      if (role && twoLine) { ctx.fillStyle = roleCol; ctx.fillText(fit(ctx, w - 6, role, role.slice(0, 3)), x + 4, by + (size || 11) + 3); }
      else if (role) {
        const lw = ctx.measureText(lab).width, room = w - 14 - lw - 6, txt = fit(ctx, room, `· ${role}`, '');
        if (txt) { ctx.fillStyle = roleCol; ctx.fillText(txt, x + 7 + lw + 6, by); }
      }
    }
    // Cubic curves: horizontal (landscape) and vertical (portrait), with points along them for travelling requests.
    const hCurve = (a, b) => [a, { x: (a.x + b.x) / 2, y: a.y }, { x: (a.x + b.x) / 2, y: b.y }, b];
    const vCurve = (a, b) => [a, { x: a.x, y: (a.y + b.y) / 2 }, { x: b.x, y: (a.y + b.y) / 2 }, b];
    function strokeCurve(c) { ctx.beginPath(); ctx.moveTo(c[0].x, c[0].y); ctx.bezierCurveTo(c[1].x, c[1].y, c[2].x, c[2].y, c[3].x, c[3].y); ctx.stroke(); }
    function onCurve(c, p) {
      const q = 1 - p, a = q * q * q, b = 3 * q * q * p, d = 3 * q * p * p, e = p * p * p;
      return { x: a * c[0].x + b * c[1].x + d * c[2].x + e * c[3].x, y: a * c[0].y + b * c[1].y + d * c[2].y + e * c[3].y };
    }
    const dot = (x, y, r, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

    // Requests travelling from their robot into the queue's tail, then the queue: oldest next to the fan-out point.
    function drawQueue(st, t, grid, laneX, laneW, fanX, fanY, maxRows, countAbove) {
      for (const q of st.inbound) {
        const p = 1 - (q.t - t) / INB, sx = grid.gx(q.robot), sy = grid.gy(q.robot), ex = laneX + 2, ey = fanY;
        ctx.globalAlpha = 0.35 + 0.65 * p; dot(sx + (ex - sx) * p, sy + (ey - sy) * p, 2.2, C.queue); ctx.globalAlpha = 1;
      }
      const ps = 6.5, perRow = Math.max(3, Math.floor((laneW - 6) / ps));
      rrect(laneX, fanY - 1.5, fanX - laneX, 3, 1.5); ctx.fillStyle = P.track; ctx.fill();
      dot(fanX, fanY, 3, P.edge);
      st.waitDots.forEach((q, k) => {
        const row = Math.floor(k / perRow);
        if (row >= maxRows) return;
        const off = row === 0 ? 0 : (row % 2 ? -1 : 1) * Math.ceil(row / 2) * ps;
        dot(fanX - 6 - (k % perRow) * ps, fanY + off, 2.6, WAIT_COL(t - q.t));
      });
      ctx.font = SANS(11);
      if (countAbove && st.waitDots.length) {
        ctx.fillStyle = WAIT_COL(t - st.waitDots[0].t);
        ctx.fillText(fit(ctx, laneW, `${st.waitDots.length} waiting`, `${st.waitDots.length}`), laneX, fanY - Math.min(maxRows, Math.ceil(st.waitDots.length / perRow)) * ps / 2 - 10);
      }
    }
    // Denoising GPUs: a panel each, 32 lanes (4 rows of 8). A lane with a robot in it shows its ten steps as segments.
    function loopCells(LX, LY, loopW, loopH, compact) {
      const cols = 8, rows = 4, gap = loopW > 260 ? 6 : 4, pad = 8, head = compact ? 22 : 36, foot = 20;
      const cw = (loopW - 2 * pad - (cols - 1) * gap) / cols, ch = (loopH - head - foot - (rows - 1) * gap) / rows;
      return { cw, ch, cell: (g, k) => [LX(g) + pad + (k % cols) * (cw + gap), LY(g) + head + Math.floor(k / cols) * (ch + gap)] };
    }
    function drawLoopPanels(nBox, nLoop, LX, LY, loopW, loopH, cells, compact) {
      for (let g = 0; g < nLoop; g++) {
        panel(LX(g), LY(g), loopW, loopH, nBox + g, 'denoising', C.loop);
        if (!compact) {
          ctx.font = SANS(10); ctx.fillStyle = C.muted;
          ctx.fillText(fit(ctx, loopW - 16, 'a lane per robot; one segment per step, ten steps', 'one segment per step, ten steps', 'ten steps per lane'), LX(g) + 7, LY(g) + 29);
        }
        for (let k = 0; k < 32; k++) { const [x, y] = cells.cell(g, k); rrect(x, y, cells.cw, cells.ch, Math.min(5, cells.cw / 3)); ctx.fillStyle = P.track; ctx.fill(); }
      }
    }
    function drawLoopRobots(st, cells, down) {
      const lora = sim.mode === 'lora', { cw, ch } = cells;
      for (const { q, steps } of st.loop) {
        const [x, y] = cells.cell(q.loopGpu, q.slot), col = lora ? tenantColor(q.robot) : C.loop;
        // Ten segments, one per denoising step done: stacked from the bottom, or from the top in the portrait layout
        // so they follow the page's downward flow.
        const segH = (ch - 8) / 10, bw = Math.max(3, Math.min(cw * 0.56, 14)), bx = x + (cw - bw) / 2;
        const sh = Math.max(1, segH - 1.2), sr = Math.min(1.2, sh * 0.2);   // a subtle rounding
        for (let s = 0; s < steps; s++) { rrect(bx, down ? y + 4 + s * segH : y + ch - 4 - (s + 1) * segH, bw, sh, sr); ctx.fillStyle = col; ctx.fill(); }
      }
    }
    function drawLoopCounts(st, nLoop, LX, LY, loopW, loopH) {
      ctx.font = SANS(11); ctx.fillStyle = C.ink;
      for (let g = 0; g < nLoop; g++) {
        const n = st.loop.filter(e => e.q.loopGpu === g).length;
        ctx.fillText(fit(ctx, loopW - 14, `${n} of 32 lanes in use`, `${n}/32 in use`), LX(g) + 7, LY(g) + loopH - 6);
      }
    }
    // Footer row, below every box: the queue's wait-time key.
    function drawFooter(w, h) {
      const fy = h - 8;
      ctx.font = SANS(11);
      ctx.fillStyle = C.muted;
      const title = fit(ctx, w * 0.3, 'Queue, by time waited:', 'Queue wait:');
      ctx.fillText(title, 0, fy);
      let kx = ctx.measureText(title).width + 10;
      const keyItems = [['queued <10 ms', C.queue], ['10–20 ms', '#e09f3e'], ['>20 ms', '#b3261e']];
      const keyW = keyItems.reduce((s, [lab]) => s + ctx.measureText(lab).width + 18, 0);
      if (kx + keyW > w) kx = Math.max(0, w - keyW);
      for (const [lab, col] of keyItems) {
        dot(kx + 4, fy - 4, 3, col);
        ctx.fillStyle = C.muted; ctx.fillText(lab, kx + 11, fy); kx += ctx.measureText(lab).width + 18;
      }
    }
    // The robot count over the field, as in the launch video.
    function drawCount(x, y, maxW) {
      ctx.textBaseline = 'alphabetic';
      const n = String(sim.robots);
      ctx.font = SANS(17); ctx.fillStyle = C.ink; ctx.fillText(n, x, y);
      const nw = ctx.measureText(n).width;
      ctx.font = SANS(12); ctx.fillStyle = C.muted; ctx.fillText(fit(ctx, maxW - nw - 6, 'robots', ''), x + nw + 6, y);
    }

    // Landscape: robots on the left, then the queue, the prefill GPUs stacked, and the denoising GPU on the right.
    function drawFlowWide(t) {
      const { w, h } = state;
      ctx.clearRect(0, 0, w, h);
      const m = NodeSim.MODES[sim.mode];
      const whole = !!m.wholeGpus, lora = sim.mode === 'lora';
      const top = 28, bottom = 26, inner = h - top - bottom;
      // Column layout. In the body column (648 px canvas) the proportions are as they have always been. On wide screens
      // (the figure runs to the site's right edge) the robots get more room and the fan-out / fan-in lines get real
      // horizontal runs, so they curve at a gentle angle. Whole calls have no separate denoising GPU.
      const wide = w > 700;
      let gridW, laneX, laneW, gpuX, gpuW, loopX, loopW;
      if (whole) {
        gridW = w * 0.30; laneX = w * 0.33; laneW = Math.min(w, 648) * 0.14; gpuX = w * 0.55; gpuW = w - gpuX - 2;
      } else if (wide) {
        // Three columns with equal gaps (robots | prefill | denoising); the queue is a short lane inside the first gap.
        gridW = w * 0.25; laneX = w * 0.265; laneW = w * 0.055; // fan-out point at 0.32 w
        gpuX = w * 0.385; gpuW = w * 0.23;                     // gap robots -> prefill 0.135 w; prefill ends 0.615 w
        loopX = w * 0.745; loopW = w - loopX - 2;              // gap prefill -> denoising 0.13 w
      } else {
        gridW = w * 0.21; laneX = w * 0.225; laneW = w * 0.05;  // fan-out point at 0.275 w
        gpuX = w * 0.355; gpuW = w * 0.225; loopX = w * 0.695; loopW = w - loopX - 2;  // gaps 0.145 w and 0.115 w
      }
      const fanX = laneX + laneW, fanY = top + inner / 2;
      const st0 = flowState(t);
      drawCount(0, 18, gridW);
      // The queue's label carries its length, coloured by the oldest request's wait.
      ctx.font = SANS(12); ctx.fillStyle = C.muted;
      // Column header over the GPU panels (they carry only their number), right-aligned so the queue's label has room.
      const colLab = whole ? ['GPUs 0–7 ·', 'whole calls, one robot at a time'] : [`GPUs 0–${m.sceneGpus - 1} ·`, 'prefill'];
      ctx.font = SANS(12);
      const colW = ctx.measureText(colLab[0] + ' ' + colLab[1]).width, colX = Math.max(gpuX, gpuX + gpuW - colW);
      ctx.fillStyle = C.muted; ctx.fillText(colLab[0], colX, 18);
      ctx.fillStyle = whole ? C.muted : C.scene; ctx.fillText(colLab[1], colX + ctx.measureText(colLab[0] + ' ').width, 18);
      const qroom = colX - laneX - 12, nWait = st0.waitDots.length;
      ctx.fillStyle = C.muted;
      ctx.fillText('queue', laneX, 18);
      if (nWait) {
        const qw = ctx.measureText('queue').width;
        ctx.fillStyle = WAIT_COL(t - st0.waitDots[0].t);
        ctx.fillText(fit(ctx, qroom - qw - 6, `· ${nWait} waiting`, `· ${nWait}`, ''), laneX + qw + 6, 18);
      }

      // Robot grid: a tall rectangle filling the left strip, vertically centred, with the keys under it. On wide
      // screens the keys may also run under the queue (empty there), up to the fan-out point, so each fits one line.
      const keyW = wide && !whole ? laneX + laneW - 10 : gridW;
      const gridInner = inner - keysHeight(keyW);
      const refW = wide ? w * 0.25 : w * 0.21, refKeyW = wide ? w * 0.32 - 10 : refW;
      const refHalf = top + inner - keysHeight(refKeyW, true) - 8 - fanY;
      const grid = robotField(0, gridW, fanY, refW, 2 * refHalf);

      // GPU panels, the prefill (or whole-call) GPUs stacked, the denoising GPU(s) on the right.
      const nBox = whole ? m.wholeGpus : m.sceneGpus, gB = 6;
      const boxH = (inner - (nBox - 1) * gB) / nBox, boxY = g => top + g * (boxH + gB);
      const nLoop = whole ? 0 : m.loopGpus, gL = 10;
      const loopH = nLoop ? (inner - (nLoop - 1) * gL) / nLoop : 0, loopY = g => top + g * (loopH + gL);
      const outC = g => hCurve({ x: fanX, y: fanY }, { x: gpuX, y: boxY(g) + boxH / 2 });
      const inC = (g, lg) => hCurve({ x: gpuX + gpuW, y: boxY(g) + boxH / 2 }, { x: loopX, y: loopY(lg) + loopH / 2 });
      ctx.strokeStyle = P.curve; ctx.lineWidth = 1.3;
      for (let g = 0; g < nBox; g++) { strokeCurve(outC(g)); for (let lg = 0; lg < nLoop; lg++) strokeCurve(inC(g, lg)); }
      if (nLoop) { ctx.font = SANS(12); ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText('KV cache', loopX - 6, 18); ctx.textAlign = 'left'; }
      for (let g = 0; g < nBox; g++) {
        rrect(gpuX, boxY(g), gpuW, boxH, 7); ctx.fillStyle = P.fill; ctx.fill(); ctx.strokeStyle = P.edge; ctx.lineWidth = 1; ctx.stroke();
        ctx.font = MONO(11); ctx.fillStyle = C.muted; ctx.fillText(String(g), gpuX + 7, boxY(g) + 15);
      }
      const LX = () => loopX, cells = nLoop ? loopCells(LX, loopY, loopW, loopH) : null;
      if (nLoop) drawLoopPanels(nBox, nLoop, LX, loopY, loopW, loopH, cells);

      // Call bars: a pale track per lane, filling as the call runs.
      const st = st0;
      const lanes = whole ? 1 : m.cap, areaY = 6, areaH = boxH - 12;
      const pitch = areaH / lanes, barH = Math.max(3, Math.min(12, pitch - 3));   // tall bars: the prefill is the heavy work
      const barX = gpuX + 22, barW = gpuW - 30;
      const barY = (g, lane) => boxY(g) + areaY + lane * pitch + (pitch - barH) / 2;
      for (let g = 0; g < nBox; g++) for (let k = 0; k < lanes; k++) { rrect(barX, barY(g, k), barW, barH, barH / 2); ctx.fillStyle = P.track; ctx.fill(); }
      for (const { q, p } of st.scene) {
        const y = barY(q.gpu, q.lane || 0);
        if (whole) {
          const split = 8.3 / m.wholeMs;
          ctx.save(); rrect(barX, y, barW, barH, barH / 2); ctx.clip();
          ctx.fillStyle = C.scene; ctx.fillRect(barX, y, barW * Math.min(p, split), barH);
          if (p > split) { ctx.fillStyle = C.loop; ctx.fillRect(barX + barW * split, y, barW * (p - split), barH); }
          ctx.restore();
        } else {
          // With fine-tunes, the bar takes its fine-tune's colour.
          rrect(barX, y, Math.max(barH, barW * p), barH, barH / 2); ctx.fillStyle = lora ? tenantColor(q.robot) : C.scene; ctx.fill();
        }
      }
      // Requests on their way: from the queue along the fan-out to their GPU, and (KV cache) along the fan-in.
      for (const { q, p } of st.dispatch) { const pt = onCurve(outC(q.gpu), p); dot(pt.x, pt.y, 2.6, C.queue); }
      for (const { q, p } of st.handoff) { const pt = onCurve(inC(q.gpu, q.loopGpu), p); dot(pt.x, pt.y, 3, C.scene); }
      if (nLoop) { drawLoopRobots(st, cells); drawLoopCounts(st, nLoop, LX, loopY, loopW, loopH); }

      drawQueue(st, t, grid, laneX, laneW, fanX, fanY, Math.max(1, Math.floor(inner / 6.5) - 2), false);
      drawRobots(st, grid);
      drawKeys(0, top + gridInner + 14, keyW);
      drawFooter(w, h);
      // Requests a GPU has taken but that wait behind its running call: a short column at the panel's left edge.
      let behind = 0;
      st.behindDots.forEach((list, g) => {
        if (!list) return;
        list.forEach((q, j) => { behind++; dot(gpuX + 10, boxY(g) + 24 + j * 6.5, 2.4, WAIT_COL(t - q.t)); });
      });
      showLive({ waiting: st.waitDots.length, behind, inScene: st.inScene, inLoop: st.inLoop });
    }

    // Portrait (phones): robots on top, the queue, a row of prefill GPUs, and the denoising GPU below.
    function drawFlowTall(t) {
      const { w, h } = state;
      ctx.clearRect(0, 0, w, h);
      const m = NodeSim.MODES[sim.mode];
      const whole = !!m.wholeGpus, lora = sim.mode === 'lora';
      ctx.textBaseline = 'alphabetic';

      // Robots: a wide strip across the top; the keys go to the bottom, so the robots lead straight into the queue.
      drawCount(0, 17, w);
      const gridTop = 26, gridH = Math.min(120, Math.max(70, h * 0.15));
      const grid = robotField(0, w, gridTop + gridH / 2, w, gridH);
      const keysH = keysHeight(w), keysTop = h - 26 - keysH;

      // Queue: a lane ending at the fan-out point in the middle; requests drop into its tail on the left.
      const fanY = gridTop + gridH + 30, fanX = w / 2;
      const laneX = Math.min(64, w * 0.18), laneW = fanX - laneX;
      // Prefill GPUs (or every GPU for whole calls): a row of panels, with the row's role above it.
      const nBox = whole ? m.wholeGpus : m.sceneGpus;
      const boxTop = fanY + 56, boxH = whole ? keysTop - 40 - boxTop : Math.max(100, h * 0.15);
      const bgap = 4, bw = (w - (nBox - 1) * bgap) / nBox, bx = g => g * (bw + bgap);
      const nLoop = whole ? 0 : m.loopGpus;
      const loopTop = boxTop + boxH + 48, loopH = keysTop - 12 - loopTop;
      const loopW = nLoop ? (w - (nLoop - 1) * 6) / nLoop : 0;
      const LX = g => g * (loopW + 6), LY = () => loopTop;
      const outC = g => vCurve({ x: fanX, y: fanY }, { x: bx(g) + bw / 2, y: boxTop });
      const inC = (g, lg) => vCurve({ x: bx(g) + bw / 2, y: boxTop + boxH }, { x: LX(lg) + loopW / 2, y: loopTop });
      ctx.strokeStyle = P.curve; ctx.lineWidth = 1.3;
      for (let g = 0; g < nBox; g++) { strokeCurve(outC(g)); for (let lg = 0; lg < nLoop; lg++) strokeCurve(inC(g, lg)); }
      for (let g = 0; g < nBox; g++) panel(bx(g), boxTop, bw, boxH, g, whole ? null : 'prefill', C.scene, 8.5, true);
      ctx.font = SANS(12); ctx.fillStyle = C.muted;
      ctx.fillText('queue', 0, fanY + 4);
      if (whole) ctx.fillText(fit(ctx, w, 'GPUs 0–7: whole calls, one robot at a time', 'GPUs 0–7: whole calls'), 0, boxTop + boxH + 18);
      const cells = nLoop ? loopCells(LX, LY, loopW, loopH, true) : null;
      if (nLoop) drawLoopPanels(nBox, nLoop, LX, LY, loopW, loopH, cells, true);

      const st = flowState(t);
      // Call bars side by side in each panel, each filling downwards as its call runs (with the page's flow).
      const lanes = whole ? 1 : m.cap;
      const areaTop = boxTop + (whole ? 22 : 31), areaH = boxH - (whole ? 28 : 37);
      const lw = Math.min(8, (bw - 10 - (lanes - 1) * 3) / lanes), lgap = 3;   // one width in every layout
      const lx = (g, lane) => bx(g) + (bw - (lanes * lw + (lanes - 1) * lgap)) / 2 + lane * (lw + lgap);
      for (let g = 0; g < nBox; g++) for (let k = 0; k < lanes; k++) { rrect(lx(g, k), areaTop, lw, areaH, lw / 2); ctx.fillStyle = P.track; ctx.fill(); }
      for (const { q, p } of st.scene) {
        const x0 = lx(q.gpu, q.lane || 0);
        if (whole) {
          const split = 8.3 / m.wholeMs;
          ctx.save(); rrect(x0, areaTop, lw, areaH, lw / 2); ctx.clip();
          ctx.fillStyle = C.scene; ctx.fillRect(x0, areaTop, lw, areaH * Math.min(p, split));
          if (p > split) { ctx.fillStyle = C.loop; ctx.fillRect(x0, areaTop + areaH * split, lw, areaH * (p - split)); }
          ctx.restore();
        } else {
          rrect(x0, areaTop, lw, Math.max(lw, areaH * p), lw / 2); ctx.fillStyle = lora ? tenantColor(q.robot) : C.scene; ctx.fill();
        }
      }
      for (const { q, p } of st.dispatch) { const pt = onCurve(outC(q.gpu), p); dot(pt.x, pt.y, 2.6, C.queue); }
      for (const { q, p } of st.handoff) { const pt = onCurve(inC(q.gpu, q.loopGpu), p); dot(pt.x, pt.y, 3, C.scene); }
      if (nLoop) { drawLoopRobots(st, cells, true); drawLoopCounts(st, nLoop, LX, LY, loopW, loopH); }

      drawQueue(st, t, grid, laneX, laneW, fanX, fanY, 5, false);
      if (st.waitDots.length) {
        ctx.font = SANS(11); ctx.fillStyle = WAIT_COL(t - st.waitDots[0].t);
        ctx.fillText(fit(ctx, Math.min(110, fanX - 30), `${st.waitDots.length} waiting`, `${st.waitDots.length}`), 0, fanY + 18);
      }
      drawRobots(st, grid);
      drawKeys(0, keysTop + 10, w);
      drawFooter(w, h);
      // Requests a GPU has taken but that wait behind its running call: a short row just under the panel's label.
      let behind = 0;
      st.behindDots.forEach((list, g) => {
        if (!list) return;
        list.forEach((q, j) => { behind++; dot(bx(g) + 6 + j * 6, boxTop + boxH - 5, 2.2, WAIT_COL(t - q.t)); });
      });
      showLive({ waiting: st.waitDots.length, behind, inScene: st.inScene, inLoop: st.inLoop });
    }

    // Portrait when the canvas is taller than it is wide (phones; see post.css).
    function drawFlow(t) { (state.h > state.w * 1.15 ? drawFlowTall : drawFlowWide)(t); }

    function draw(t) { (view === 'flow' ? drawFlow : drawTimeline)(t); }

    function frame(now) {
      if (start === null) start = now - (tNow - t0) * SLOW;
      tNow = t0 + ((now - start) / SLOW) % (t1 - t0);
      draw(tNow);
      raf = requestAnimationFrame(frame);
    }
    function play() { if (!raf && !paused && !reduceMotion) { start = null; raf = requestAnimationFrame(frame); } }
    function stop() { cancelAnimationFrame(raf); raf = null; }
    pause.addEventListener('click', () => {
      paused = !paused;
      pause.textContent = paused ? 'Play' : 'Pause';
      if (paused) stop(); else play();
    });
    views.forEach(b => b.addEventListener('click', () => {
      view = b.dataset.view;
      views.forEach(v => v.setAttribute('aria-pressed', String(v === b)));
      if (!raf) draw(tNow);
    }));
    function setSpeed() {
      SLOW = SLOWS[+speedSlider.value];
      speedOut.textContent = SLOW === 1 ? 'real time' : `${SLOW}× slower`;
      start = null; // keep the current moment; frame() re-anchors the clock at the new speed
    }
    if (speedSlider) { speedSlider.addEventListener('input', setSpeed); setSpeed(); }
    // Multi-LoRA mode: the checkbox and the layout menu drive one setting. Turning it on brings the robot count down to
    // the post's fine-tune limit, 157 robots; turning it off restores both.
    const loraBox = fig.querySelector('[name="node-lora"]');
    const LORA_ROBOTS = MEASURED.lora.limit;
    let curMode = modeSel.value, prevMode = 'node', robotsBefore = null;
    function setMode(next) {
      if (next === 'lora' && curMode !== 'lora') {
        prevMode = curMode;
        robotsBefore = +slider.value > LORA_ROBOTS ? +slider.value : null;
        if (robotsBefore !== null) slider.value = LORA_ROBOTS;
      } else if (next !== 'lora' && curMode === 'lora' && robotsBefore !== null) {
        slider.value = robotsBefore; robotsBefore = null;
      }
      curMode = next; modeSel.value = next;
      if (loraBox) loraBox.checked = next === 'lora';
      run();
    }
    modeSel.addEventListener('change', () => setMode(modeSel.value));
    if (loraBox) loraBox.addEventListener('change', () => setMode(loraBox.checked ? 'lora' : prevMode));
    slider.addEventListener('input', () => { robotsBefore = null; }); // a count the reader chose stays
    slider.addEventListener('input', run);
    run();
    if (reduceMotion) { pause.hidden = true; draw(t0 + WINDOW + 300); }
    whenVisible(fig, play, stop);
    new ResizeObserver(() => { if (!raf) draw(tNow); }).observe(canvas);
  }

  /* -------------------------------------- Fig. 4: where the tail goes */
  function budget() {
    const fig = document.getElementById('fig-budget');
    if (!fig) return;
    const svg = fig.querySelector('svg');
    const MAX = 70, rowH = 28, titleH = 30;
    const groups = [
      ['As robots are added, random send offsets', [
        ['240 robots', 5.4, 2.6, 18.4, 20.4, 46.9],
        ['256 robots', 7.5, 3.3, 18.5, 20.0, 49.5],
        ['264 robots', 7.9, 8.0, 18.9, 20.2, 54.7],
        ['272 robots', 10.6, 14.8, 19.1, 22.2, 66.4],
      ]],
      ['The same 256 robots, four arrival patterns', [
        ['Assigned offsets', 3.9, 4.9, 18.5, 21.0, 48.2],
        ['Random offsets', 7.5, 3.3, 18.5, 20.0, 49.5],
        ['Site stalls', 25.3, 2.5, 18.9, 18.5, 63.1],
        ['Poisson', 21.7, 8.3, 19.0, 18.2, 64.6],
      ]],
    ];
    const parts = [['queue for a prefill GPU', C.queue], ['wait behind the running call', '#c3c7cb'], ['prefill call', C.scene], ['denoising steps', C.loop]];
    const tip = fig.querySelector('.fig-readout');
    const defaultText = tip.innerHTML;
    // Drawn in a 680-unit frame, or a 360-unit one on phones so the text stays readable without sideways scrolling.
    // The bars carry the parts' sizes; the exact parts are in the hover readout, and the p99 sits at each bar's end.
    let drawnW = 0;
    function render() {
      const narrow = fig.clientWidth < 520, W = narrow ? 360 : 680;
      if (W === drawnW) return;
      drawnW = W;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const L = narrow ? 112 : 132, R = narrow ? 58 : 74, fs = narrow ? 11.5 : 12.5;
      // Legend, wrapping onto a second row when it does not fit.
      let lx = 0, ly = 0;
      for (const [name, color] of parts) {
        const iw = 15 + name.length * 6.3 + 18;
        if (lx > 0 && lx + iw - 18 > W) { lx = 0; ly += 18; }
        el('rect', { x: lx, y: 3 + ly, width: 10, height: 10, fill: color, rx: 2 }, svg);
        text(svg, lx + 15, 12.5 + ly, name, { 'font-size': 12 });
        lx += iw;
      }
      const H = 26 + ly + groups.length * (titleH + 4 * rowH + 26);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const x = v => L + v / MAX * (W - L - R);
      let y = 26 + ly;
      for (const [title, rows] of groups) {
        text(svg, 0, y + 18, title, { fill: C.ink, 'font-size': 13 });
        y += titleH;
        const top = y;
        for (const [label, q, sw, sc, lp, p99] of rows) {
          text(svg, L - 10, y + rowH / 2 + 4, label, { 'text-anchor': 'end', fill: C.ink, 'font-size': fs });
          const g = el('g', { cursor: 'default' }, svg);
          let v0 = 0;
          [q, sw, sc, lp].forEach((v, i) => {
            el('rect', { x: x(v0), y: y + 4, width: Math.max(1, x(v0 + v) - x(v0) - 1.5), height: rowH - 8, fill: parts[i][1] }, g);
            v0 += v;
          });
          text(svg, W, y + rowH / 2 + 4, `p99 ${fmt(p99)}`, { 'text-anchor': 'end', fill: p99 > 50 ? '#b3261e' : C.ink, 'font-size': narrow ? 11.5 : 12 });
          el('rect', { x: L, y, width: W - L, height: rowH, fill: 'transparent' }, g);
          g.addEventListener('pointerenter', () => {
            tip.innerHTML = `<strong>${label}</strong>: ${fmt(q + sw)} ms waiting before the prefill call (${fmt(q)} queued, ${fmt(sw)} behind the call already running), ` +
              `${fmt(sc)} ms in the prefill call, ${fmt(lp)} ms in the denoising steps. Measured p99 <strong>${fmt(p99)} ms</strong>.`;
          });
          g.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') tip.innerHTML = defaultText; });
          y += rowH;
        }
        el('line', { x1: x(50), x2: x(50), y1: top - 2, y2: y + 4, stroke: C.ink, 'stroke-dasharray': '3 3' }, svg);
        text(svg, x(50), y + 18, '50 ms', { 'text-anchor': 'middle', fill: C.ink, 'font-size': 12 });
        text(svg, x(0), y + 18, '0', { 'text-anchor': 'middle', 'font-size': 12 });
        y += 26;
      }
    }
    render();
    new ResizeObserver(render).observe(fig);
  }

  /* --------------------------------- Fig. 1: robots vs p99 latency */
  function capacity() {
    const fig = document.getElementById('fig-capacity');
    if (!fig) return;
    const svg = fig.querySelector('svg');
    const W = 680, H = 396, L = 48, R = 20, T = 32, B = 44;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const xmin = 110, xmax = 290, ymin = 20, ymax = 80;
    const x = v => L + (v - xmin) / (xmax - xmin) * (W - L - R);
    const y = v => T + (1 - (Math.min(v, ymax) - ymin) / (ymax - ymin)) * (H - T - B);
    for (let v = 20; v <= 80; v += 10) {
      el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: v === 50 ? C.ink : C.line, 'stroke-dasharray': v === 50 ? '4 4' : '' }, svg);
      text(svg, L - 8, y(v) + 4, String(v), { 'text-anchor': 'end' });
    }
    text(svg, W - R, y(50) - 7, '50 ms target', { 'text-anchor': 'end', fill: C.ink });
    for (let v = 120; v <= 280; v += 40) text(svg, x(v), H - B + 20, String(v), { 'text-anchor': 'middle' });
    text(svg, (L + W - R) / 2, H - 6, 'robots on the node (4 requests a second each)', { 'text-anchor': 'middle' });
    text(svg, 4, 12, 'server p99, ms', { 'text-anchor': 'start' });

    // Measured series (one host per series; see the table view for runs).
    const series = [
      { name: 'One model, 7 + 1 (FP8 in ten layers)', color: C.scene, dash: '', ...MEASURED.node, label: [196, 40] },
      { name: '24 fine-tunes, 7 + 1 (BF16)', color: C.lora, dash: '', ...MEASURED.lora, label: [150, 58] },
      { name: 'One model, all BF16', color: '#8c8c8c', dash: '5 4', pts: [[220, 51.0], [240, 74.1]], label: [236, 74], anchor: 'end' },
      { name: 'Every GPU runs whole calls', color: '#8c8c8c', dash: '2 3', ...MEASURED.colocated, label: [113, 30] },
    ];
    const tip = fig.querySelector('.fig-readout');
    const defaultText = tip.innerHTML;
    for (const s of series) {
      el('path', { d: s.pts.map((p, i) => (i ? 'L' : 'M') + x(p[0]) + ' ' + y(p[1])).join(''), fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-dasharray': s.dash }, svg);
      if (s.over) {
        const last = s.pts[s.pts.length - 1];
        el('path', { d: `M${x(last[0])} ${y(last[1])}L${x(s.over)} ${y(80)}`, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-dasharray': '1 4' }, svg);
        // The label sits just above where the dotted segment ends, clear of the line.
        text(svg, x(s.over), y(80) - 7, 'overloads', { 'text-anchor': 'middle', 'font-size': 11 });
      }
      for (const p of s.pts) {
        const c = el('circle', { cx: x(p[0]), cy: y(p[1]), r: 4.5, fill: s.color, stroke: C.paper, 'stroke-width': 2 }, svg);
        const hitC = el('circle', { cx: x(p[0]), cy: y(p[1]), r: 12, fill: 'transparent' }, svg);
        hitC.addEventListener('pointerenter', () => { c.setAttribute('r', 6.5); tip.innerHTML = `<strong>${s.name}</strong>: ${p[0]} robots → p99 <strong>${fmt(p[1])} ms</strong>.`; });
        hitC.addEventListener('pointerleave', e => {
          c.setAttribute('r', 4.5);
          if (e.pointerType !== 'touch') tip.innerHTML = defaultText;
        });
      }
      text(svg, x(s.label[0]), y(s.label[1]), s.name, { fill: C.ink, 'font-size': 12.5, 'text-anchor': s.anchor || 'start' });
    }
    // The 256-robot range across three hosts and two seeds.
    el('line', { x1: x(256), x2: x(256), y1: y(46.7), y2: y(49.8), stroke: C.scene, 'stroke-width': 6, opacity: 0.25, 'stroke-linecap': 'round' }, svg);
  }

  /* ------------- Fig. 4: multi-LoRA, the usual kernels and K-concatenation */
  function kcat() {
    const fig = document.getElementById('fig-kcat');
    if (!fig) return;
    const svg = fig.querySelector('svg');
    const modeButtons = [...fig.querySelectorAll('[data-kcat]')];
    const out = fig.querySelector('.fig-readout');
    const W = 680, H = 300;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    let hover = -1;
    let mode = modeButtons.length ? 'usual' : 'ours';
    const short = t => t;
    // Three robots on three different fine-tunes, coloured as in Fig. 03 (F1 red, F2 amber, F3 teal).
    const tenants = ['F1', 'F2', 'F3'];
    const TC = ['#d1495b', '#e09f3e', '#00798c'];

    // The usual path: base matmul, then a shrink and an expand kernel per projection.
    function drawUsual() {
      const iy = 46, rowH = 62, gap = 6, blockH = 3 * rowH + 2 * gap;
      const cols = [
        { x: 12, w: 84, title: 'Input' },
        { x: 122, w: 122, title: 'Kernel 1: base' },
        { x: 270, w: 122, title: 'Kernel 2: shrink' },
        { x: 418, w: 132, title: 'Kernel 3: expand' },
        { x: 576, w: 92, title: 'Output' },
      ];
      for (const c of cols) text(svg, c.x, 24, c.title, { fill: C.ink, 'font-size': 13 });
      // Kernel 1 is one block for the whole batch: every robot shares W.
      el('rect', { x: cols[1].x, y: iy, width: cols[1].w, height: blockH, fill: '#e6e8ea', rx: 3 }, svg);
      text(svg, cols[1].x + cols[1].w / 2, iy + blockH / 2 - 4, 'y = x·W', { 'text-anchor': 'middle', fill: C.ink, 'font-size': 13 });
      text(svg, cols[1].x + cols[1].w / 2, iy + blockH / 2 + 14, 'W shared by all rows', { 'text-anchor': 'middle', 'font-size': 11 });
      for (let r = 0; r < 3; r++) {
        const y = iy + r * (rowH + gap), on = hover === -1 || hover === r, op = on ? 1 : 0.3;
        const g = el('g', { opacity: op, cursor: 'pointer' }, svg);
        el('rect', { x: cols[0].x, y, width: cols[0].w, height: rowH, fill: C.sceneSoft, rx: 3 }, g);
        text(g, cols[0].x + cols[0].w / 2, y + rowH / 2 - 4, `Robot ${r + 1}`, { 'text-anchor': 'middle', fill: C.ink });
        el('circle', { cx: cols[0].x + cols[0].w / 2 - 10, cy: y + rowH / 2 + 12, r: 4.5, fill: TC[r] }, g);
        text(g, cols[0].x + cols[0].w / 2 - 2, y + rowH / 2 + 16, tenants[r], { fill: C.muted, 'font-size': 11 });
        el('rect', { x: cols[2].x, y: y + 8, width: cols[2].w, height: rowH - 16, fill: TC[r], 'fill-opacity': 0.14, stroke: TC[r], rx: 3 }, g);
        text(g, cols[2].x + cols[2].w / 2, y + rowH / 2 + 4, `v${r + 1} = x·A(${short(tenants[r])})`, { 'text-anchor': 'middle', fill: C.ink, 'font-size': 12 });
        el('rect', { x: cols[3].x, y: y + 8, width: cols[3].w, height: rowH - 16, fill: TC[r], 'fill-opacity': 0.14, stroke: TC[r], rx: 3 }, g);
        text(g, cols[3].x + cols[3].w / 2, y + rowH / 2 + 4, `y += v${r + 1}·B(${short(tenants[r])})`, { 'text-anchor': 'middle', fill: C.ink, 'font-size': 12 });
        el('rect', { x: cols[4].x, y, width: cols[4].w, height: rowH, fill: '#f6f6f6', stroke: C.line, rx: 3 }, g);
        text(g, cols[4].x + cols[4].w / 2, y + rowH / 2 - 4, 'x·W', { 'text-anchor': 'middle', fill: C.ink });
        text(g, cols[4].x + cols[4].w / 2, y + rowH / 2 + 14, `+ v${r + 1}·B(${short(tenants[r])})`, { 'text-anchor': 'middle', fill: TC[r], 'font-size': 12 });
        // Arrows between the stages of this robot's rows.
        for (let k = 0; k < 4; k++) {
          const x1 = cols[k].x + cols[k].w + 3, x2 = cols[k + 1].x - 3, ym = y + rowH / 2;
          el('path', { d: `M${x1} ${ym}L${x2} ${ym}M${x2 - 5} ${ym - 4}L${x2} ${ym}L${x2 - 5} ${ym + 4}`, fill: 'none', stroke: C.faint, 'stroke-width': 1.5 }, g);
        }
        el('rect', { x: 0, y, width: W, height: rowH, fill: 'transparent' }, g);
        g.addEventListener('pointerenter', () => { hover = r; draw(); explain(); });
        g.addEventListener('pointerleave', e => {
          if (e.pointerType === 'touch') return;
          hover = -1; draw(); explain();
        });
      }
      const fy = iy + blockH + 18;
      text(svg, cols[1].x + cols[1].w / 2, fy, 'one kernel for the batch', { 'font-size': 11, 'text-anchor': 'middle' });
      text(svg, cols[2].x + cols[2].w / 2, fy, "reads x; each row's own A", { 'font-size': 11, 'text-anchor': 'middle' });
      text(svg, cols[3].x + cols[3].w / 2, fy, 'reads y back, rewrites it', { 'font-size': 11, 'text-anchor': 'middle' });
    }

    // Ours: the expand folded into the base matmul. Columns [x | v0 | v1 | v2], weight [W ; B ; B ; B].
    function drawOurs() {
      const ix = 20, iy = 46, rowH = 62, xW = 150, vW = 34;
      text(svg, ix, 24, 'Input (rows = tokens)', { fill: C.ink, 'font-size': 13 });
      for (let r = 0; r < 3; r++) {
        const y = iy + r * (rowH + 6), on = hover === -1 || hover === r;
        const g = el('g', { opacity: on ? 1 : 0.35, cursor: 'pointer' }, svg);
        el('rect', { x: ix, y, width: xW, height: rowH, fill: C.sceneSoft, rx: 3 }, g);
        text(g, ix + xW / 2, y + rowH / 2 - 4, `x, robot ${r + 1}`, { 'text-anchor': 'middle', fill: C.ink });
        el('circle', { cx: ix + 44, cy: y + rowH / 2 + 12, r: 4.5, fill: TC[r] }, g);
        text(g, ix + 53, y + rowH / 2 + 16, `fine-tune ${tenants[r]}`, { fill: C.muted, 'font-size': 10.5 });
        for (let s = 0; s < 3; s++) {
          const sx = ix + xW + 4 + s * (vW + 3);
          const mine = s === r;
          el('rect', { x: sx, y, width: vW, height: rowH, fill: mine ? TC[r] : '#f4f4f4', 'fill-opacity': mine ? 0.18 : 1, stroke: mine ? TC[r] : C.line, rx: 3 }, g);
          text(g, sx + vW / 2, y + rowH / 2 + 4, mine ? `v${r + 1}` : '0', { 'text-anchor': 'middle', fill: mine ? C.ink : C.faint, 'font-size': mine ? 12 : 14 });
        }
        g.addEventListener('pointerenter', () => { hover = r; draw(); explain(); });
        g.addEventListener('pointerleave', e => {
          if (e.pointerType === 'touch') return;
          hover = -1; draw(); explain();
        });
      }
      for (let s = 0; s < 3; s++) text(svg, ix + xW + 4 + s * (vW + 3) + vW / 2, iy + 3 * (rowH + 6) + 12, String(s + 1), { 'font-size': 11, 'text-anchor': 'middle' });
      text(svg, ix + xW / 2, iy + 3 * (rowH + 6) + 12, 'activations', { 'font-size': 11, 'text-anchor': 'middle' });
      text(svg, ix + xW + 4 + 1.5 * (vW + 3), iy + 3 * (rowH + 6) + 26, 'v from the shrink kernel, one slot per robot', { 'font-size': 11, 'text-anchor': 'middle' });
      text(svg, 312, iy + 1.5 * rowH + 12, '×', { 'text-anchor': 'middle', 'font-size': 26, fill: C.ink });
      const wx = 340, wW = 150, wH = 150;
      text(svg, wx, 24, "W, with the call's B matrices", { fill: C.ink, 'font-size': 13 });
      el('rect', { x: wx, y: iy, width: wW, height: wH, fill: '#e6e8ea', rx: 3 }, svg);
      text(svg, wx + wW / 2, iy + wH / 2 + 4, 'W  (shared base)', { 'text-anchor': 'middle', fill: C.ink });
      for (let s = 0; s < 3; s++) {
        const sy = iy + wH + 4 + s * 18, on = hover === -1 || hover === s;
        el('rect', { x: wx, y: sy, width: wW, height: 15, fill: TC[s], 'fill-opacity': 0.18, stroke: TC[s], rx: 2, opacity: on ? 1 : 0.35 }, svg);
        text(svg, wx + wW / 2, sy + 11.5, `B of fine-tune ${tenants[s]}`, { 'text-anchor': 'middle', fill: C.ink, 'font-size': 11, opacity: on ? 1 : 0.35 });
      }
      text(svg, 515, iy + 1.5 * rowH + 12, '=', { 'text-anchor': 'middle', 'font-size': 24, fill: C.ink });
      const ox = 540;
      text(svg, ox, 24, 'Output', { fill: C.ink, 'font-size': 13 });
      for (let r = 0; r < 3; r++) {
        const y = iy + r * (rowH + 6), on = hover === -1 || hover === r;
        el('rect', { x: ox, y, width: 120, height: rowH, fill: '#f6f6f6', stroke: C.line, rx: 3, opacity: on ? 1 : 0.35 }, svg);
        text(svg, ox + 60, y + rowH / 2 - 4, `x·W`, { 'text-anchor': 'middle', fill: C.ink, opacity: on ? 1 : 0.35 });
        text(svg, ox + 60, y + rowH / 2 + 14, `+ v${r + 1}·B(${short(tenants[r])})`, { 'text-anchor': 'middle', fill: TC[r], 'font-size': 12, opacity: on ? 1 : 0.35 });
      }
    }

    function draw() {
      svg.textContent = '';
      if (mode === 'usual') drawUsual(); else drawOurs();
    }
    function explain() {
      if (mode === 'usual') {
        out.innerHTML = hover === -1
          ? `Three robots, each on a different fine-tune, in one batch. Three kernels run in sequence. All rows share <i>W</i>; kernels 2 and 3 use each robot's own <i>A</i> and <i>B</i>, and kernel 3 reads <i>y</i> back and rewrites it. Hover a robot to follow its rows.`
          : `<strong>Robot ${hover + 1}</strong>: its rows go through the shared <i>x·W</i>, then <i>A</i> of fine-tune ${tenants[hover]} makes the small <i>v</i>, then <i>B</i> of fine-tune ${tenants[hover]} expands <i>v</i> and adds it into <i>y</i>. Kernel 3 cannot start until kernels 1 and 2 have finished.`;
      } else if (hover === -1) {
        out.innerHTML = `Three robots, each on a different fine-tune. One kernel replaces kernels 1 and 3. Each robot's <i>v</i> sits in its own slot; the other slots hold exact zeros. Hover a robot to follow its row.`;
      } else {
        const others = [0, 1, 2].filter(s => s !== hover).map(s => `B of fine-tune ${tenants[s]}`).join(' and ');
        out.innerHTML = `<strong>Robot ${hover + 1}</strong> gets <i>x·W + v·B</i> for fine-tune ${tenants[hover]}. Its row meets ${others} only through exact zeros, and 0 × anything adds exactly nothing, so its result has the same bits whoever else is in the call.`;
      }
    }
    modeButtons.forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.kcat; hover = -1;
      modeButtons.forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      draw(); explain();
    }));
    draw(); explain();
  }

  /* --------------------------------- Fig. 6: tenants vs robots */
  function tenants() {
    const fig = document.getElementById('fig-tenants');
    if (!fig) return;
    const svg = fig.querySelector('svg');
    const W = 680, H = 210, L = 150, R = 60, T = 8, rowH = 36;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    // Measured (gated BF16, cap 2, random arrivals), before the final tuning round.
    const rows = [['1 fine-tune', 156], ['8 fine-tunes', 155], ['24 fine-tunes', 152], ['64 fine-tunes', 149], ['128, pinned', 120]];
    const x = v => L + v / 180 * (W - L - R);
    const tip = fig.querySelector('.fig-readout');
    const defaultText = tip.innerHTML;
    rows.forEach(([label, v], i) => {
      const y = T + i * rowH;
      text(svg, L - 12, y + rowH / 2 + 4, label, { 'text-anchor': 'end', fill: C.ink, 'font-size': 13 });
      const r = el('rect', { x: L, y: y + 8, width: x(v) - L, height: rowH - 16, fill: i === 4 ? '#d9b796' : C.lora, rx: 4 }, svg);
      text(svg, x(v) + 8, y + rowH / 2 + 4, `≈ ${v}`, { fill: C.ink, 'font-size': 13 });
      r.addEventListener('pointerenter', () => { tip.innerHTML = `<strong>${label}</strong>: ≈ ${v} robots under 50 ms p99.` + (i === 4 ? ' Past about 68 fine-tunes they no longer all fit on every scene GPU, so each is pinned to a group of GPUs and smaller pools queue more.' : ''); });
      r.addEventListener('pointerleave', () => { tip.innerHTML = defaultText; });
    });
    el('line', { x1: L, x2: L, y1: T, y2: T + rows.length * rowH, stroke: C.ink }, svg);
  }

  /* ------------------------------------- Python highlighting for code blocks */
  function highlight() {
    const KW = new Set(['for', 'in', 'if', 'elif', 'else', 'def', 'return', 'import', 'from', 'as', 'and', 'or', 'not',
      'None', 'True', 'False', 'while', 'with', 'lambda', 'class', 'yield', 'break', 'continue', 'pass']);
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const TOK = /(#.*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|\b(\d+(?:\.\d+)?)\b|([A-Za-z_]\w*)/gm;
    for (const code of document.querySelectorAll('.article pre code')) {
      const src = code.textContent;
      let out = '', last = 0, m;
      TOK.lastIndex = 0;
      while ((m = TOK.exec(src))) {
        out += esc(src.slice(last, m.index));
        const [tok, com, str, num, word] = m;
        if (com) out += `<span class="py-com">${esc(tok)}</span>`;
        else if (str) out += `<span class="py-str">${esc(tok)}</span>`;
        else if (num) out += `<span class="py-num">${tok}</span>`;
        else if (KW.has(word)) out += `<span class="py-kw">${tok}</span>`;
        else if (src[TOK.lastIndex] === '(') out += `<span class="py-fn">${tok}</span>`;
        else out += tok;
        last = TOK.lastIndex;
      }
      code.innerHTML = out + esc(src.slice(last));
    }
  }

  hero(); batching(); node(); budget(); capacity(); kcat(); tenants(); highlight();
})();
