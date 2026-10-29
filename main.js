/* Souffle — scroll-driven descent
 * Frames live in /frames as f_0001.webp … f_0466.webp.
 * To use another video: change FRAME_COUNT (and FRAME_PATH if needed).
 */
(() => {
  const FRAME_COUNT = 466;
  const FRAME_PATH = (i) => `frames/f_${String(i + 1).padStart(4, "0")}.webp`;
  const MAX_DEPTH = 40;          // metres shown on the gauge
  const FOCUS_X = 0.62;          // where the diver sits horizontally in the video (0…1)

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const section = document.querySelector(".descent");
  const canvas = document.getElementById("sea");
  const ctx = canvas.getContext("2d");
  const stations = [...document.querySelectorAll(".station")];
  const depthEl = document.getElementById("depth");
  const fill = document.querySelector(".gauge__fill");
  const readout = document.querySelector(".gauge__readout");
  const hint = document.querySelector(".hint");
  const bar = document.querySelector(".bar");
  const loader = document.querySelector(".loader");
  const loadbar = document.getElementById("loadbar");

  /* ---------- Loading: coarse frames first, then fill the gaps ---------- */
  const frames = new Array(FRAME_COUNT);
  const order = [];
  const seen = new Set();
  for (const step of [32, 16, 8, 4, 2, 1]) {
    for (let i = 0; i < FRAME_COUNT; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
  }
  let loaded = 0;
  let cursor = 0;
  const PARALLEL = 6;

  function loadNext() {
    if (cursor >= order.length) return;
    const i = order[cursor++];
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      frames[i] = img;
      loaded++;
      loadbar.style.width = `${(loaded / FRAME_COUNT) * 100}%`;
      if (loaded === FRAME_COUNT) loader.classList.add("is-done");
      if (i === 0 || Math.abs(i - targetFrame) < 8) needsDraw = true;
      loadNext();
    };
    img.onerror = loadNext;
    img.src = FRAME_PATH(i);
  }
  for (let k = 0; k < PARALLEL; k++) loadNext();

  // nearest frame that has already loaded
  function nearestLoaded(i) {
    if (frames[i]) return frames[i];
    for (let d = 1; d < FRAME_COUNT; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  }

  /* ---------- Canvas sizing & drawing (object-fit: cover with focus point) ---------- */
  let cw = 0, ch = 0;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = canvas.clientWidth; ch = canvas.clientHeight;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingQuality = "high";
    needsDraw = true;
  }

  function draw(img) {
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = cw / ch;
    let w, h;
    if (cr > ir) { w = cw; h = cw / ir; } else { h = ch; w = ch * ir; }
    // keep the diver in view on narrow screens
    let x = cr < 1 ? cw / 2 - w * FOCUS_X : (cw - w) / 2;
    x = Math.min(0, Math.max(cw - w, x));
    const y = (ch - h) / 2;
    ctx.drawImage(img, x, y, w, h);
  }

  /* ---------- Scroll → progress ---------- */
  function progress() {
    const rect = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    return Math.min(1, Math.max(0, -rect.top / total));
  }

  let current = 0;          // smoothed progress
  let targetFrame = 0;
  let lastFrame = -1;
  let needsDraw = true;

  function fade(p, from, to) {
    const edge = 0.035; // fade length in progress units
    if (p < from || p > to) return 0;
    const fin = from <= 0 ? 1 : Math.min(1, (p - from) / edge);
    const fout = to >= 1 ? 1 : Math.min(1, (to - p) / edge);
    return Math.min(fin, fout);
  }

  function update(p) {
    targetFrame = Math.min(FRAME_COUNT - 1, Math.round(p * (FRAME_COUNT - 1)));
    if (targetFrame !== lastFrame || needsDraw) {
      const img = nearestLoaded(targetFrame);
      if (img) { draw(img); lastFrame = targetFrame; needsDraw = false; }
    }

    window.__souffleDepth = p; // read by ambient.js
    const metres = p * MAX_DEPTH;
    depthEl.textContent = Math.round(metres);
    fill.style.transform = `scaleY(${p})`;
    readout.style.top = `${p * 100}%`;

    for (const s of stations) {
      const o = fade(p, parseFloat(s.dataset.from), parseFloat(s.dataset.to));
      s.style.opacity = o;
      s.style.visibility = o > 0.01 ? "visible" : "hidden";
      if (!reduceMotion && window.innerWidth > 760) {
        s.style.transform = `translateY(calc(-50% + ${(1 - o) * 24}px))`;
      }
    }

    hint.style.opacity = p > 0.02 ? 0 : 1;
  }

  function tick() {
    const target = progress();
    // gentle easing toward the scroll position; instant if reduced motion
    current = reduceMotion ? target : current + (target - current) * 0.14;
    if (Math.abs(target - current) < 0.0004) current = target;
    update(current);
    bar.classList.toggle("is-solid", window.scrollY > section.offsetHeight - window.innerHeight - 10);
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(tick);
})();
