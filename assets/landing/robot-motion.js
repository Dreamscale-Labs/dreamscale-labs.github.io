// Reference-inspired articulated arm. Coordinates are in a 640 × 480 stage.
// Kept separate from the dot renderer so the pick/place choreography is testable.
(() => {
  const keys = [
    [0, 230, 150, 25], [1, 190, 245, 25], [2, 190, 310, 25],
    [2.5, 190, 310, 13], [3.4, 190, 220, 13], [4.8, 320, 220, 13],
    [5.7, 320, 310, 13], [6.2, 320, 310, 25], [7.2, 320, 220, 25],
    [8.5, 230, 150, 25], [9.2, 230, 150, 25]
  ];
  function pose(seconds) {
    const t = Math.max(0, Math.min(9.2, seconds));
    let i = 1;
    while (i < keys.length - 1 && keys[i][0] < t) i++;
    const a = keys[i - 1], b = keys[i];
    const u = (t - a[0]) / (b[0] - a[0]);
    const ease = u * u * (3 - 2 * u);
    const wrist = { x: a[1] + (b[1] - a[1]) * ease, y: a[2] + (b[2] - a[2]) * ease };
    const gap = a[3] + (b[3] - a[3]) * ease;
    const shoulder = { x: 425, y: 340 };
    const upper = 175, forearm = 215;
    const dx = wrist.x - shoulder.x, dy = wrist.y - shoulder.y;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) + Math.acos(Math.max(-1, Math.min(1,
      (upper * upper + distance * distance - forearm * forearm) / (2 * upper * distance))));
    const elbow = { x: shoulder.x + upper * Math.cos(angle), y: shoulder.y + upper * Math.sin(angle) };
    const held = t >= 2.5 && t < 5.7;
    const cube = held ? { x: wrist.x, y: wrist.y + 57 }
      : { x: t < 2.5 ? 190 : 320, y: 367 };
    return { wrist, shoulder, elbow, gap, cube, held };
  }
  function draw(c, seconds) {
    const p = pose(seconds);
    c.clearRect(0, 0, 640, 480);
    c.strokeStyle = '#fff'; c.fillStyle = '#000';
    c.lineWidth = 6; c.lineJoin = 'round'; c.lineCap = 'round';
    function shape(path) { const s = new Path2D(path); c.fill(s); c.stroke(s); }
    function seam(path) {
      c.save(); c.lineWidth = 4;
      c.stroke(new Path2D(path)); c.restore();
    }
    function joint(point, radius, rotation) {
      c.save(); c.translate(point.x, point.y); c.rotate(rotation);
      const shading = c.createRadialGradient(-radius * .3, -radius * .35, 2, 0, 0, radius * 1.2);
      shading.addColorStop(0, '#858585'); shading.addColorStop(.65, '#454545'); shading.addColorStop(1, '#121212');
      c.fillStyle = shading;
      // Rounded offset housing and a recessed side cover, seen in three-quarter view.
      c.beginPath(); c.ellipse(0, 0, radius * 1.15, radius, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      seam(`M${-radius * .45} ${-radius * .85} C${-radius * .9} ${-radius * .4} ${-radius * .85} ${radius * .6} ${-radius * .35} ${radius * .9}`);
      c.beginPath(); c.ellipse(radius * .35, 3, radius * .34, radius * .56, -.12, -.8, 2.5); c.stroke();
      c.beginPath(); c.arc(radius * .43, radius * .34, 2.5, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    function link(a, b, thickness) {
      const length = Math.hypot(b.x - a.x, b.y - a.y), r = thickness / 2;
      c.save(); c.translate(a.x, a.y); c.rotate(Math.atan2(b.y - a.y, b.x - a.x));
      const shading = c.createLinearGradient(0, -r, 0, r);
      shading.addColorStop(0, '#202020'); shading.addColorStop(.35, '#757575'); shading.addColorStop(.72, '#404040'); shading.addColorStop(1, '#111111');
      c.fillStyle = shading;
      // Sculpted shells: wide ends, a narrowed waist, and curved rather than straight edges.
      shape(`M0 ${-r} C${length * .2} ${-r * 1.35} ${length * .27} ${-r * .60} ${length * .51} ${-r * .64}
        C${length * .72} ${-r * .68} ${length * .81} ${-r * 1.22} ${length} ${-r * .85}
        Q${length + 15} 0 ${length} ${r * .85}
        C${length * .8} ${r * 1.2} ${length * .7} ${r * .76} ${length * .48} ${r * .70}
        C${length * .23} ${r * .60} ${length * .16} ${r * 1.30} 0 ${r} Q-15 0 0 ${-r} Z`);
      seam(`M${length * .73} ${-r * .83} Q${length * .67} 0 ${length * .74} ${r * .88}`);
      seam(`M${length * .22} ${r * .55} Q${length * .41} ${r * .35} ${length * .57} ${r * .44}`);
      c.restore();
    }
    // Flared base, black drive collar, and curved shoulder riser.
    shape('M380 420 L472 420 L480 434 L370 434 Z');
    shape('M390 418 Q400 396 401 377 L398 354 Q394 325 416 316 Q439 309 450 335 L449 378 Q451 401 463 419 Z');
    shape('M400 374 Q425 381 449 374 L450 391 Q425 398 398 390 Z');
    seam('M401 408 Q422 411 444 410 M406 401 L406 412 M445 400 L445 412');
    const shoulderRotation = Math.atan2(p.elbow.y - p.shoulder.y, p.elbow.x - p.shoulder.x);
    const elbowRotation = Math.atan2(p.wrist.y - p.elbow.y, p.wrist.x - p.elbow.x);
    link(p.shoulder, p.elbow, 48);
    link(p.elbow, p.wrist, 44);
    joint(p.shoulder, 29, shoulderRotation + .35);
    joint(p.elbow, 30, elbowRotation - .35);
    // Tilted motor shell, mounting flange, drive body, and contoured finger carriers.
    c.save(); c.translate(p.wrist.x, p.wrist.y);
    shape('M-18 -34 Q1 -41 19 -29 L23 -11 L17 17 Q0 24 -22 12 L-24 -4 Z');
    c.beginPath(); c.ellipse(0, -31, 17, 5, .16, 0, Math.PI * 2); c.stroke();
    seam('M-17 -22 L-19 2 Q-16 9 -10 10 M16 -19 L13 9');
    shape('M-17 14 L16 19 L15 27 L-18 23 Z');
    shape('M-14 26 L14 26 L18 34 L10 40 L-10 40 L-18 34 Z');
    for (const side of [-1, 1]) {
      c.save(); c.scale(side, 1);
      shape(`M${p.gap - 3} 33 L${p.gap + 5} 35 L${p.gap + 4} 55 L${p.gap - 2} 64 L${p.gap - 6} 62 L${p.gap - 2} 52 Z`);
      seam(`M${p.gap - 4} 60 L${p.gap - 4} 65`);
      c.restore();
    }
    c.restore();
    // The block follows the closed gripper only during transport.
    c.save(); c.translate(p.cube.x, p.cube.y);
    shape('M-11 -11 L11 -11 L11 11 L-11 11 Z');
    c.restore();
    // Two low landing pads keep the pick and place destinations readable.
    c.beginPath(); c.moveTo(163, 382); c.lineTo(217, 382);
    c.moveTo(293, 382); c.lineTo(347, 382); c.stroke();
    return p;
  }
  const api = { pose, draw, duration: 9.2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.DreamscaleRobot = api;
})();
