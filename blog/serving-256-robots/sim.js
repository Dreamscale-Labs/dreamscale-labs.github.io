(function (global) {
  'use strict';

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  // One-way uplink delay beyond the minimum, from quantiles fitted to production QUIC round trips (ms).
  const NET = [[0, 0], [0.5, 4.5], [0.9, 10], [0.99, 53], [0.999, 115], [1, 200]];
  function lerpTable(table, x) {
    if (x <= table[0][0]) return table[0][1];
    for (let i = 1; i < table.length; i++) {
      if (x <= table[i][0]) {
        const [a, ya] = table[i - 1], [b, yb] = table[i];
        return ya + (yb - ya) * (x - a) / (b - a);
      }
    }
    const [a, ya] = table[table.length - 2], [b, yb] = table[table.length - 1];
    return yb + (yb - ya) * (x - b) / (b - a);
  }

  // Measured loop step (ms) by robots in the step: library loop with every kept change.
  const LOOP_BASE = [[1, 1.07], [8, 1.23], [16, 1.44], [24, 1.75], [32, 2.0]];
  const LOOP_LORA = [[1, 1.29], [12, 1.9], [16, 2.13], [24, 2.45], [32, 2.7]];

  const SLOW_FP8 = [[256, 1.01], [264, 1.013], [272, 1.023]];
  const SLOW_LORA = [[152, 1], [160, 16.16 / 16.09], [168, 16.22 / 16.09]];
  const MODES = {
    // 7 scene GPUs + 1 loop GPU, FP8 MLPs in Gemma layers 7-16, up to 3 robots per scene call.
    node: { sceneGpus: 7, loopGpus: 1, cap: 3, callMs: [0, 7.9, 13.2, 18.4], copyMs: 0.05, expectMs: [0, 8.0, 13.2, 18.9], loadSlow: SLOW_FP8, loop: LOOP_BASE },
    // 24 tenants, all-BF16 scene reading with per-tenant SigLIP and Gemma LoRA, up to 2 per call.
    lora: { sceneGpus: 7, loopGpus: 1, cap: 2, callMs: [0, 10.3, 16.1], copyMs: 0.05, expectMs: null, loadSlow: SLOW_LORA, loop: LOOP_LORA },
    // 6 scene + 2 loop GPUs.
    split62: { sceneGpus: 6, loopGpus: 2, cap: 3, callMs: [0, 7.9, 13.2, 18.4], copyMs: 0.05, expectMs: [0, 8.0, 13.2, 18.9], loadSlow: SLOW_FP8, loop: LOOP_BASE },
    // Every GPU runs whole calls (scene reading + megakernel loop, 14.8 ms) one robot at a time.
    colocated: { wholeGpus: 8, wholeMs: 14.8 },
  };

  function simulate(opts) {
    const o = Object.assign({ robots: 256, mode: 'node', seconds: 12, seed: 7, phases: 'random', hostMs: 2.5 }, opts);
    const m = MODES[o.mode];
    const r = rng(o.seed);
    const period = 250, T = o.seconds * 1000;
    const reqs = [];
    for (let i = 0; i < o.robots; i++) {
      const phase = o.phases === 'random' ? r() * period : i * period / o.robots;
      for (let t = phase; t < T; t += period) {
        const jitter = o.phases === 'random' ? r() * 30 - 15 : r() * 2 - 1;
        reqs.push({ robot: i, t: t + jitter + lerpTable(NET, r()) });
      }
    }
    reqs.sort((a, b) => a.t - b.t);
    const calls = [], steps = [];

    if (m.wholeGpus) {
      const free = new Array(m.wholeGpus).fill(0);
      for (const q of reqs) {
        let g = 0;
        for (let k = 1; k < free.length; k++) if (free[k] < free[g]) g = k;
        const start = Math.max(free[g], q.t), end = start + m.wholeMs;
        free[g] = end;
        Object.assign(q, { gpu: g, lane: 0, taken: start, sceneStart: start, sceneEnd: end, kv: end, admit: end, done: end + o.hostMs });
        calls.push({ gpu: g, start, end, robots: [q.robot], whole: true });
      }
    } else {
      const LEAD = 2;
      const G = m.sceneGpus;
      const inflight = Array.from({ length: G }, () => []); // { aEnd: copies done, eEnd: expected end }
      const lastA = new Array(G).fill(0); // when each GPU's stream is next free
      // Calls slow as the node fills (measured; flat below the first point, extended linearly past the last).
      const slow = Math.max(1, lerpTable(m.loadSlow, o.robots));
      const graphMs = n => m.callMs[n] * slow, copyMs = n => m.copyMs * n;
      const learned = m.callMs.map((c, n) => graphMs(n) + copyMs(n)); // an adaptive worker's table converges to the real calls
      const expect = n => (m.expectMs ? m.expectMs[n] : learned[n]);
      function readyAt(g) {
        const fl = inflight[g];
        if (fl.length === 0) return -Infinity;
        if (fl.length === 1) return Math.min(fl[0].eEnd - LEAD, fl[0].aEnd);
        return Math.max(fl[0].aEnd, Math.min(fl[1].eEnd - LEAD, fl[1].aEnd));
      }
      const queue = [];
      let next = 0;
      while (next < reqs.length || queue.length) {
        const head = queue.length ? queue[0].t : reqs[next].t;
        let best = Infinity, cands = [];
        for (let g = 0; g < G; g++) {
          const tg = Math.max(readyAt(g), head);
          if (tg < best - 1e-9) { best = tg; cands = [g]; } else if (Math.abs(tg - best) <= 1e-9) cands.push(g);
        }
        const idle = cands.filter(k => inflight[k].every(c => c.aEnd <= best));
        const pool = idle.length ? idle : cands;
        const g = pool[Math.floor(r() * pool.length)], t = best;
        while (next < reqs.length && reqs[next].t <= t) queue.push(reqs[next++]);
        const batch = queue.splice(0, Math.min(m.cap, queue.length));
        const n = batch.length;
        inflight[g] = inflight[g].filter(c => c.aEnd > t);
        const fl = inflight[g];
        const start = Math.max(t, lastA[g]), end = start + graphMs(n), aEnd = end + copyMs(n);
        // The expected end chains on the last call still in flight; a drained GPU starts a fresh chain.
        const eEnd = (fl.length ? Math.max(t, fl[fl.length - 1].eEnd) : t) + expect(n);
        fl.push({ aEnd, eEnd });
        lastA[g] = aEnd;
        batch.forEach((q, k) => Object.assign(q, { gpu: g, lane: k, taken: t, sceneStart: start, sceneEnd: end, kv: end + m.copyMs * (k + 1) }));
        calls.push({ gpu: g, taken: t, start, end, robots: batch.map(q => q.robot) });
      }
      // Loop GPUs: one batched step at a time; robots join at a step boundary, each at its own step,
      // and leave after 10 steps. The next step is prepared while one runs, so a robot whose K/V
      // lands mid-step joins the step after next.
      const byLoop = Array.from({ length: m.loopGpus }, () => []);
      reqs.slice().sort((a, b) => a.kv - b.kv).forEach((q, i) => byLoop[i % m.loopGpus].push(q));
      byLoop.forEach((pending, lg) => {
        // Each robot in the batch holds one of the GPU's 32 lanes from the step it joins until its tenth step ends.
        let i = 0, t = 0, prevStart = -Infinity, active = [];
        const laneUsed = new Array(32).fill(false);
        while (i < pending.length || active.length) {
          if (!active.length && pending[i].kv > t) { t = pending[i].kv; prevStart = t; }
          while (i < pending.length && pending[i].kv <= prevStart && active.length < 32) {
            const q = pending[i++];
            q.left = 10; q.admit = t; q.loopGpu = lg;
            q.slot = laneUsed.indexOf(false); laneUsed[q.slot] = true;
            active.push(q);
          }
          if (!active.length) { prevStart = t; continue; }
          const d = lerpTable(m.loop, active.length);
          steps.push({ gpu: lg, start: t, end: t + d, robots: active.map(q => q.robot), stepIdx: active.map(q => 10 - q.left) });
          prevStart = t; t += d;
          for (const q of active) if (--q.left === 0) { q.loopEnd = t; q.done = t + o.hostMs; laneUsed[q.slot] = false; }
          active = active.filter(q => q.left > 0);
        }
      });
    }

    const warm = 1500;
    const lat = reqs.filter(q => q.t > warm && q.t < T - 400).map(q => q.done - q.t).sort((a, b) => a - b);
    const pct = p => lat[Math.min(lat.length - 1, Math.floor(p * lat.length))];
    const gpus = m.wholeGpus || m.sceneGpus;
    let busy = 0;
    for (const c of calls) if (c.start > warm && c.start < T - 400) busy += c.end - c.start;
    const sceneBusy = busy / gpus / (T - 400 - warm);
    let stepRobots = 0;
    for (const s of steps) stepRobots += s.robots.length;
    return {
      mode: o.mode, robots: o.robots, reqs, calls, steps, seconds: o.seconds,
      p50: pct(0.5), p99: pct(0.99), sceneBusy,
      robotsPerStep: steps.length ? stepRobots / steps.length : 0,
      overloaded: sceneBusy > 0.995 || pct(0.99) > 150,
    };
  }

  global.NodeSim = { simulate, MODES };
})(typeof window !== 'undefined' ? window : globalThis);
