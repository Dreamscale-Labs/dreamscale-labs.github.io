// A sampled loss trajectory, rendered with the same pulsing dots as the cloud.
(() => {
  const canvas = document.getElementById('loss-canvas');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0, frame = 0, elapsed = 0, lastTime = null;
  let visible = false, dots = [], curve = [];
  // Deterministic mini-batch noise decays as optimization converges.
  function loss(t) {
    const noise = Math.sin(t * 147) * .55 + Math.sin(t * 347 + 1.8) * .3 + Math.sin(t * 73) * .4;
    return .12 + .78 * Math.exp(-5.3 * t) + noise * (.035 * Math.exp(-2.3 * t) + .004);
  }
  function resize() {
    width = canvas.clientWidth; height = canvas.clientHeight;
    const dpr = devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = []; curve = [];
    const left = width * .12, right = width * .88, top = height * .18, bottom = height * .82;
    for (let y = 6; y < height; y += 8) {
      for (let x = 6; x < width; x += 8) dots.push({x, y, phase:x*y});
    }
    // Three parallel dot trails give the curve thickness without enlarging dots.
    // Sample by pixel distance so density does not depend on viewport width.
    const samples = Math.max(720, Math.ceil((right - left) * 4));
    let previous = null;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const point = {x:left+t*(right-left), y:bottom-loss(t)*(bottom-top), t};
      if (previous && Math.hypot(point.x-previous.x,point.y-previous.y) < 2.6) continue;
      const dt = 1 / samples;
      const dx = (right-left) * 2 * dt;
      const dy = -(loss(t+dt)-loss(t-dt)) * (bottom-top);
      const length = Math.hypot(dx,dy) || 1;
      for (const offset of [-2.4, 0, 2.4]) {
        curve.push({x:point.x-dy/length*offset, y:point.y+dx/length*offset, t});
      }
      previous=point;
    }
    render();
  }
  function render() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#000'; ctx.globalAlpha = 1;
    ctx.beginPath();
    for (const d of dots) {
      const radius = 1.5 * Math.abs(Math.sin(d.phase + elapsed * .0005));
      ctx.moveTo(d.x + radius, d.y);ctx.arc(d.x,d.y,radius,0,Math.PI*2);
    }
    ctx.fill();ctx.globalAlpha=1;
    // Reveal one training run over three seconds, hold, then dissolve to restart.
    const cycle = elapsed % 4500;
    const progress = motion.matches ? 1 : Math.min(cycle / 3000, 1);
    const opacity = motion.matches || cycle < 4000 ? 1 : 1 - (cycle - 4000) / 500;
    for (const p of curve) {
      if (p.t > progress) break;
      const pulse = Math.abs(Math.sin(p.x*p.y + elapsed * .0005));
      const reveal = motion.matches ? 1 : Math.min(1, (progress - p.t) / .018);
      const highlight = Math.exp(-Math.pow((p.t-progress)/.025,2));
      ctx.fillStyle='#0047ab';ctx.globalAlpha=(.75+.25*highlight)*reveal*opacity;
      const radius=.98+.35*pulse+.25*highlight;
      ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  function tick(now) {
    if(lastTime!==null)elapsed+=Math.min(now-lastTime,64);
    lastTime=now;render();frame=requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);lastTime=null;
    if(motion.matches){elapsed=0;render();}
    else if(visible&&!document.hidden)frame=requestAnimationFrame(tick);
  }
  let resolutionQuery;
  function watchResolution() {
    resolutionQuery?.removeEventListener('change', onResolutionChange);
    resolutionQuery = matchMedia(`(resolution: ${devicePixelRatio || 1}dppx)`);
    resolutionQuery.addEventListener('change', onResolutionChange);
  }
  function onResolutionChange() { resize(); watchResolution(); }
  watchResolution();
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();}).observe(canvas);
  motion.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
})();
