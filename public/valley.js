(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rng = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

  // ---------- pixel sprites ----------
  function drawMap(ctx, map, pal, x, y, flip = false) {
    const w = map[0].length;
    map.forEach((row, j) => {
      for (let i = 0; i < w; i++) {
        const c = pal[row[i]];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x + (flip ? w - 1 - i : i), y + j, 1, 1);
      }
    });
  }
  function mapURL(map, pal) {
    const c = document.createElement('canvas');
    c.width = map[0].length;
    c.height = map.length;
    drawMap(c.getContext('2d'), map, pal, 0, 0);
    return c.toDataURL();
  }

  const WIZ = {
    h: '#7b4bc4', H: '#4e2c8a', s: '#ffd84a', n: '#6b3e1f', f: '#f4c49c', F: '#d99a73',
    e: '#2b1a10', r: '#3f6fd6', R: '#2b4d9a', g: '#9aa3b5', c: '#7ef0ff', k: '#5a3416',
  };
  const WIZ_TOP = [
    '.....hh.....',
    '....hhhH....',
    '...hhshhH...',
    '...hhhhhH...',
    '.HHHHHHHHHH.',
    '..nffffffn..',
    '..ffeffeff..',
    '..fffFFfff..',
    '...ffffff...',
    '..rrrrrrrr..',
    '.rrrggggrrr.',
    '.frrgccgrrf.',
    '..rrggggrr..',
    '..RrrrrrrR..',
  ];
  const LEGS = [
    ['..RR....RR..', '..kk....kk..'],
    ['...RR..RR...', '...kk..kk...'],
  ];

  const ICONS = {
    star: [['....yy....', '....yy....', '...yyyy...', 'yyyyYyyyyy', '.yyyyyyyy.', '..yyyyyy..', '..yyyyyy..', '.yyy..yyy.', '.yy....yy.', '..........'],
      { y: '#ffc93a', Y: '#fff2a8' }],
    scroll: [['.tttttttt.', 'TTTTTTTTTT', '.tllllllt.', '.tttttttt.', '.tllllllt.', '.tttttttt.', '.tlllllt..', '.tttttttt.', 'TTTTTTTTTT', '.tttttttt.'],
      { t: '#fff0cf', T: '#b97a3a', l: '#a8501a' }],
    gem: [['..........', '...cccc...', '..cCCCCc..', '.cCwCCCCc.', 'cCCCCCCCCc', '.cCCCCCCc.', '..cCCCCc..', '...cCCc...', '....cc....', '..........'],
      { c: '#2a7fa8', C: '#5fd0f0', w: '#ffffff' }],
    heart: [['..........', '.rrr..rrr.', 'rrwrrrrrrr', 'rrrrrrrrrr', 'rrrrrrrrrr', '.rrrrrrrr.', '..rrrrrr..', '...rrrr...', '....rr....', '..........'],
      { r: '#e03c4c', w: '#ffc0c8' }],
    letter: [['..........', 'eeeeeeeeee', 'eEeeeeeeEe', 'eeEeeeeEee', 'eeeEeeEeee', 'eeeeEEeeee', 'eeeeeeeeee', 'eeeeeeeeee', 'eeeeeeeeee', '..........'],
      { e: '#fff0cf', E: '#b97a3a' }],
    coin: [['..yyyy..', '.yYYYYy.', 'yYyyyyYy', 'yYyYYyYy', 'yYyYYyYy', 'yYyyyyYy', '.yYYYYy.', '..yyyy..'],
      { y: '#c98a1a', Y: '#ffd84a' }],
  };
  const HEART_EMPTY = { r: '#c9a27a', w: '#c9a27a' };

  // ---------- time & season ----------
  const q = new URLSearchParams(location.search);
  const SEASONS = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'fall', 'fall', 'fall', 'winter'];
  let hour, season, night, dusk;
  function readClock() {
    const d = new Date();
    hour = q.has('hour') ? +q.get('hour') : d.getHours() + d.getMinutes() / 60;
    season = q.get('season') || SEASONS[d.getMonth()];
    night = hour < 5 || hour >= 20;
    dusk = !night && (hour < 6.5 || hour >= 18);
    $('#day').textContent = d.toLocaleDateString('en-US', { weekday: 'short' }) + '. ' + d.getDate();
    $('#season').textContent = season[0].toUpperCase() + season.slice(1);
    $('#time').textContent = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  }

  const PAL = {
    spring: { grass: '#6cc04a', grass2: '#58a83c', hill: '#8fd666', hill2: '#5fae46', tree: '#3f8f3a', tree2: '#f5a3c7', fx: ['#ffc6e0', '#ffffff'] },
    summer: { grass: '#5cb33f', grass2: '#4a9a33', hill: '#7ccc55', hill2: '#4f9e3b', tree: '#2f7d32', tree2: '#58b04a', fx: null },
    fall:   { grass: '#b8a43c', grass2: '#9c8a30', hill: '#d9a04a', hill2: '#a8662c', tree: '#c4552a', tree2: '#f0b03a', fx: ['#e0702a', '#c4452a', '#f0b03a'] },
    winter: { grass: '#eef3f8', grass2: '#d5e0ec', hill: '#f4f8fc', hill2: '#cfdbe8', tree: '#2f5a4a', tree2: '#ffffff', fx: ['#ffffff'] },
  };
  const SKY = {
    day: ['#4aa8e8', '#bfe8ff'],
    dusk: ['#4a3f8f', '#ffb36b'],
    night: ['#0b1238', '#2a3470'],
  };
  const mix = (a, b, t) => {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [p(a), p(b)];
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };

  // ---------- scene ----------
  const canvas = $('#scene');
  const ctx = canvas.getContext('2d');
  const skyL = document.createElement('canvas');
  const fgL = document.createElement('canvas');
  const dyn = document.createElement('canvas');
  const dctx = dyn.getContext('2d');

  let W, H, hy, walkY, house, plants, stars, clouds, wiz, smoke = [], fx = [], tick = 0;

  function layout() {
    const r = canvas.getBoundingClientRect();
    const P = Math.max(3, Math.round(r.height / 100));
    W = Math.ceil(r.width / P);
    H = Math.ceil(r.height / P);
    for (const c of [canvas, skyL, fgL, dyn]) { c.width = W; c.height = H; }
    hy = Math.round(H * 0.5);
    walkY = hy + Math.round((H - hy) * 0.38);
    house = { x: Math.max(3, Math.round(W * 0.05)), w: 47, base: walkY - 2 };
    if (!wiz) wiz = { x: house.x + house.w + 6, dir: 1, pause: 40, vy: 0, z: 0 };
    wiz.min = house.x + house.w + 2;
    wiz.max = W - 14;
    wiz.x = Math.min(Math.max(wiz.x, wiz.min), wiz.max);
    build();
  }

  function build() {
    const pal = PAL[season];
    const rand = rng(7);
    const sky = skyL.getContext('2d');
    const [top, bottom] = SKY[night ? 'night' : dusk ? 'dusk' : 'day'];

    // banded sky
    const bands = 7;
    for (let b = 0; b < bands; b++) {
      sky.fillStyle = mix(top, bottom, b / (bands - 1));
      const y0 = Math.floor(b * hy / bands);
      sky.fillRect(0, y0, W, Math.ceil(hy / bands) + 1);
    }
    sky.fillStyle = bottom;
    sky.fillRect(0, hy, W, H - hy);

    // sun or moon travelling with the real clock
    const t = night ? ((hour + 4) % 24) / 9 : Math.min(1, Math.max(0, (hour - 5) / 15));
    const sx = Math.round(8 + t * (W - 16));
    const sy = Math.round(hy - 8 - Math.sin(t * Math.PI) * (hy - 16));
    disc(sky, sx, sy, 4, night ? '#f4f1d0' : dusk ? '#ff9a4a' : '#ffe066');
    if (night) { sky.fillStyle = '#d8d3a8'; sky.fillRect(sx - 1, sy - 1, 2, 1); sky.fillRect(sx + 1, sy + 1, 1, 1); }
    else { sky.fillStyle = dusk ? '#ffc48a' : '#fff6c0'; sky.fillRect(sx - 2, sy - 2, 2, 2); }

    stars = night ? Array.from({ length: Math.round(W / 3) }, () => ({ x: rand() * W | 0, y: rand() * (hy - 6) | 0, p: rand() * 6 })) : [];
    clouds = Array.from({ length: Math.max(3, Math.round(W / 45)) }, () => ({
      x: rand() * W, y: 3 + rand() * (hy - 22) | 0, w: 10 + rand() * 12 | 0, v: .03 + rand() * .05,
    }));

    // foreground: hills, trees, ground, path, house, fence
    const g = fgL.getContext('2d');
    g.clearRect(0, 0, W, H);
    const back = x => hy - 9 - 4 * Math.sin(x * .07 + 1) - 3 * Math.sin(x * .023);
    const front = x => hy - 2 - 2 * Math.sin(x * .05 + 2) - 1.5 * Math.sin(x * .11);
    for (let x = 0; x < W; x++) { const y = Math.round(back(x)); g.fillStyle = pal.hill2; g.fillRect(x, y, 1, H - y); }
    for (let x = 2; x < W; x += 6 + (rand() * 6 | 0)) tree(g, x, Math.round(back(x)) - 1, pal);
    for (let x = 0; x < W; x++) { const y = Math.round(front(x)); g.fillStyle = pal.hill; g.fillRect(x, y, 1, H - y); }

    g.fillStyle = pal.grass;
    g.fillRect(0, hy + 1, W, H - hy);
    for (let i = 0; i < W * (H - hy) / 10; i++) {
      g.fillStyle = rand() < .85 ? pal.grass2 : season === 'winter' ? '#ffffff' : ['#ffd84a', '#ff7ab0', '#ffffff'][rand() * 3 | 0];
      g.fillRect(rand() * W | 0, hy + 2 + (rand() * (H - hy) | 0), 1, 1);
    }

    // dirt path
    const dirt = season === 'winter' ? '#d9cbb8' : '#c99a5b';
    g.fillStyle = dirt;
    g.fillRect(0, walkY - 1, W, 4);
    g.fillStyle = mix(dirt, '#000000', .18);
    for (let i = 0; i < W / 3; i++) g.fillRect(rand() * W | 0, walkY - 1 + (rand() * 4 | 0), 1, 1);

    // fence along the back of the path
    const fy = walkY - 7;
    g.fillStyle = '#8a5a2b';
    for (let x = house.x + house.w + 4; x < W - 1; x += 4) g.fillRect(x, fy, 1, 5);
    g.fillStyle = '#a8703a';
    g.fillRect(house.x + house.w + 4, fy + 1, W, 1);
    g.fillRect(house.x + house.w + 4, fy + 3, W, 1);

    drawHouse(g);

    // tomato beds below the path
    plants = [];
    const bedTop = walkY + 5;
    for (let y = bedTop; y + 7 <= H - 1; y += 9) {
      for (let x = house.x + 2; x + 7 <= W - 2; x += 10) {
        g.fillStyle = '#7a4a24'; g.fillRect(x, y + 3, 7, 4);
        g.fillStyle = '#5e3518'; g.fillRect(x, y + 6, 7, 1);
        g.fillStyle = '#8f5a2e'; g.fillRect(x + 1, y + 3, 5, 1);
        if (season === 'winter') { g.fillStyle = '#ffffff'; g.fillRect(x, y + 3, 7, 1); }
        else plants.push({ x: x + 3, y: y + 3, p: rand() * 6 });
      }
    }

    // night: bake a blue tint into the static foreground
    if (night || dusk) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = night ? 'rgba(14,24,70,.55)' : 'rgba(120,60,40,.18)';
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    }
  }

  function disc(c, cx, cy, r, color) {
    c.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(r * r - y * y));
      c.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  }

  function tree(g, x, y, pal) {
    g.fillStyle = '#6b3e1f';
    g.fillRect(x + 2, y - 2, 1, 3);
    const rows = [[1, 3], [0, 5], [0, 5], [0, 5], [1, 3]];
    rows.forEach(([o, w], i) => { g.fillStyle = pal.tree; g.fillRect(x + o, y - 7 + i, w, 1); });
    g.fillStyle = pal.tree2;
    g.fillRect(x + 1, y - 6, 1, 1);
    g.fillRect(x + 3, y - 5, 1, 1);
    if (season === 'winter') g.fillRect(x + 1, y - 7, 3, 1);
  }

  // modern one-storey house: white walls, low hip roofs, timber accents, garage
  function drawHouse(g) {
    const { x: X, base: B } = house;
    const rect = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(X + x, B + y, w, h); };
    const snow = season === 'winter';

    // hip roofs: a long ridge, sloped ends; the visible end slope is shaded
    // so it reads as four-sided. The main roof also covers the entrance.
    const hip = (x0, x1, y0, rows, endLeft, endRight, sideAt) => {
      for (let r = 0; r < rows; r++) {
        const k = (rows - 1 - r) * 1.6;
        const L = Math.round(x0 + (endLeft ? k : 0));
        const R = Math.round(x1 - (endRight ? k : 0));
        const side = Math.round(r * .55) + 1;
        rect(r % 2 ? '#6a3e30' : '#7a4a3a', L, y0 + r, R - L + 1, 1);
        rect('#4f2c22', sideAt === 'left' ? L : R - side + 1, y0 + r, side, 1);
        if (snow && r < 2) rect('#ffffff', L + (sideAt === 'left' ? side : 0), y0 + r, R - L + 1 - side, 1);
      }
    };
    hip(26, 48, -17, 6, false, true, 'right');
    hip(-3, 29, -19, 8, true, true, 'left');
    rect('#3d2018', -3, -12, 33, 1);
    rect('#3d2018', 30, -12, 19, 1);

    // chimneys on the ridges
    rect('#8a7a70', 11, -22, 3, 4); rect('#5e504b', 10, -22, 5, 1);
    rect('#8a7a70', 38, -19, 3, 3); rect('#5e504b', 37, -19, 5, 1);

    // timber fascia under the eaves
    rect('#b0703e', -2, -11, 50, 1);

    // living wing
    rect('#f2f0ea', 0, -10, 21, 10);
    rect('#a8a8a2', 0, -1, 21, 1);
    rect('#8a8a88', 0, -10, 1, 9);
    rect('#8a8a88', 20, -10, 1, 9);
    rect('#4a3020', 3, -8, 8, 6);
    rect('#c8c6c0', 11, -8, 3, 6);
    rect('#4a3020', 14, -8, 4, 6);

    // recessed entrance with wood cladding and a climbing plant
    rect('#9a5a30', 22, -10, 7, 10);
    for (const i of [23, 25, 27]) rect('#7e4822', i, -10, 1, 10);
    rect('#4a2a14', 24, -7, 2, 7);
    rect('#b0703e', 21, -10, 8, 1);
    for (let y = -9; y < 0; y++) rect(y % 2 ? '#3f7a2f' : '#5a9a3f', 21, y, 1, 1);
    rect('#5a9a3f', 20, -6, 1, 1); rect('#3f7a2f', 20, -3, 1, 2);

    // dark panel with wall lights, then the garage
    rect('#f2f0ea', 29, -10, 18, 10);
    rect('#5f6268', 29, -8, 8, 8);
    rect('#e8e8e0', 31, -6, 1, 1); rect('#e8e8e0', 34, -6, 1, 1);
    rect('#c8c6c0', 37, -8, 1, 8);
    rect('#a0602e', 38, -7, 8, 7);
    for (let y = -6; y < 0; y += 2) rect('#7e4822', 38, y, 8, 1);
    rect('#c8c6c0', 46, -10, 1, 10);

    // round shrubs by the garage
    for (const [x, c] of [[40, '#3f7a2f'], [44, '#4a8a35']]) {
      disc(g, X + x, B - 1, 2, c);
      g.fillStyle = snow ? '#ffffff' : '#6aaa4a';
      g.fillRect(X + x - 1, B - 3, 2, 1);
    }
  }

  function drawWindow() {
    const { x: X, base: B } = house;
    ctx.fillStyle = night ? '#ffd86b' : dusk ? '#ffc48a' : '#9fd8ff';
    ctx.fillRect(X + 4, B - 7, 6, 4);
    ctx.fillRect(X + 15, B - 7, 2, 4);
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(X + 7, B - 7, 1, 4);
    if (night) {
      ctx.fillStyle = 'rgba(255,216,107,.22)';
      ctx.fillRect(X + 2, B - 9, 17, 8);
      ctx.fillStyle = '#ffe9a0';
      ctx.fillRect(X + 31, B - 6, 1, 1);
      ctx.fillRect(X + 34, B - 6, 1, 1);
    }
  }

  function cloud(c, { x, y, w }) {
    const shade = night ? '#3a4680' : dusk ? '#ffd2b0' : '#ffffff';
    const under = night ? '#2c3666' : dusk ? '#e0a0a0' : '#d8ecf8';
    x = Math.round(x);
    c.fillStyle = shade;
    c.fillRect(x + 3, y, w - 7, 1);
    c.fillRect(x + 1, y + 1, w - 2, 2);
    c.fillRect(x, y + 3, w, 1);
    c.fillStyle = under;
    c.fillRect(x + 1, y + 4, w - 2, 1);
  }

  function drawPlant(c, { x, y, p }) {
    const sway = Math.round(Math.sin(tick / 12 + p) * .6);
    c.fillStyle = '#3f8f3a';
    c.fillRect(x, y - 3, 1, 3);
    c.fillRect(x - 1 + sway, y - 4, 3, 1);
    c.fillStyle = '#5fbf4a';
    c.fillRect(x - 1 + sway, y - 5, 1, 1);
    c.fillRect(x + 1 + sway, y - 5, 1, 1);
    if (season !== 'spring') {
      c.fillStyle = '#e8402a';
      c.fillRect(x - 1, y - 2, 1, 1);
      c.fillRect(x + 1 + sway, y - 3, 1, 1);
    }
  }

  function drawWizard(c) {
    const moving = wiz.pause <= 0;
    const step = moving ? (tick >> 3) & 1 : 0;
    const y = walkY - 14 - Math.round(wiz.z) - (moving && step ? 1 : 0);
    const x = Math.round(wiz.x);
    c.fillStyle = 'rgba(0,0,0,.18)';
    c.fillRect(x + 2, walkY + 2, 8, 1);
    drawMap(c, WIZ_TOP, WIZ, x, y, wiz.dir < 0);
    drawMap(c, LEGS[step], WIZ, x, y + 14, wiz.dir < 0);
  }

  function update() {
    // wizard wanders, pauses, sometimes turns around
    if (wiz.pause > 0) wiz.pause--;
    else {
      wiz.x += wiz.dir * .35;
      if (wiz.x <= wiz.min || wiz.x >= wiz.max) { wiz.dir *= -1; wiz.pause = 30; }
      else if (Math.random() < .006) { wiz.pause = 40 + Math.random() * 80; if (Math.random() < .5) wiz.dir *= -1; }
    }
    if (wiz.z > 0 || wiz.vy) { wiz.z += wiz.vy; wiz.vy -= .25; if (wiz.z <= 0) { wiz.z = 0; wiz.vy = 0; } }

    for (const cl of clouds) { cl.x += cl.v; if (cl.x > W + 2) cl.x = -cl.w - 2; }

    // chimney smoke
    if (tick % 14 === 0) smoke.push({ x: house.x + 12, y: house.base - 23, life: 60 });
    smoke = smoke.filter(s => (s.y -= .15, s.x += .06, --s.life > 0));

    // seasonal particles
    const pal = PAL[season];
    const want = season === 'summer' ? (night ? 12 : 0) : Math.round(W / 6);
    if (fx.length < want && Math.random() < .3) {
      fx.push(season === 'summer'
        ? { x: Math.random() * W, y: hy + Math.random() * (H - hy), vx: 0, vy: 0, p: Math.random() * 6, c: '#fff27a', fly: true }
        : { x: Math.random() * W, y: -2, vx: .1 + Math.random() * .2, vy: .15 + Math.random() * .25, p: Math.random() * 6, c: pal.fx[Math.random() * pal.fx.length | 0] });
    }
    fx = fx.filter(f => {
      if (f.fly) { f.x += Math.sin(tick / 20 + f.p) * .2; f.y += Math.cos(tick / 25 + f.p) * .15; return true; }
      f.x += f.vx + Math.sin(tick / 15 + f.p) * .15;
      f.y += f.vy;
      return f.y < H && f.x < W + 2;
    });
  }

  function render() {
    ctx.drawImage(skyL, 0, 0);
    for (const s of stars) {
      ctx.fillStyle = Math.sin(tick / 10 + s.p) > .3 ? '#ffffff' : '#8890c0';
      ctx.fillRect(s.x, s.y, 1, 1);
    }
    for (const cl of clouds) cloud(ctx, cl);
    ctx.drawImage(fgL, 0, 0);

    dctx.clearRect(0, 0, W, H);
    plants.forEach(p => drawPlant(dctx, p));
    for (const s of smoke) { dctx.fillStyle = `rgba(200,200,200,${s.life / 90})`; dctx.fillRect(Math.round(s.x), Math.round(s.y), s.life > 30 ? 2 : 1, 1); }
    drawWizard(dctx);
    for (const f of fx) {
      if (f.fly && Math.sin(tick / 8 + f.p) < 0) continue;
      dctx.fillStyle = f.c;
      dctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
    }
    if (night || dusk) {
      dctx.globalCompositeOperation = 'source-atop';
      dctx.fillStyle = night ? 'rgba(14,24,70,.5)' : 'rgba(120,60,40,.15)';
      dctx.fillRect(0, 0, W, H);
      dctx.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(dyn, 0, 0);
    drawWindow();
  }

  let raf = 0, last = 0, visible = true;
  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (t - last < 33) return;
    last = t;
    tick++;
    update();
    render();
  }
  function start() { if (!raf && visible && !document.hidden && !reduced) raf = requestAnimationFrame(loop); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layout(); render(); }, 120); });

  // ---------- dialog ----------
  const dlg = $('#dialog');
  const dtext = $('#dtext');
  let queue = [], typeId = 0, full = '';

  async function type(s) {
    const id = ++typeId;
    full = s;
    dlg.classList.remove('done');
    dtext.textContent = '';
    if (!reduced) {
      for (const ch of s) {
        if (id !== typeId) return;
        dtext.textContent += ch;
        await sleep(24);
      }
    }
    if (id === typeId) { dtext.textContent = s; dlg.classList.add('done'); }
  }
  function say(lines) { queue = [].concat(lines); dlg.classList.add('open'); next(); }
  function next() {
    if (!queue.length) { dlg.classList.remove('open'); typeId++; return; }
    type(queue.shift());
  }
  dlg.addEventListener('click', () => {
    if (!dlg.classList.contains('done')) { typeId++; dtext.textContent = full; dlg.classList.add('done'); }
    else next();
  });

  const INTRO = [
    'Hey there! Welcome to my farm — computerwizard.dev.',
    'I\'m Aliaksiej, a Senior Software Engineer. I grow backends in Go and PHP — 14+ seasons and counting.',
    'Open the menu below to see my skills, quests, and the products I\'ve shipped.',
  ];
  const QUIPS = [
    'My tomatoes report their own soil moisture — VeggieVision, Elixir + Nerves on a Pi Zero 2W.',
    'Let it crash! — every Erlang farmer, ever.',
    'I taught the Nerves examples to run on a Raspberry Pi Zero 2 W. PR #603, merged!',
    'Check the Items tab: that\'s where all the products I\'ve shipped live.',
    'My Telegram bots are written in Go. They never sleep, unlike me.',
    'Fun fact: I once simulated an air defense system in C++ and OpenGL.',
    'Python is my watering can: small scripts, big ✨magic✨.',
    'Need a backend? Drop a letter in the Mail tab!',
    'Hop! …that\'s all the cardio I get.',
  ];
  let quip = Math.random() * QUIPS.length | 0;
  canvas.addEventListener('click', () => {
    if (!wiz.z) wiz.vy = 1.6;
    if (reduced) render();
    say(QUIPS[quip++ % QUIPS.length]);
  });

  // ---------- menu ----------
  for (const img of $$('img[data-icon]')) {
    const [map, pal] = ICONS[img.dataset.icon];
    img.src = mapURL(map, pal);
  }
  const root = document.documentElement.style;
  root.setProperty('--heart-full', `url(${mapURL(...ICONS.heart)})`);
  root.setProperty('--heart-empty', `url(${mapURL(ICONS.heart[0], HEART_EMPTY)})`);

  for (const s of $$('.skill')) {
    const lvl = +s.dataset.level;
    s.querySelector('.pips').innerHTML = Array.from({ length: 10 }, (_, i) =>
      `<i class="pip${i < lvl ? ' f' : ''}" style="--i:${i}"></i>`).join('');
  }
  for (const h of $$('.hearts')) {
    const n = +h.dataset.h;
    h.setAttribute('aria-label', `${n} of 10 hearts`);
    h.innerHTML = Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? 'on' : ''}" style="--i:${i}"></i>`).join('');
  }

  const tabs = $$('[role=tab]');
  const pages = $$('.page');
  function show(id, remember = true) {
    tabs.forEach(t => t.setAttribute('aria-selected', t.dataset.tab === id));
    pages.forEach(p => {
      const on = p.id === id;
      p.hidden = !on;
      if (!on) return;
      p.classList.remove('enter');
      void p.offsetWidth;
      p.classList.add('enter');
    });
    const sk = $('.skills');
    sk.classList.remove('on');
    if (id === 'skills') requestAnimationFrame(() => requestAnimationFrame(() => sk.classList.add('on')));
    for (const h of $$(`#${id} .hearts i.on`)) { h.style.animation = 'none'; void h.offsetWidth; h.style.animation = ''; }
    if (!remember) return;
    try { localStorage.setItem('valley-tab', id); } catch {}
    history.replaceState(null, '', '#' + id);
  }
  tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.tab)));
  addEventListener('hashchange', () => { const id = location.hash.slice(1); if (pages.some(p => p.id === id)) show(id); });

  // arrow keys move between tabs
  $('.tabs').addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0 || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    n.focus();
    show(n.dataset.tab);
  });

  // collection: inspect an item
  const items = $$('.item');
  function inspect(btn) {
    items.forEach(b => b.setAttribute('aria-pressed', b === btn));
    const d = $('#detail');
    d.hidden = false;
    $('#d-img').src = btn.querySelector('img').src;
    $('#d-name').textContent = btn.querySelector('span').textContent;
    $('#d-tag').textContent = 'Chrome extension · ' + btn.dataset.tag;
    $('#d-desc').textContent = btn.dataset.desc;
    $('#d-url').href = btn.dataset.url;
    d.style.animation = 'none'; void d.offsetWidth; d.style.animation = '';
  }
  items.forEach(b => b.addEventListener('click', () => inspect(b)));
  inspect(items[0]);

  // ---------- go ----------
  $('#year').textContent = new Date().getFullYear();
  readClock();
  layout();
  render();
  start();
  setInterval(() => {
    const was = `${season}${night}${dusk}`;
    readClock();
    if (`${season}${night}${dusk}` !== was || !night) { build(); render(); }
  }, 60000);

  // portrait for the dialog box
  drawMap($('#portrait').getContext('2d'), WIZ_TOP.slice(0, 10), WIZ, 0, 0);

  // a #tab link wins over the remembered tab
  let tab = location.hash.slice(1);
  if (!pages.some(p => p.id === tab)) {
    try { tab = localStorage.getItem('valley-tab'); } catch {}
  }
  show(pages.some(p => p.id === tab) ? tab : 'skills', false);

  setTimeout(() => say(INTRO), reduced ? 0 : 900);
})();
