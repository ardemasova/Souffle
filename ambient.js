/* Souffle — ambient sea layer
 * Runs on its own clock, independent of scrolling:
 *   - near the surface: swaying light rays + rising bubbles
 *   - mid-water: drifting particles ("marine snow")
 *   - deep: particles glow teal like plankton
 * Reads the current depth (0…1) from window.__souffleDepth, set by main.js.
 * Scrolling nudges the particles upward, which adds to the feeling of descent.
 */
(() => {
  const canvas = document.getElementById("ambient");
  if (!canvas) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) { canvas.remove(); return; }

  const ctx = canvas.getContext("2d");
  const section = document.querySelector(".descent");
  let w = 0, h = 0, dpr = 1;
  const mobile = () => window.innerWidth < 760;

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

  let bubbles = [], motes = [], rays = [];

  function build() {
    const k = mobile() ? 0.55 : 1;
    bubbles = Array.from({ length: Math.round(34 * k) }, () => newBubble(true));
    motes = Array.from({ length: Math.round(110 * k) }, () => ({
      x: Math.random(), y: Math.random(),
      r: rand(0.6, 2.2), vx: rand(-0.004, 0.004), vy: rand(-0.006, 0.004),
      ph: rand(0, Math.PI * 2), tw: rand(0.6, 1.6),
    }));
    rays = Array.from({ length: 6 }, (_, i) => ({
      x: 0.08 + i * 0.15 + rand(-0.04, 0.04), wid: rand(0.04, 0.11),
      ph: rand(0, Math.PI * 2), sp: rand(0.15, 0.35), a: rand(0.05, 0.12),
    }));
  }

  function newBubble(anywhere) {
    return {
      x: Math.random(), y: anywhere ? Math.random() : rand(1.02, 1.2),
      r: rand(1.5, 5.5), v: rand(0.04, 0.11), wob: rand(0, Math.PI * 2), ws: rand(1, 2.4),
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  let last = performance.now();
  let lastScroll = window.scrollY;
  let running = true;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    const depth = clamp(window.__souffleDepth ?? 0);

    // scroll nudge: content moves up as you dive down
    const dy = window.scrollY - lastScroll;
    lastScroll = window.scrollY;
    const nudge = clamp(dy / Math.max(h, 1), -0.05, 0.05) * 0.6;

    ctx.clearRect(0, 0, w, h);

    /* light rays — strong at the surface, gone by ~15 m */
    const rayA = clamp(1 - depth / 0.38);
    if (rayA > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (const r of rays) {
        const sway = Math.sin(t * r.sp + r.ph) * 0.035;
        const pulse = 0.65 + 0.35 * Math.sin(t * r.sp * 2.3 + r.ph);
        const topX = (r.x + sway) * w, botX = topX + w * 0.16;
        const half = r.wid * w * 0.5;
        const g = ctx.createLinearGradient(0, 0, 0, h * 0.85);
        g.addColorStop(0, `rgba(210,240,255,${r.a * pulse * rayA})`);
        g.addColorStop(1, "rgba(210,240,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(topX - half * 0.4, 0); ctx.lineTo(topX + half * 0.4, 0);
        ctx.lineTo(botX + half * 1.6, h * 0.85); ctx.lineTo(botX - half * 1.6, h * 0.85);
        ctx.closePath(); ctx.fill();
      }
      // surface glints
      for (let i = 0; i < 14; i++) {
        const gx = ((i * 0.137 + Math.sin(t * 0.3 + i) * 0.03) % 1) * w;
        const gy = (0.01 + 0.05 * ((i * 0.61) % 1)) * h;
        const a = Math.max(0, Math.sin(t * (1.4 + i * 0.13) + i * 2.1)) * 0.5 * rayA;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath(); ctx.ellipse(gx, gy, 14 + (i % 4) * 6, 1.6, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    /* bubbles — plenty near the surface, a few deeper down */
    const bubA = 0.25 + 0.75 * clamp(1 - depth / 0.6);
    for (const b of bubbles) {
      b.y -= (b.v * dt) + nudge * 1.5;
      b.wob += dt * b.ws;
      if (b.y < -0.05) Object.assign(b, newBubble(false));
      if (b.y > 1.25) b.y = rand(-0.05, 0);
      const x = (b.x + Math.sin(b.wob) * 0.006) * w, y = b.y * h;
      const g = ctx.createRadialGradient(x - b.r * 0.35, y - b.r * 0.35, 0, x, y, b.r);
      g.addColorStop(0, `rgba(255,255,255,${0.85 * bubA})`);
      g.addColorStop(0.55, `rgba(220,240,255,${0.18 * bubA})`);
      g.addColorStop(1, `rgba(220,240,255,${0.45 * bubA})`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, b.r, 0, Math.PI * 2); ctx.fill();
    }

    /* drifting particles — pale near the top, glowing teal in the deep */
    const glow = clamp((depth - 0.55) / 0.35);
    const moteA = 0.25 + 0.35 * clamp(depth / 0.3);
    for (const m of motes) {
      m.x += m.vx * dt; m.y += m.vy * dt - nudge;
      if (m.x < -0.02) m.x = 1.02; if (m.x > 1.02) m.x = -0.02;
      if (m.y < -0.02) m.y = 1.02; if (m.y > 1.02) m.y = -0.02;
      const tw = 0.55 + 0.45 * Math.sin(t * m.tw + m.ph);
      const x = m.x * w, y = m.y * h;
      if (glow > 0.01 && m.r > 1.3) {
        const R = m.r * 5;
        const g = ctx.createRadialGradient(x, y, 0, x, y, R);
        g.addColorStop(0, `rgba(95,242,216,${0.55 * glow * tw})`);
        g.addColorStop(1, "rgba(95,242,216,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
      }
      const c = glow > 0.5 ? "170,255,240" : "220,235,255";
      ctx.fillStyle = `rgba(${c},${moteA * tw})`;
      ctx.beginPath(); ctx.arc(x, y, m.r * 0.8, 0, Math.PI * 2); ctx.fill();
    }

    if (running) requestAnimationFrame(frame);
  }

  // pause when the descent is off screen or the tab is hidden
  function setRunning(on) {
    if (on && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    running = on;
  }
  new IntersectionObserver(([e]) => setRunning(e.isIntersecting && !document.hidden)).observe(section);
  document.addEventListener("visibilitychange", () => setRunning(!document.hidden));

  window.addEventListener("resize", () => { resize(); build(); });
  resize(); build();
  requestAnimationFrame(frame);
})();
