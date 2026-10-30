// The same dotted animation as the p5 sketch, drawn directly on a canvas.
// Using both favicon contours preserves the cloud's dimensional lower edge.
(() => {
  document.querySelectorAll('#cloud-canvas, #inference-canvas').forEach(canvas => {
  const isRobot = canvas.id === 'inference-canvas';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const outer = new Path2D("M1376.96 88.5695C1372.33 88.594 1365.03 88.6165 1360.63 89.0954C1198.28 100.041 1031.71 194.573 925.956 316.108C918.736 324.404 910.493 334.263 904.052 343.133C823.509 298.837 756.097 323.228 690.276 379.914C646.303 275.622 529.29 302.992 447.191 338.828C335.924 387.395 233.136 462.101 153.48 553.851C126.757 584.63 90.8763 627.128 109.329 670.151C111.742 675.683 114.836 680.894 118.538 685.661C127.943 697.855 140.253 708.973 150.339 720.703C155.067 726.201 160.258 731.583 165.115 736.995C174.425 747.368 182.076 756.746 193.981 764.244C217.098 778.805 243.173 778.466 269.266 778.127C272.558 778.085 275.849 778.042 279.135 778.029C292.22 778.019 305.363 777.833 318.521 777.647C333.883 777.43 349.266 777.213 364.604 777.274L988.91 776.389L1179.26 776.475C1189.06 776.475 1198.76 776.553 1208.4 776.631C1257.95 777.03 1305.8 777.416 1355.65 767.05C1451.39 747.142 1536.62 703.207 1606.54 634.868C1699.66 543.846 1769.08 376.809 1660.33 269.437C1653.74 262.97 1647.06 256.609 1640.27 250.359C1621.6 233.436 1624.45 235.004 1613.27 213.222C1607.26 201.72 1600.2 190.792 1592.2 180.574C1540.11 114.96 1458.5 88.1381 1376.96 88.5695Z");
  const inner = new Path2D("M1372.69 134.006C1370.21 134.014 1367.49 134.024 1365.08 134.229C1351.3 135.179 1334.84 136.418 1321.3 138.684C1189.97 160.663 1050.74 240.854 963.435 341.068C955.512 350.113 947.874 359.403 940.534 368.927C934.613 376.672 929.129 385.207 922.353 392.057C919.324 395.12 914.214 398.35 909.831 398.29C892.819 398.06 880.342 382.03 864.331 375.086C805.884 349.737 747.136 384.942 707.077 426.737C698.18 436.089 692.962 448.633 678.275 449.404C658.135 450.46 655.58 434.652 653.189 419.852C652.601 416.21 652.022 412.63 651.194 409.377C641.31 370.545 609.869 349.517 570.362 352.101C546.419 353.181 519.972 360.104 497.155 368.196C385.023 408.515 282.575 481.112 201.191 567.586C185.505 584.253 152.926 620.146 150.584 644.121C149.801 652.141 158.777 658.168 166.336 659.038C175.115 660.048 184.362 659.976 193.505 659.904C195.504 659.888 197.497 659.872 199.48 659.868L253.966 659.778L897.951 658.722L1081.49 658.576C1091.67 658.571 1101.84 658.669 1111.99 658.766C1159.62 659.225 1206.93 659.681 1253.57 649.466C1345.69 630.013 1430.31 584.59 1497.44 518.566C1548.26 467.651 1593.7 395.413 1592.94 321.533C1592.44 273.114 1576.51 228.499 1542.19 193.739C1498.95 149.949 1433.39 133.731 1373.54 134.003C1373.26 134.004 1372.98 134.005 1372.69 134.006Z");
  const robotCanvas = document.createElement('canvas');
  robotCanvas.width = 640;
  robotCanvas.height = 480;
  const robotContext = robotCanvas.getContext('2d', { willReadFrequently: true });
  let robotScale = 1, centerX = 0, centerY = 0, robotCenterY = 0;
  let fineRobotDots = [], fineDotScale = 1;
  let dots = [], width = 0, height = 0, frame = 0;
  let visible = true, elapsed = 0, lastTime = null, lastRender = null;
  const frameInterval = 1000 / 30;
  const pulseSpeed = 0.0005;
  let robotFrame = -1, cachedRobotPixels = null;
  const robotColors = Array.from({ length: 32 }, (_, i) =>
    `rgb(0 ${Math.round(71 * i / 31)} ${Math.round(171 * i / 31)})`);
  let mobile = false, dotScale = 1;

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    // Keep a similar number of samples across the cloud on smaller screens.
    mobile = matchMedia('(max-width: 760px)').matches;
    const scale = mobile
      ? Math.min(width * 0.82 / 1600, height * 0.64 / 690)
      : Math.min(width * 0.68 / 1600, height * 0.54 / 690);
    dotScale = mobile ? Math.min(1, scale / 0.368) : 1;
    const spacing = 8 * dotScale;
    const origin = 6 * dotScale;
    centerX = width * (mobile ? 0.5 : 0.57);
    centerY = height * (mobile ? 0.5 : 0.49);
    robotScale = Math.min(width * (mobile ? 0.94 : 0.84) / 640, height * 0.88 / 480);
    robotCenterY = height * 0.5;
    if (isRobot) centerX = width * 0.5;
    const robotIndexAt = (x, y) => {
      const rx = Math.round((x - centerX) / robotScale + 320);
      const ry = Math.round((y - robotCenterY) / robotScale + 240);
      return rx >= 0 && rx < 640 && ry >= 0 && ry < 480 ? 4 * (ry * 640 + rx) : -1;
    };
    dots = [];
    for (let y = origin; y < height; y += spacing) {
      for (let x = origin; x < width; x += spacing) {
        const sx = (x - centerX) / scale + 890;
        const sy = (y - centerY) / scale + 433.5;
        const outline = ctx.isPointInPath(outer, sx, sy) && !ctx.isPointInPath(inner, sx, sy);
        dots.push({ x, y, outline, phase: (x / dotScale) * (y / dotScale) });
      }
    }
    fineRobotDots = [];
    fineDotScale = dotScale * (mobile ? 0.6 : 0.5);
    for (let y = 6 * fineDotScale; y < height; y += 8 * fineDotScale) {
      for (let x = 6 * fineDotScale; x < width; x += 8 * fineDotScale) {
        const robotIndex = robotIndexAt(x, y);
        if (robotIndex >= 0) fineRobotDots.push({ x, y, robotIndex, phase: (x / fineDotScale) * (y / fineDotScale) });
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render(elapsed);
  }

  function render(time) {
    ctx.clearRect(0, 0, width, height);
    const driftX = mobile ? 0 : Math.sin(time * 0.00045) * 5;
    const driftY = Math.sin(time * 0.00065) * 3 * dotScale;
    const robotWeight = isRobot ? 1 : 0;
    let robotPixels = null;
    if (robotWeight > 0) {
      const poseTime = (time / 1000) % 9.2;
      const nextFrame = Math.floor(poseTime * 24);
      if (nextFrame !== robotFrame) {
        DreamscaleRobot.draw(robotContext, nextFrame / 24);
        cachedRobotPixels = robotContext.getImageData(0, 0, 640, 480).data;
        robotFrame = nextFrame;
      }
      robotPixels = cachedRobotPixels;
    }
    // Two fills for the entire cloud/background grid instead of one per dot.
    for (const outline of [false, true]) {
      const shapeWeight = Number(outline) * (1 - robotWeight);
      ctx.fillStyle = `rgb(0 ${Math.round(71 * shapeWeight)} ${Math.round(171 * shapeWeight)})`;
      ctx.globalAlpha = outline && !isRobot ? 1 : 0.22;
      ctx.beginPath();
      for (const dot of dots) {
        if (dot.outline !== outline) continue;
        const pulse = Math.abs(Math.sin(dot.phase + time * pulseSpeed));
        const radius = (1.5 * pulse + shapeWeight * (2 + 0.5 * pulse)) * dotScale;
        const x = dot.x + driftX, y = dot.y + driftY * (1 - robotWeight);
        ctx.moveTo(x + radius, y);
        ctx.arc(x, y, radius, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (robotPixels) {
      ctx.globalAlpha = robotWeight;
      const paths = Array.from({ length: 32 }, () => new Path2D());
      for (const dot of fineRobotDots) {
        const shade = robotPixels[dot.robotIndex] / 255;
        if (shade === 0) continue;
        const pulse = Math.abs(Math.sin(dot.phase + time * pulseSpeed));
        const radius = (1.5 * pulse + shade * (2 + 0.5 * pulse)) * fineDotScale;
        const path = paths[Math.round(shade * 31)];
        path.moveTo(dot.x + radius, dot.y);
        path.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
      }
      paths.forEach((path, i) => { ctx.fillStyle = robotColors[i]; ctx.fill(path); });
      ctx.globalAlpha = 1;
    }
  }

  function tick(time) {
    if (lastTime !== null) elapsed += Math.min(time - lastTime, 64);
    lastTime = time;
    if (lastRender === null || time - lastRender >= frameInterval - 0.1) {
      render(elapsed);
      lastRender = lastRender === null ? time
        : lastRender + Math.floor((time - lastRender + 0.1) / frameInterval) * frameInterval;
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    lastTime = null;
    lastRender = null;
    if (reducedMotion.matches) render(0);
    else if (visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  const layoutObserver = new ResizeObserver(resize);
  layoutObserver.observe(canvas);
  layoutObserver.observe(document.querySelector('.hero-copy'));
  document.fonts.ready.then(resize);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(canvas);
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);
  });
})();
