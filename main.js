/* ═══════════════════════════════════════════════════════════
   sanjay — main.js
   no dependencies. everything pauses when off-screen or hidden.
   ═══════════════════════════════════════════════════════════ */
(function () {
'use strict';

var GH_USER   = 'sanjayrv-dev';
var BUILD     = '2026.08.13';
var reduce    = matchMedia('(prefers-reduced-motion: reduce)').matches;
var fine      = matchMedia('(hover: hover) and (pointer: fine)').matches;
var DPR       = Math.min(devicePixelRatio || 1, 2);

var $  = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

/* Runs fn on rAF while the tab is visible. Pass an element to also pause when
   that element scrolls out of view; pass null for things pinned to the
   viewport, which are on screen by construction — gating those on an observer
   only risks them never waking back up. */
function liveLoop(el, fn) {
  var onScreen = !el, running = false;
  function tick() {
    if (!onScreen || document.hidden) { running = false; return; }
    fn();
    requestAnimationFrame(tick);
  }
  function wake() {
    if (!running && onScreen && !document.hidden) { running = true; requestAnimationFrame(tick); }
  }
  if (el) {
    new IntersectionObserver(function (es) {
      onScreen = es[0].isIntersecting;
      wake();
    }, { threshold: 0 }).observe(el);
  }
  document.addEventListener('visibilitychange', wake);
  return wake;
}

/* ─────────────────────────────────────────────
   build stamp + ticker
   ───────────────────────────────────────────── */
$('#build').textContent = 'build ' + BUILD;

var track = $('#tapeTrack');
track.innerHTML += track.innerHTML;          /* duplicate for a seamless -50% roll */

/* ─────────────────────────────────────────────
   typed lead line
   ───────────────────────────────────────────── */
(function () {
  var line = 'i build things to find out why they break.';
  var out  = $('#typeline');
  if (reduce) { out.textContent = line; return; }
  var i = 0;
  (function step() {
    out.innerHTML = line.slice(0, i) + '<span class="cursor"></span>';
    if (i++ <= line.length) setTimeout(step, 34);
  })();
})();

/* ─────────────────────────────────────────────
   ambient starfield
   ───────────────────────────────────────────── */
(function () {
  var cv = $('#stars'), g = cv.getContext('2d');
  var W = 0, H = 0, stars = [], warp = 0, lastY = scrollY;

  function seed() {
    var want = Math.round((W * H) / 6400), i;
    if (stars.length > want) stars.length = want;
    for (i = stars.length; i < want; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        z: Math.random(), tw: Math.random() * 6.28,
        warm: Math.random() < .16
      });
    }
    /* keep existing stars in bounds instead of reseeding (no resize flicker) */
    for (i = 0; i < stars.length; i++) {
      if (stars[i].x > W) stars[i].x = Math.random() * W;
      if (stars[i].y > H) stars[i].y = Math.random() * H;
    }
  }

  function size() {
    W = innerWidth; H = innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  function draw() {
    g.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.tw += .02;
      var a = (.3 + s.z * .5) * (.72 + Math.sin(s.tw) * .28);
      g.fillStyle = s.warm ? 'rgba(240,66,86,' + a + ')' : 'rgba(226,226,232,' + a + ')';
      if (warp > .6) g.fillRect(s.x, s.y, warp * s.z * 24, s.z * 1.1 + .3);
      else           g.fillRect(s.x, s.y, s.z * 1.4 + .35, s.z * 1.4 + .35);
      s.x -= .03 + s.z * .085;
      if (s.x < -30) { s.x = W + 10; s.y = Math.random() * H; }
    }
    warp *= .9;
  }

  size();
  addEventListener('resize', size);

  if (reduce) { draw(); return; }
  draw();                                    /* paint frame one immediately */
  var wake = liveLoop(null, draw);

  addEventListener('scroll', function () {
    warp = Math.min(3.2, warp + Math.abs(scrollY - lastY) * .035);
    lastY = scrollY;
    wake();
  }, { passive: true });
})();

/* ─────────────────────────────────────────────
   ambient lorenz attractor

   dx/dt = σ(y − x)
   dy/dt = x(ρ − z) − y
   dz/dt = xy − βz

   integrated live and traced across the whole viewport, slowly rotating.
   scroll nudges the rotation so the page and the pattern move together.
   ───────────────────────────────────────────── */
(function () {
  var cv = $('#lorenz'), g = cv.getContext('2d');
  var W = 0, H = 0, scale = 1;
  var x = .01, y = 0, z = 0;
  var trail = [], MAX = 21000;               /* 7000 points */
  var ang = 0, elev = .13, scrollAng = 0;

  function size() {
    W = innerWidth; H = innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    scale = Math.min(W, H) / 58;
  }

  function step() {
    var dt = .0042;
    for (var i = 0; i < 6; i++) {
      var dx = 10 * (y - x);
      var dy = x * (28 - z) - y;
      var dz = x * y - (8 / 3) * z;
      x += dx * dt; y += dy * dt; z += dz * dt;
      trail.push(x, y, z);
    }
    if (trail.length > MAX) trail.splice(0, trail.length - MAX);
  }

  function draw() {
    g.clearRect(0, 0, W, H);

    var a = ang + scrollAng;
    var ca = Math.cos(a),    sa = Math.sin(a);
    var ce = Math.cos(elev), se = Math.sin(elev);
    var cx = W / 2, cy = H * .48;
    var n = trail.length / 3, chunks = 14, per = Math.ceil(n / chunks);

    g.lineWidth = 1.1 * DPR;
    g.lineJoin = 'round';
    g.lineCap = 'round';

    /* oldest tail fades out, so the head reads as "now" */
    for (var c = 0; c < chunks; c++) {
      g.strokeStyle = 'rgba(230,52,74,' + (.05 + (c / (chunks - 1)) * .5).toFixed(3) + ')';
      g.beginPath();
      var from = c * per, to = Math.min(n, from + per + 1);
      for (var i = from; i < to; i++) {
        var px = trail[i * 3], py = trail[i * 3 + 1], pz = trail[i * 3 + 2] - 25;
        var rx = px * ca - py * sa;
        var ry = (px * sa + py * ca) * se + pz * ce;
        i === from ? g.moveTo(cx + rx * scale, cy - ry * scale)
                   : g.lineTo(cx + rx * scale, cy - ry * scale);
      }
      g.stroke();
    }

    /* the integrating head */
    var lx = trail[trail.length - 3], ly = trail[trail.length - 2], lz = trail[trail.length - 1] - 25;
    var hx = cx + (lx * ca - ly * sa) * scale;
    var hy = cy - ((lx * sa + ly * ca) * se + lz * ce) * scale;
    g.fillStyle = 'rgba(255,225,228,.9)';
    g.beginPath(); g.arc(hx, hy, 1.8 * DPR, 0, 6.284); g.fill();
  }

  size();
  addEventListener('resize', size);

  if (reduce) {
    /* no animation: integrate straight to a finished still */
    for (var k = 0; k < 1200; k++) step();
    draw();
    return;
  }

  for (var k2 = 0; k2 < 900; k2++) step();   /* start with a shape already on screen */
  draw();                                    /* ...and paint it before frame one */

  var wake = liveLoop(null, function () {
    step();
    ang += .0013;                            /* full turn, ~80s */
    draw();
  });

  addEventListener('scroll', function () {
    /* scrolling adds a little extra turn on top of the constant rotation */
    scrollAng = scrollY * .00028;
    wake();
  }, { passive: true });
})();

/* ─────────────────────────────────────────────
   hero: loss curve + dot matrix
   ───────────────────────────────────────────── */
(function () {
  /* a random walk with drift — an equity curve, drawn once and deterministic */
  function walk(el, drift, vol, seed) {
    var d = '', n = 48, rnd = seed, v = .18;
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      rnd = (rnd * 1103515245 + 12345) & 0x7fffffff;      /* deterministic LCG */
      v += drift + ((rnd / 0x7fffffff) - .5) * vol;
      d += (i ? 'L' : 'M') + (10 + t * 122).toFixed(1) + ' ' +
           (58 - clamp(v, 0, 1) * 50).toFixed(1) + ' ';
    }
    el.setAttribute('d', d.trim());
  }
  walk($('#eqPath'),  .0125, .055, 9127);   /* the strategy */
  walk($('#eqPath2'), .0040, .030, 4471);   /* the benchmark it has to beat */

  /* dot matrix blob */
  var mx = $('#matrix'), chars = ' ..:-=+*#%@', rows = 9, cols = 26, s = '';
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      var dx = (c / cols - .5) * 2.4, dy = (r / rows - .5) * 2.1;
      var v = Math.exp(-(dx * dx + dy * dy) * 1.5) + (Math.random() - .5) * .45;
      s += chars[clamp(Math.round(v * (chars.length - 1)), 0, chars.length - 1)];
    }
    s += '\n';
  }
  mx.textContent = s;
})();

/* ─────────────────────────────────────────────
   mouse parallax over the collage
   ───────────────────────────────────────────── */
(function () {
  if (reduce || !fine) return;
  var hero = $('#hero');
  var items = $$('.f', hero).map(function (el) {
    return { el: el, d: parseFloat(getComputedStyle(el).getPropertyValue('--d')) || .2 };
  });
  var tx = 0, ty = 0, cx = 0, cy = 0, wake;

  addEventListener('pointermove', function (e) {
    tx = e.clientX / innerWidth - .5;
    ty = e.clientY / innerHeight - .5;
    if (wake) wake();
  }, { passive: true });

  wake = liveLoop(hero, function () {
    cx += (tx - cx) * .07;
    cy += (ty - cy) * .07;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      it.el.style.setProperty('--px', (-cx * it.d * 58).toFixed(2) + 'px');
      it.el.style.setProperty('--py', (-cy * it.d * 42).toFixed(2) + 'px');
    }
  });
})();

/* ─────────────────────────────────────────────
   loadout — works on hover, focus and touch
   ───────────────────────────────────────────── */
(function () {
  var grid = $('#grid'), tip = $('#tip'), info = $('#slotinfo');
  var tiers = { 1: 'var(--text)', 2: 'var(--blue)', 3: 'var(--gold)' };
  var slots = $$('.slot[data-t]', grid);

  slots.forEach(function (s) {
    s.textContent = s.dataset.t;
    s.setAttribute('aria-expanded', 'false');
  });

  function describe(s) {
    return '<b>' + s.dataset.t + '</b> &mdash; ' + s.dataset.ty + '. ' +
           s.dataset.d + ' <i>' + s.dataset.fl + '</i>';
  }

  function select(s) {
    slots.forEach(function (o) { o.setAttribute('aria-expanded', o === s ? 'true' : 'false'); });
    info.innerHTML = s ? describe(s) : '';
  }

  function showTip(s, x, y) {
    if (!fine) return;
    tip.innerHTML =
      '<span class="t" style="color:' + (tiers[s.dataset.tier] || tiers[1]) + '">' + s.dataset.t + '</span>' +
      '<span class="ty">' + s.dataset.ty + '</span>' + s.dataset.d +
      '<span class="fl">' + s.dataset.fl + '</span>';
    tip.style.opacity = 1;
    tip.style.left = Math.min(x + 16, innerWidth  - 250) + 'px';
    tip.style.top  = Math.min(y + 16, innerHeight - 160) + 'px';
  }

  grid.addEventListener('pointermove', function (e) {
    var s = e.target.closest('.slot[data-t]');
    if (!s) { tip.style.opacity = 0; return; }
    showTip(s, e.clientX, e.clientY);
  });
  grid.addEventListener('pointerleave', function () { tip.style.opacity = 0; });

  slots.forEach(function (s) {
    s.addEventListener('click', function () { select(s); });
    s.addEventListener('focus', function () { select(s); });
  });

  /* seed the readout so the space isn't empty */
  info.innerHTML = describe(slots[0]);
  slots[0].setAttribute('aria-expanded', 'true');
})();

/* ─────────────────────────────────────────────
   github output — cached, fails quietly
   ───────────────────────────────────────────── */
(function () {
  var sec = $('#output'), KEY = 'gh:v2', TTL = 6 * 3600e3;
  var barsEl = $('#bars'), bars = [];

  for (var b = 0; b < 30; b++) {
    var d = document.createElement('div');
    d.className = 'bar'; d.style.height = '2px';
    barsEl.appendChild(d); bars.push(d);
  }

  function set(k, v) {
    $$('[data-live="' + k + '"]').forEach(function (n) { n.textContent = v; });
  }

  function paint(s) {
    /* the events API only sees ~90 days of PUBLIC pushes. a quiet stretch would
       render this section as a wall of zeroes, which reads worse than no
       section at all — so sit it out until there's something to show. */
    if (!s.commits) { sec.classList.add('is-error'); return; }

    set('repos', s.repos);
    set('commits', s.commits);
    set('streakdays', s.days);
    set('last', s.last);
    var vals = s.hist, peak = Math.max.apply(null, vals.concat([1]));
    bars.forEach(function (bar, i) {
      var n = vals[i] || 0;
      bar.style.height = (n ? Math.max(4, Math.round(n / peak * 32)) : 2) + 'px';
      bar.classList.toggle('on', !!n);
    });
    sec.classList.remove('is-loading');
  }

  function ago(ms) {
    var m = Math.round(ms / 60000);
    return m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago';
  }

  /* paint from cache first so the section is never empty on a rate-limited reload */
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (cached && cached.stats) paint(cached.stats);
  if (cached && Date.now() - cached.at < TTL) return;

  var api = 'https://api.github.com/users/' + GH_USER;
  Promise.all([
    fetch(api).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    fetch(api + '/events/public?per_page=100').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
  ]).then(function (res) {
    var user = res[0], ev = res[1];
    if (!user && !Array.isArray(ev)) {
      if (!cached) sec.classList.add('is-error');
      return;
    }

    var commits = 0, days = {}, last = null;
    var today = new Date(); today.setHours(0, 0, 0, 0);

    (Array.isArray(ev) ? ev : []).forEach(function (e) {
      if (e.type !== 'PushEvent') return;
      var n = (e.payload && e.payload.size) || 0;
      commits += n;
      var when = new Date(e.created_at);
      if (!last || when > last) last = when;
      var day = new Date(when); day.setHours(0, 0, 0, 0);
      var d = Math.round((today - day) / 86400000);
      if (d >= 0 && d < 30) days[d] = (days[d] || 0) + n;
    });

    var hist = [];
    for (var i = 29; i >= 0; i--) hist.push(days[i] || 0);

    var stats = {
      repos: user && typeof user.public_repos === 'number' ? user.public_repos : '—',
      commits: commits,
      days: Object.keys(days).length,
      last: last ? ago(Date.now() - last.getTime()) : 'quiet',
      hist: hist
    };

    paint(stats);
    try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), stats: stats })); } catch (e) {}
  });
})();

/* ─────────────────────────────────────────────
   ambient jazz — synthesised, not sampled

   there is no audio file. a I–vi–ii–V turnaround in C is scheduled through
   the Web Audio API: FM electric-piano voicings, an upright-ish bass, brushed
   noise on 2 and 4, convolution reverb from a generated impulse, and vinyl
   crackle over the top. never autoplays — browsers block it and so do I.
   ───────────────────────────────────────────── */
(function () {
  var btn = $('#audio');
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!btn) return;
  if (!AC) { btn.remove(); return; }

  var BPM = 66, BEAT = 60 / BPM;
  var LOOKAHEAD = 2.0;          /* schedule this far out, so a throttled */
  var TICK = 250;               /* background tab can't starve the loop   */

  /* rootless voicings — the bass takes the root, the way a pianist would */
  var CHANGES = [
    { root: 36, voice: [64, 67, 71, 74], top: [76, 79, 83] },   /* Cmaj9 */
    { root: 33, voice: [64, 67, 71, 72], top: [74, 79, 81] },   /* Am9   */
    { root: 38, voice: [65, 69, 72, 76], top: [77, 81, 84] },   /* Dm9   */
    { root: 31, voice: [65, 69, 71, 76], top: [74, 77, 81] }    /* G13   */
  ];

  var ctx, master, dry, send, crackleSrc, timer;
  var playing = false, stepN = 0, nextT = 0;

  var hz = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
  var pick = function (a) { return a[(Math.random() * a.length) | 0]; };

  /* exponential-decay noise burst = a serviceable small room */
  function impulse(sec, decay) {
    var n = Math.floor(ctx.sampleRate * sec);
    var buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < n; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
      }
    }
    return buf;
  }

  function noiseBuf(sec, fn) {
    var n = Math.floor(ctx.sampleRate * sec);
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = fn();
    return buf;
  }

  function build() {
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0;

    /* gentle low-pass + a shelf cut: the "old recording" half of vintage */
    var warm = ctx.createBiquadFilter();
    warm.type = 'lowpass'; warm.frequency.value = 3200; warm.Q.value = .4;

    var cut = ctx.createBiquadFilter();
    cut.type = 'highpass'; cut.frequency.value = 90;

    master.connect(warm); warm.connect(cut); cut.connect(ctx.destination);

    dry = ctx.createGain(); dry.gain.value = .72;
    dry.connect(master);

    var verb = ctx.createConvolver();
    verb.buffer = impulse(2.8, 2.4);
    send = ctx.createGain(); send.gain.value = .42;
    send.connect(verb); verb.connect(master);

    /* vinyl crackle: mostly silence, occasional pop */
    crackleSrc = ctx.createBufferSource();
    crackleSrc.buffer = noiseBuf(5, function () {
      return Math.random() < .0007 ? (Math.random() * 2 - 1) * .55
                                   : (Math.random() * 2 - 1) * .004;
    });
    crackleSrc.loop = true;
    var chp = ctx.createBiquadFilter();
    chp.type = 'highpass'; chp.frequency.value = 1400;
    var cg = ctx.createGain(); cg.gain.value = .5;
    crackleSrc.connect(chp); chp.connect(cg); cg.connect(master);
    crackleSrc.start();
  }

  function out(node) { node.connect(dry); node.connect(send); }

  /* 2-operator FM — bright bell attack settling into a sine. rhodes-ish. */
  function keys(midi, t, dur, gain) {
    var f = hz(midi);
    var car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = f;
    var mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = f * 2;
    var mg = ctx.createGain();
    mg.gain.setValueAtTime(f * 1.9, t);
    mg.gain.exponentialRampToValueAtTime(f * .02, t + .45);
    mod.connect(mg); mg.connect(car.frequency);

    var g = ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + .015);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);

    car.connect(g); out(g);
    car.start(t); mod.start(t);
    car.stop(t + dur + .05); mod.stop(t + dur + .05);
  }

  function bass(midi, t, dur) {
    var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(midi);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420;
    var g = ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(.3, t + .03);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(lp); lp.connect(g); out(g);
    o.start(t); o.stop(t + dur + .05);
  }

  function brush(t) {
    var s = ctx.createBufferSource();
    s.buffer = noiseBuf(.35, function () { return Math.random() * 2 - 1; });
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 6200; bp.Q.value = .7;
    var g = ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(.05, t + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t + .3);
    s.connect(bp); bp.connect(g); out(g);
    s.start(t); s.stop(t + .35);
  }

  function playStep(i, t) {
    var ch = CHANGES[(i >> 2) % CHANGES.length];
    var beat = i & 3;

    if (beat === 0) {
      /* spread the voicing slightly — nobody hits four keys at once */
      for (var v = 0; v < ch.voice.length; v++) {
        keys(ch.voice[v], t + v * .022 + Math.random() * .012, BEAT * 3.6, .085);
      }
      bass(ch.root, t, BEAT * 1.7);
    }
    if (beat === 2) bass(ch.root + 7, t, BEAT * 1.4);
    if (beat === 1 || beat === 3) brush(t + (beat === 3 ? BEAT * .06 : 0));

    /* a sparse wandering top line, always a chord tone so it can't clash */
    if (beat !== 0 && Math.random() < .22) {
      keys(pick(ch.top), t + Math.random() * .1, BEAT * 2.2, .05);
    }
  }

  function schedule() {
    while (nextT < ctx.currentTime + LOOKAHEAD) {
      playStep(stepN, nextT);
      nextT += BEAT;
      stepN++;
    }
  }

  function start() {
    if (!ctx) build();
    ctx.resume();
    nextT = ctx.currentTime + .12;
    schedule();
    timer = setInterval(schedule, TICK);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(.5, ctx.currentTime + 1.4);
    playing = true;
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', 'Stop ambient jazz');
  }

  function stop() {
    clearInterval(timer);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(.0001, ctx.currentTime + .7);
    /* let the tail ring out, then park the context so it costs nothing */
    setTimeout(function () { if (!playing) ctx.suspend(); }, 900);
    playing = false;
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Play ambient jazz');
  }

  btn.addEventListener('click', function () { playing ? stop() : start(); });
})();

/* for whoever opens devtools */
console.log('%csanjay', 'font:600 22px ui-monospace,monospace;color:#F04256');
console.log('%cno framework, no build step, ~17kb gzipped.\n' +
            'the attractor is integrated live, not a video.\n' +
            'the jazz is synthesised, not a file.\n' +
            'source: github.com/' + GH_USER,
            'font:12px ui-monospace,monospace;color:#8B8B96');

})();
