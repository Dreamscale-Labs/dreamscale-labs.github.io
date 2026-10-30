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
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = []; curve = [];
    const left = 38, right = width - 18, top = 30, bottom = height - 35;
    for (let y = top; y < bottom; y += 8) {
      for (let x = left; x < right; x += 8) dots.push({x, y, phase:x*y});
    }
    let previous = null;
    for (let i = 0; i <= 360; i++) {
      const t = i / 360;
      const point = {x:left+t*(right-left), y:bottom-loss(t)*(bottom-top), t};
      if (!previous || Math.hypot(point.x-previous.x,point.y-previous.y) > 2.5) {curve.push(point);previous=point;}
    }
    render();
  }
  function render() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#17191a'; ctx.globalAlpha = .18;
    ctx.beginPath();
    for (const d of dots) {
      const radius = .25 + .7 * Math.abs(Math.sin(d.phase + elapsed * .0005));
      ctx.moveTo(d.x + radius, d.y);ctx.arc(d.x,d.y,radius,0,Math.PI*2);
    }
    ctx.fill();ctx.globalAlpha=1;
    ctx.strokeStyle = '#ccd5e2';ctx.lineWidth=.75;
    ctx.beginPath();ctx.moveTo(38,25);ctx.lineTo(38,height-35);ctx.lineTo(width-18,height-35);ctx.stroke();
    ctx.fillStyle='#788494';ctx.font='10px monospace';ctx.fillText('LOSS',38,15);ctx.fillText('STEPS →',width-75,height-12);
    // Keep the complete curve legible, with a soft wave of brighter particles.
    const wave = (elapsed * .00009) % 1.35 - .15;
    for (const p of curve) {
      const pulse = Math.abs(Math.sin(p.x*p.y + elapsed * .0005));
      const highlight = Math.exp(-Math.pow((p.t-wave)/.07,2));
      ctx.fillStyle='#0047ab';ctx.globalAlpha=.65+.35*highlight;
      const radius=.85+.35*pulse+.25*highlight;
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
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();}).observe(canvas);
  motion.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
})();
