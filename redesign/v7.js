/* v7 landing motion layer — 2026-09-03 (v7.2).
 * 1) Spectral arena: a pseudo-3D ring of glass bars that breathes between the raw AI
 *    spectrum (spiky, low-mid bulge, harsh top) and the mastered curve. Mounted twice:
 *    hero (#v7-stage, with HUD chip + scroll parallax) and the closing CTA (#v7-stage2).
 *    Pure 2D canvas — no library, no cross-origin script (COEP require-corp safe).
 * 2) Engine-spec ticker (proof bar) — clones the existing stats into a marquee.
 * 3) Magnetic CTA buttons on fine pointers.
 * Respects prefers-reduced-motion; each arena pauses when off-screen.
 */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- spectral arena ---------------- */
  function mountArena(canvas, o) {
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var N = 108, raw = [], mastered = [], seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    for (var i = 0; i < N; i++) {
      var f = i / N;
      var lowMid = Math.exp(-Math.pow((f - 0.22) / 0.12, 2)) * 0.55;
      var harsh  = Math.exp(-Math.pow((f - 0.80) / 0.10, 2)) * 0.45;
      raw.push(Math.max(0.08, Math.min(1, 0.32 + lowMid + harsh + (rnd() - 0.5) * 0.36)));
      mastered.push(Math.max(0.1, Math.min(0.92, 0.62 - f * 0.22 + Math.exp(-Math.pow((f - 0.62) / 0.16, 2)) * 0.12 + (rnd() - 0.5) * 0.05)));
    }
    var cur = mastered.slice(), t0 = performance.now(), mx = 0, my = 0, active = true, dpr = 1, W = 0, H = 0;
    var label = o.label || null, lastState = '';

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize); resize();
    window.addEventListener('pointermove', function (e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 2; my = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { active = en[0].isIntersecting; }, { threshold: 0.02 }).observe(canvas);
    }
    function setState(s) {
      if (!label || s === lastState) return;
      lastState = s;
      var ko = document.documentElement.lang === 'ko';
      label.textContent = s === 'raw' ? (ko ? '원본 · AI 출력' : 'RAW · AI OUTPUT') : (ko ? '마스터 · Anti-AI Master' : 'MASTERED · ANTI-AI MASTER');
      label.classList.toggle('is-raw', s === 'raw');
    }
    if (label) new MutationObserver(function () { var s = lastState; lastState = ''; setState(s || 'mastered'); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
    function rr(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2); ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fill();
    }
    function draw(now) {
      if (!reduced) requestAnimationFrame(draw);
      if (!active && !reduced) return;
      var t = (now - t0) / 1000, cycle = 9, ph = (t % cycle) / cycle, m;
      if (reduced) m = 1; else if (ph < 0.18) m = 0; else if (ph < 0.42) m = ease((ph - 0.18) / 0.24); else if (ph < 0.76) m = 1; else m = 1 - ease((ph - 0.76) / 0.24);
      setState(m < 0.5 ? 'raw' : 'mastered');
      var dim = o.dim || 1;
      ctx.clearRect(0, 0, W, H);
      var cx = W * o.cx, cy = H * o.cy;
      var rx = Math.min(W * o.rx, H * 0.62), ry = rx * o.ryK;
      var rot = (reduced ? 0 : t * 0.10) + mx * 0.35, tilt = 1 + my * 0.12, barH = Math.min(W, H) * 0.40;
      var g = ctx.createRadialGradient(cx, cy + ry * 0.2, 0, cx, cy + ry * 0.2, rx * 1.4);
      g.addColorStop(0, 'rgba(212,166,74,' + (0.10 + 0.06 * m) * dim + ')'); g.addColorStop(0.5, 'rgba(77,208,214,' + (0.05 * m * dim) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.045 * dim) + ')'; ctx.lineWidth = 1;
      for (var L = 1; L <= 4; L++) { var k2 = 1 + L * 0.28; ctx.beginPath(); ctx.ellipse(cx, cy + 2 + L * 3, rx * k2, ry * tilt * k2, 0, 0, Math.PI * 2); ctx.stroke(); }
      for (var d0 = 0; d0 < 46; d0++) {
        var px = cx + Math.cos(d0 * 2.399 + t * 0.05) * rx * (0.3 + (d0 % 7) * 0.16);
        var py = cy - (d0 % 9) * (H * 0.04) - Math.sin(t * 0.7 + d0) * 6 + ry * 0.2;
        ctx.fillStyle = 'rgba(233,191,106,' + (0.12 + (d0 % 3) * 0.08) * dim + ')'; ctx.fillRect(px, py, 1.5, 1.5);
      }
      var order = [];
      for (var i = 0; i < N; i++) { var a = (i / N) * Math.PI * 2 + rot; order.push({ i: i, a: a, z: Math.sin(a) }); }
      order.sort(function (p, q) { return p.z - q.z; });
      var lvl = 0.9 + Math.sin(t * 2.1) * 0.05 + Math.sin(t * 3.7) * 0.03;
      for (var k = 0; k < N; k++) {
        var oo = order[k], ii = oo.i;
        var target = raw[ii] * (1 - m) + mastered[ii] * m;
        cur[ii] += (target - cur[ii]) * 0.12;
        var v = cur[ii] * lvl, x = cx + Math.cos(oo.a) * rx, y = cy + Math.sin(oo.a) * ry * tilt;
        var depth = (oo.z + 1) / 2, w = 3.6 + depth * 4.2, h = v * barH * (0.55 + depth * 0.45);
        var alpha = (0.22 + depth * 0.7) * dim, top = y - h, hot = (1 - m) * Math.max(0, v - 0.72) * 3;
        var grad = ctx.createLinearGradient(0, top, 0, y);
        grad.addColorStop(0, 'rgba(' + (hot > 0.3 ? '255,122,92' : '123,224,229') + ',' + (alpha * (0.55 + 0.45 * m + hot)) + ')');
        grad.addColorStop(0.55, 'rgba(233,191,106,' + (alpha * 0.85) + ')'); grad.addColorStop(1, 'rgba(212,166,74,' + (alpha * 0.35) + ')');
        ctx.fillStyle = grad; rr(x - w / 2, top, w, h, w / 2);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.10 * depth * dim) + ')'; ctx.fillRect(x - w / 2 + 0.6, top + 1, Math.max(1, w * 0.28), Math.max(2, h - 2));
        if (depth > 0.35) { var rg = ctx.createLinearGradient(0, y, 0, y + h * 0.35); rg.addColorStop(0, 'rgba(233,191,106,' + (alpha * 0.16) + ')'); rg.addColorStop(1, 'rgba(233,191,106,0)'); ctx.fillStyle = rg; rr(x - w / 2, y + 2, w, h * 0.35, w / 2); }
      }
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.08 * dim) + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy + 2, rx + 8, ry * tilt + 4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(212,166,74,' + (0.10 + 0.12 * m) * dim + ')';
      ctx.beginPath(); ctx.ellipse(cx, cy + 2, rx * 0.62, ry * tilt * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
    }
    requestAnimationFrame(draw);
    if (o.parallax && !reduced) {
      var visual = canvas.parentElement;
      window.addEventListener('scroll', function () {
        var y = window.scrollY; visual.style.transform = 'translateY(' + (y * 0.18) + 'px)'; visual.style.opacity = Math.max(0, 1 - y / 900);
      }, { passive: true });
    }
  }
  mountArena(document.getElementById('v7-stage'),  { label: document.getElementById('v7-state'), dim: 1,    parallax: true,  cx: 0.54, cy: 0.60, rx: 0.46, ryK: 0.30 });
  mountArena(document.getElementById('v7-stage2'), { label: null,                                  dim: 0.8,  parallax: false, cx: 0.50, cy: 0.66, rx: 0.42, ryK: 0.26 });

  /* ---------------- engine-spec ticker (proof bar) ---------------- */
  var stats = document.querySelector('.proof-bar .proof-stats');
  if (stats && !reduced && stats.children.length) {
    var track = document.createElement('div'); track.className = 'v7-ticker';
    while (stats.firstChild) track.appendChild(stats.firstChild);
    var origs = Array.prototype.slice.call(track.children);
    // two visual copies for the loop. They carry no data-i18n (so the page's translator only ever
    // sees the originals) and are re-synced from the originals whenever the language changes.
    var copies = [];
    for (var c = 0; c < 2; c++) {
      var div = document.createElement('span'); div.className = 'proof-divider'; track.appendChild(div);
      origs.forEach(function (el) { var k = el.cloneNode(true); k.querySelectorAll('[data-i18n]').forEach(function (e) { e.removeAttribute('data-i18n'); }); k.removeAttribute('data-i18n'); track.appendChild(k); copies.push({ src: el, dst: k }); });
    }
    function sync() { copies.forEach(function (pair) { pair.dst.innerHTML = pair.src.innerHTML; pair.dst.querySelectorAll('[data-i18n]').forEach(function (e) { e.removeAttribute('data-i18n'); }); }); }
    setTimeout(sync, 400);
    new MutationObserver(function () { setTimeout(sync, 120); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    stats.appendChild(track); stats.classList.add('v7-marquee');
  }

  /* ---------------- magnetic buttons (fine pointers only) ---------------- */
  if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var mags = document.querySelectorAll('.hero-cta-row .btn-gold, .hero-cta-row .btn-ghost, .nav-studio, .cta-bottom .btn-gold');
    Array.prototype.forEach.call(mags, function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        b.style.transform = 'translate(' + (x * 0.16) + 'px,' + (y * 0.26) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }
})();
