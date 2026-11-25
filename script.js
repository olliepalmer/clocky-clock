/* ---------- typefaces, grouped by style ---------- */
// Every name here has an entry in glyphs.js (see tools/extract-glyphs.mjs).
var STYLES = {
  mono: { label: 'Mono', fonts: [
    'Cousine', 'B612 Mono', 'Fira Code', 'Cutive Mono', 'Oxygen Mono', 'Overpass Mono',
    'VT323', 'Space Mono', 'Fira Mono', 'Anonymous Pro', 'IBM Plex Mono', 'Share Tech Mono',
    'PT Mono', 'Nanum Gothic Coding', 'Roboto Mono', 'Inconsolata', 'Source Code Pro', 'Ubuntu Mono'
  ]},
  serif: { label: 'Serif', fonts: [
    'Libre Baskerville', 'Playfair Display', 'Cormorant Garamond', 'Lora', 'DM Serif Display',
    'Abril Fatface', 'Bodoni Moda', 'Cinzel', 'Old Standard TT', 'Prata'
  ]},
  sans: { label: 'Sans', fonts: [
    'Montserrat', 'Oswald', 'Poppins', 'Raleway', 'Bebas Neue',
    'Josefin Sans', 'Quicksand', 'Work Sans', 'Barlow Condensed'
  ]},
  chunky: { label: 'Chunky', fonts: [
    'Alfa Slab One', 'Bevan', 'Chango', 'Titan One', 'Bungee', 'Rubik Mono One',
    'Black Ops One', 'Anton', 'Archivo Black', 'Bowlby One', 'Luckiest Guy', 'Paytone One'
  ]},
  script: { label: 'Script', fonts: [
    'Birthstone', 'Ephesis', 'Pacifico', 'Lobster', 'Dancing Script',
    'Great Vibes', 'Sacramento', 'Satisfy', 'Caveat'
  ]},
  weird: { label: 'Weird', fonts: [
    'Monoton', 'Major Mono Display', 'Orbitron', 'Press Start 2P', 'Special Elite', 'Righteous', 'Unica One'
  ]}
};

// colour choices: hue passed to randomColor (undefined = anything)
var COLOURS = [
  { id: 'rainbow', label: 'Rainbow', hue: undefined, swatch: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' },
  { id: 'red',     label: 'Red',     hue: 'red',     swatch: '#ff4d4d' },
  { id: 'orange',  label: 'Orange',  hue: 'orange',  swatch: '#ff9f40' },
  { id: 'yellow',  label: 'Yellow',  hue: 'yellow',  swatch: '#ffe14d' },
  { id: 'green',   label: 'Green',   hue: 'green',   swatch: '#4dff88' },
  { id: 'blue',    label: 'Blue',    hue: 'blue',    swatch: '#4da6ff' },
  { id: 'purple',  label: 'Purple',  hue: 'purple',  swatch: '#b54dff' },
  { id: 'pink',    label: 'Pink',    hue: 'pink',    swatch: '#ff4dc4' },
  { id: 'mono',    label: 'Mono',    hue: 'monochrome', swatch: 'linear-gradient(135deg, #fff 50%, #333 50%)' }
];

/* ---------- state ---------- */
// how overlapping characters mix (id -> canvas globalCompositeOperation)
var BLENDS = [
  { id: 'normal',     label: 'Solid',      op: 'source-over' },
  { id: 'screen',     label: 'Screen',     op: 'screen' },
  { id: 'plus-lighter', label: 'Add',      op: 'lighter' },
  { id: 'difference', label: 'Difference', op: 'difference' },
  { id: 'exclusion',  label: 'Exclusion',  op: 'exclusion' },
  { id: 'overlay',    label: 'Overlay',    op: 'overlay' }
];
// size is a multiplier on the fit-to-screen size, spacing a multiplier on the gap between characters
var SLIDERS = {
  size:    { min: 0.2, max: 1.6, step: 0.01 },
  spacing: { min: 0.1, max: 1.6, step: 0.01 },
  // speeds are slider positions 0..1 on a log scale (see jitterInterval / bgPeriod)
  jitter:  { min: 0, max: 1, step: 0.005 },
  bg:      { min: 0, max: 1, step: 0.005 },
  // how much of each jitter step is spent morphing (0 = snap, 1 = always moving)
  morph:   { min: 0, max: 1, step: 0.01 }
};

// ready-made looks (jitter / bg are slider positions: jitter 0 = 1/s, 0.481 = 10/s; bg 0 = 1/min, 1 = 1/s)
var PRESETS = [
  { id: 'blue-steel',  label: 'Blue Steel',    settings: { style: 'chunky', colour: 'blue',   size: 1.5,  spacing: 0.6,  jitter: 0,     morph: 0.46, bg: 0,     blend: 'overlay' } },
  { id: 'green',       label: 'Smell of Green', settings: { style: 'all',    colour: 'green',  size: 1,    spacing: 0.84, jitter: 0,     morph: 1,    bg: 0.831, blend: 'overlay' } },
  { id: 'orange',      label: 'Orange Flame',  settings: { style: 'chunky', colour: 'orange', size: 0.87, spacing: 0.75, jitter: 0.481, morph: 0,    bg: 1,     blend: 'difference' } },
  { id: 'yellow',      label: 'Animated Yellow', settings: { style: 'all',  colour: 'yellow', size: 1.1,  spacing: 0.8,  jitter: 0.35,  morph: 1,    bg: 0.9,   blend: 'exclusion' } }
];

var settings = { vary: false };
Object.keys(PRESETS[0].settings).forEach(function (k) { settings[k] = PRESETS[0].settings[k]; });   // first visit: Blue Steel
try {
  var saved = JSON.parse(localStorage.getItem('clocky-clock-morph') || '{}');
  if (saved.style === 'all' || STYLES[saved.style]) settings.style = saved.style;
  if (COLOURS.some(function (c) { return c.id === saved.colour; })) settings.colour = saved.colour;
  if (BLENDS.some(function (b) { return b.id === saved.blend; })) settings.blend = saved.blend;
  if (typeof saved.vary === 'boolean') settings.vary = saved.vary;
  ['size', 'spacing', 'jitter', 'bg', 'morph'].forEach(function (k) {
    var v = Number(saved[k]);
    if (saved[k] != null && isFinite(v) && v >= SLIDERS[k].min && v <= SLIDERS[k].max) settings[k] = v;
  });
} catch (e) {}

function save() {
  try { localStorage.setItem('clocky-clock-morph', JSON.stringify(settings)); } catch (e) {}
}

var canvas = document.getElementById('stage');
var ctx = canvas.getContext('2d');

// the 8 characters of "hh:mm:ss"
var chars = ['', '', ':', '', '', ':', '', ''];
var NCELLS = 8;
function isSep(i) { return i === 2 || i === 5; }

/* ======================================================================
   Glyph shapes
   Every contour of every glyph is turned into exactly M cubic Bezier
   segments (by splitting the longest ones), with outer contours wound one
   way and holes the other. Two shapes can then be morphed just by
   interpolating their control points.
   ====================================================================== */
var M = 64;
var glyphCache = {};

function segLen(s) {
  var chord = Math.hypot(s[6] - s[0], s[7] - s[1]);
  var poly = Math.hypot(s[2] - s[0], s[3] - s[1]) + Math.hypot(s[4] - s[2], s[5] - s[3]) + Math.hypot(s[6] - s[4], s[7] - s[5]);
  return (2 * chord + poly) / 3;
}

function splitSeg(s) {   // de Casteljau at t = 0.5
  var x01 = (s[0] + s[2]) / 2, y01 = (s[1] + s[3]) / 2;
  var x12 = (s[2] + s[4]) / 2, y12 = (s[3] + s[5]) / 2;
  var x23 = (s[4] + s[6]) / 2, y23 = (s[5] + s[7]) / 2;
  var xa = (x01 + x12) / 2, ya = (y01 + y12) / 2;
  var xb = (x12 + x23) / 2, yb = (y12 + y23) / 2;
  var xm = (xa + xb) / 2, ym = (ya + yb) / 2;
  return [[s[0], s[1], x01, y01, xa, ya, xm, ym], [xm, ym, xb, yb, x23, y23, s[6], s[7]]];
}

// TrueType quadratic outline (flat list from glyphs.js) -> cubic segments [x0,y0,c1x,c1y,c2x,c2y,x1,y1]
function contourToSegments(flat) {
  var n = flat.length / 2, P = [], i;
  for (i = 0; i < n; i++) P.push({ x: flat[2 * i] / 1000, y: (flat[2 * i + 1] >> 1) / 1000, on: flat[2 * i + 1] & 1 });
  var Q = [];
  for (i = 0; i < n; i++) {
    var a = P[i], b = P[(i + 1) % n];
    Q.push(a);
    if (!a.on && !b.on) Q.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: 1 });
  }
  var s = -1;
  for (i = 0; i < Q.length; i++) if (Q[i].on) { s = i; break; }
  if (s < 0) {
    Q.unshift({ x: (Q[0].x + Q[Q.length - 1].x) / 2, y: (Q[0].y + Q[Q.length - 1].y) / 2, on: 1 });
    s = 0;
  }
  var m = Q.length, segs = [];
  i = 0;
  while (i < m) {
    var p0 = Q[(s + i) % m], p1 = Q[(s + i + 1) % m], seg;
    if (p1.on) {
      seg = [p0.x, p0.y, p0.x + (p1.x - p0.x) / 3, p0.y + (p1.y - p0.y) / 3, p0.x + 2 * (p1.x - p0.x) / 3, p0.y + 2 * (p1.y - p0.y) / 3, p1.x, p1.y];
      i += 1;
    } else {
      var p2 = Q[(s + i + 2) % m];
      seg = [p0.x, p0.y,
             p0.x + 2 * (p1.x - p0.x) / 3, p0.y + 2 * (p1.y - p0.y) / 3,
             p2.x + 2 * (p1.x - p2.x) / 3, p2.y + 2 * (p1.y - p2.y) / 3,
             p2.x, p2.y];
      i += 2;
    }
    if (segLen(seg) > 1e-5) segs.push(seg);
  }
  return segs;
}

// exactly M segments: split the longest until we get there (or, for very detailed
// contours, resample to M smooth segments)
function toExactlyM(segs) {
  var i;
  if (segs.length <= M) {
    while (segs.length < M) {
      var best = 0, bl = -1;
      for (i = 0; i < segs.length; i++) { var l = segLen(segs[i]); if (l > bl) { bl = l; best = i; } }
      var halves = splitSeg(segs[best]);
      segs.splice(best, 1, halves[0], halves[1]);
    }
    return segs;
  }
  // too detailed: sample the outline finely, then rebuild as M smooth cubics
  var pts = [], cum = [0], STEPS = 8;
  segs.forEach(function (s) {
    for (var k = 0; k < STEPS; k++) {
      var t = k / STEPS, u = 1 - t;
      pts.push([u * u * u * s[0] + 3 * u * u * t * s[2] + 3 * u * t * t * s[4] + t * t * t * s[6],
                u * u * u * s[1] + 3 * u * u * t * s[3] + 3 * u * t * t * s[5] + t * t * t * s[7]]);
    }
  });
  for (i = 1; i <= pts.length; i++) {
    var a = pts[i - 1], b = pts[i % pts.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  var total = cum[pts.length], samples = [], j = 0;
  for (i = 0; i < M; i++) {
    var d = total * i / M;
    while (j < pts.length - 1 && cum[j + 1] < d) j++;
    var p = pts[j], q = pts[(j + 1) % pts.length], span = cum[j + 1] - cum[j] || 1, f = (d - cum[j]) / span;
    samples.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]);
  }
  var out = [];
  for (i = 0; i < M; i++) {
    var P0 = samples[(i + M - 1) % M], P1 = samples[i], P2 = samples[(i + 1) % M], P3 = samples[(i + 2) % M];
    out.push([P1[0], P1[1],
              P1[0] + (P2[0] - P0[0]) / 6, P1[1] + (P2[1] - P0[1]) / 6,
              P2[0] - (P3[0] - P1[0]) / 6, P2[1] - (P3[1] - P1[1]) / 6,
              P2[0], P2[1]]);
  }
  return out;
}

// pack segments as Float32Array [p0x,p0y,c1x,c1y,c2x,c2y] * M (each segment ends where the next begins)
function packSegs(segs) {
  var a = new Float32Array(6 * M);
  for (var i = 0; i < M; i++) for (var k = 0; k < 6; k++) a[6 * i + k] = segs[i][k];
  return a;
}

function reverseContour(a) {
  var out = new Float32Array(6 * M);
  for (var j = 0; j < M; j++) {
    var k = M - 1 - j, nx = (k + 1) % M;
    out[6 * j]     = a[6 * nx];     out[6 * j + 1] = a[6 * nx + 1];   // starts where seg k ended
    out[6 * j + 2] = a[6 * k + 4];  out[6 * j + 3] = a[6 * k + 5];    // handles swap
    out[6 * j + 4] = a[6 * k + 2];  out[6 * j + 5] = a[6 * k + 3];
  }
  return out;
}

// signed area / centroid from the anchor points
function describe(c) {
  var a = c.a, area = 0, sx = 0, sy = 0;
  for (var j = 0; j < M; j++) {
    var n = (j + 1) % M;
    area += a[6 * j] * a[6 * n + 1] - a[6 * n] * a[6 * j + 1];
    sx += a[6 * j]; sy += a[6 * j + 1];
  }
  c.area = area / 2;
  c.absArea = Math.abs(c.area);
  c.cx = sx / M;
  c.cy = sy / M;
  return c;
}

function getGlyph(font, ch) {
  var key = font + '|' + ch;
  if (glyphCache[key]) return glyphCache[key];
  var data = window.GLYPHS && window.GLYPHS[font] && window.GLYPHS[font][ch];
  if (!data) return null;
  var contours = [];
  data[1].forEach(function (flat) {
    var segs = contourToSegments(flat);
    if (segs.length < 2) return;
    contours.push(describe({ a: packSegs(toExactlyM(segs)) }));
  });
  // the biggest contour is an outer one; contours wound the opposite way are holes
  var outerSign = 1, biggest = -1;
  contours.forEach(function (c) { if (c.absArea > biggest) { biggest = c.absArea; outerSign = c.area < 0 ? -1 : 1; } });
  contours.forEach(function (c) {
    c.outer = (c.area < 0 ? -1 : 1) === outerSign;
    if (c.outer ? c.area < 0 : c.area > 0) { c.a = reverseContour(c.a); describe(c); }   // outers +, holes -
  });
  return (glyphCache[key] = { w: data[0] / 1000, contours: contours });
}

/* ======================================================================
   Morphing
   ====================================================================== */
function collapsed(c) {
  var out = new Float32Array(6 * M);
  for (var k = 0; k < 3 * M; k++) { out[2 * k] = c.cx; out[2 * k + 1] = c.cy; }
  return out;
}

// the rotation of `to` (in whole segments) that lines up best with `from`, plus how good it is
function shiftCost(from, to, s) {
  var d = 0;
  for (var i = 0; i < M; i++) {
    var j = (i + s) % M;
    var dx = from[6 * i] - to[6 * j], dy = from[6 * i + 1] - to[6 * j + 1];
    d += dx * dx + dy * dy;
  }
  return d;
}

function bestShift(from, to) {
  var best = 0, bestD = Infinity;
  for (var s = 0; s < M; s++) {
    var d = shiftCost(from, to, s);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

function rotated(a, s) {
  if (!s) return a;
  var out = new Float32Array(6 * M);
  for (var i = 0; i < M; i++) {
    var j = (i + s) % M;
    for (var k = 0; k < 6; k++) out[6 * i + k] = a[6 * j + k];
  }
  return out;
}

/* Smarter matching (used when a morph is slow enough to be seen).
   Dynamic time warping over the anchor points lets features line up even when the two
   shapes distribute their points differently: where one outline has more points than the
   other, the extra pieces squash to a point instead of dragging across the glyph. */
var DN = M + 1;
var dtwD = new Float32Array(DN * DN);
var dtwDir = new Uint8Array(DN * DN);
var STEP_PENALTY = 0.003;

function dtw(A, B, s) {
  var i, j;
  function cost(i, j) {
    var a = (i % M) * 6, b = ((j + s) % M) * 6;
    var dx = A[a] - B[b], dy = A[a + 1] - B[b + 1];
    return dx * dx + dy * dy;
  }
  for (i = 0; i < DN; i++) {
    for (j = 0; j < DN; j++) {
      var idx = i * DN + j;
      if (i === 0 && j === 0) { dtwD[0] = cost(0, 0); dtwDir[0] = 0; continue; }
      var c = cost(i, j), best = Infinity, dir = 0;
      if (i > 0 && j > 0) { best = dtwD[(i - 1) * DN + j - 1]; dir = 1; }                       // diagonal
      if (i > 0 && dtwD[(i - 1) * DN + j] + STEP_PENALTY < best) { best = dtwD[(i - 1) * DN + j] + STEP_PENALTY; dir = 2; }   // A advances alone
      if (j > 0 && dtwD[i * DN + j - 1] + STEP_PENALTY < best) { best = dtwD[i * DN + j - 1] + STEP_PENALTY; dir = 3; }       // B advances alone
      dtwD[idx] = best + c;
      dtwDir[idx] = dir;
    }
  }
  var total = dtwD[M * DN + M], ii = [M], jj = [M];
  i = M; j = M;
  while (i > 0 || j > 0) {
    var d = dtwDir[i * DN + j];
    if (d === 1) { i--; j--; } else if (d === 2) { i--; } else { j--; }
    ii.push(i); jj.push(j);
  }
  ii.reverse(); jj.reverse();
  return { cost: total, ii: ii, jj: jj, s: s };
}

function alignDTW(A, B) {
  // try the few most promising rotations
  var cands = [];
  for (var s = 0; s < M; s++) cands.push([shiftCost(A, B, s), s]);
  cands.sort(function (p, q) { return p[0] - q[0]; });
  var best = null;
  for (var c = 0; c < 3; c++) {
    var r = dtw(A, B, cands[c][1]);
    if (!best || r.cost < best.cost) best = r;
  }
  var L = best.ii.length - 1, from = new Float32Array(6 * L), to = new Float32Array(6 * L);
  for (var k = 0; k < L; k++) {
    var i = best.ii[k] % M, j = (best.jj[k] + best.s) % M, q;
    if (best.ii[k + 1] > best.ii[k]) for (q = 0; q < 6; q++) from[6 * k + q] = A[6 * i + q];
    else for (q = 0; q < 3; q++) { from[6 * k + 2 * q] = A[6 * i]; from[6 * k + 2 * q + 1] = A[6 * i + 1]; }
    if (best.jj[k + 1] > best.jj[k]) for (q = 0; q < 6; q++) to[6 * k + q] = B[6 * j + q];
    else for (q = 0; q < 3; q++) { to[6 * k + 2 * q] = B[6 * j]; to[6 * k + 2 * q + 1] = B[6 * j + 1]; }
  }
  return { n: L, from: from, to: to };
}

function byArea(p, q) { return q.absArea - p.absArea; }

// Pair up the contours of the shape we're showing now (F) with those of the glyph we're going to (T).
// Outers go with outers, holes with holes, biggest with biggest; any left over shrink to / grow from a point.
// `smart` = use the slower, better matching.
function pairShapes(F, T, smart) {
  var pairs = [];
  [true, false].forEach(function (outer) {
    var f = F.filter(function (c) { return c.outer === outer; }).sort(byArea);
    var t = T.filter(function (c) { return c.outer === outer; }).sort(byArea);
    var n = Math.max(f.length, t.length);
    for (var k = 0; k < n; k++) {
      if (f[k] && t[k]) {
        var al = smart ? alignDTW(f[k].a, t[k].a) : { n: M, from: f[k].a, to: rotated(t[k].a, bestShift(f[k].a, t[k].a)) };
        pairs.push({ outer: outer, n: al.n, from: al.from, to: al.to, gone: false });
      }
      else if (f[k]) pairs.push({ outer: outer, n: M, from: f[k].a, to: collapsed(f[k]), gone: true });
      else           pairs.push({ outer: outer, n: M, from: collapsed(t[k]), to: t[k].a, gone: false });
    }
  });
  return pairs;
}

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

var SMART_MIN_MS = 100;   // morphs shorter than this use the cheap matching
var cells = [];
for (var ci = 0; ci < NCELLS; ci++) {
  cells.push({ pairs: [], t0: 0, dur: 0, wFrom: 0.5, wTo: 0.5, rgbFrom: [255, 255, 255], rgbTo: [255, 255, 255] });
}

function progress(cell, now) { return cell.dur > 0 ? ease(clamp01((now - cell.t0) / cell.dur)) : 1; }

function lerpRGB(a, b, e) { return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e]; }

// a lerped contour with any number of segments -> a standard M-segment contour (or null if it has vanished)
function normalizeContour(a, n) {
  var segs = [];
  for (var i = 0; i < n; i++) {
    var nx = ((i + 1) % n) * 6;
    var seg = [a[6 * i], a[6 * i + 1], a[6 * i + 2], a[6 * i + 3], a[6 * i + 4], a[6 * i + 5], a[nx], a[nx + 1]];
    if (segLen(seg) > 1e-5) segs.push(seg);
  }
  if (segs.length < 2) return null;
  return describe({ a: packSegs(toExactlyM(segs)) });
}

// whatever the cell looks like right now, as standalone contours
function currentShape(cell, e) {
  if (e >= 1) return cell.rest || [];       // finished: use the exact glyph, not a resampled copy
  var shape = [];
  cell.pairs.forEach(function (p) {
    var a = new Float32Array(6 * p.n);
    for (var k = 0; k < 6 * p.n; k++) a[k] = p.from[k] + (p.to[k] - p.from[k]) * e;
    var c = normalizeContour(a, p.n);
    if (c) { c.outer = p.outer; shape.push(c); }
  });
  return shape;
}

function startMorph(cell, glyph, rgb, now, dur) {
  var e = progress(cell, now);
  var cur = currentShape(cell, e);
  cell.wFrom = cell.wFrom + (cell.wTo - cell.wFrom) * e;
  cell.wTo = glyph.w;
  cell.rgbFrom = lerpRGB(cell.rgbFrom, cell.rgbTo, e);
  cell.rgbTo = rgb;
  cell.pairs = pairShapes(cur, glyph.contours, dur >= SMART_MIN_MS);
  cell.rest = glyph.contours;
  cell.t0 = now;
  cell.dur = dur;
}

/* ---------- fonts to pick from ---------- */
var pool = [];
var decks = [];
var poolDirty = true;

function rebuildPool() {
  var keys = settings.style === 'all' ? Object.keys(STYLES) : [settings.style];
  pool = [];
  keys.forEach(function (key) {
    STYLES[key].fonts.forEach(function (name) { if (window.GLYPHS && window.GLYPHS[name]) pool.push(name); });
  });
  decks = [];
  poolDirty = false;
}

// Random order without clumping: each character walks through a shuffled deck of
// every font, then reshuffles, so all fonts get shown before any repeats.
function nextFont(i) {
  var deck = decks[i];
  if (!deck || !deck.length) {
    var last = deck && deck.last;
    deck = pool.slice();
    for (var a = deck.length - 1; a > 0; a--) {
      var b = (Math.random() * (a + 1)) | 0, t = deck[a]; deck[a] = deck[b]; deck[b] = t;
    }
    if (last && deck.length > 1 && deck[deck.length - 1] === last) {
      t = deck[0]; deck[0] = deck[deck.length - 1]; deck[deck.length - 1] = t;
    }
    decks[i] = deck;
  }
  var pick = deck.pop();
  deck.last = pick;
  return pick;
}

/* ---------- colours ---------- */
function currentHue() {
  return COLOURS.filter(function (c) { return c.id === settings.colour; })[0].hue;
}
function hexToRGB(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
function lightColour() { return hexToRGB(randomColor({ luminosity: 'light', hue: currentHue() })); }
function darkColour()  { return hexToRGB(randomColor({ luminosity: 'dark',  hue: currentHue() })); }
function rgbString(c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }

/* ======================================================================
   Layout: where each character lives. Everything is centred in a fixed
   slot, so nothing moves when the shape changes.
   ====================================================================== */
var portraitQuery = window.matchMedia('(orientation: portrait)');
var dpr = 1;
var layout = { baseH: 100, digitW: 100, sepW: 50, cx: [], cy: [], portrait: false };

function updateLayout() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  var vw = window.innerWidth, vh = window.innerHeight;
  var w = Math.round(vw * dpr), h = Math.round(vh * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }

  var size = settings.size, gap = settings.spacing, portrait = portraitQuery.matches;
  var base, digitW, sepW, rowH;
  if (portrait) {
    base   = Math.min(vh * 0.27, vw * 0.58) * size;
    digitW = base * 0.8;
    sepW   = 0;
    rowH   = vh * 0.3 * size * gap;
  } else {
    base   = Math.min(vw * 0.177, vh * 0.6) * size;
    digitW = base * 0.75;
    sepW   = base * 0.4;
  }
  var cx = [], cy = [], i;
  if (portrait) {
    for (i = 0; i < NCELLS; i++) {
      if (isSep(i)) { cx.push(vw / 2); cy.push(vh / 2); continue; }
      var row = i < 2 ? 0 : i < 5 ? 1 : 2;
      cx.push(vw / 2 + (i % 3 === 0 ? -1 : 1) * digitW * gap / 2);
      cy.push(vh / 2 + (row - 1) * rowH);
    }
  } else {
    var total = 0;
    for (i = 0; i < NCELLS; i++) total += (isSep(i) ? sepW : digitW) * gap;
    var x = (vw - total) / 2;
    for (i = 0; i < NCELLS; i++) {
      var sw = (isSep(i) ? sepW : digitW) * gap;
      cx.push(x + sw / 2);
      cy.push(vh / 2);
      x += sw;
    }
  }
  layout = { baseH: base * 0.72, digitW: digitW, sepW: sepW, cx: cx, cy: cy, portrait: portrait };
}

window.addEventListener('resize', updateLayout);

/* ---------- drawing ---------- */
var bg = { from: [0, 0, 0], to: [0, 0, 0], t0: 0, dur: 0 };
var tmp = new Float32Array(6 * (2 * M + 2));

function blendOp() {
  return BLENDS.filter(function (b) { return b.id === settings.blend; })[0].op;
}

function draw(now) {
  var e = bg.dur > 0 ? clamp01((now - bg.t0) / bg.dur) : 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rgbString(lerpRGB(bg.from, bg.to, e));
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = blendOp();

  for (var i = 0; i < NCELLS; i++) {
    if (layout.portrait && isSep(i)) continue;
    var cell = cells[i], p = progress(cell, now);
    var w = cell.wFrom + (cell.wTo - cell.wFrom) * p;
    // shrink (never grow) wide glyphs so they fit their slot
    var room = (isSep(i) ? layout.sepW : layout.digitW) * 0.96;
    var H = Math.min(layout.baseH, room / Math.max(w, 0.05));
    ctx.setTransform(dpr * H, 0, 0, dpr * H, dpr * layout.cx[i], dpr * layout.cy[i]);
    ctx.fillStyle = rgbString(lerpRGB(cell.rgbFrom, cell.rgbTo, p));
    ctx.beginPath();
    for (var q = 0; q < cell.pairs.length; q++) {
      var pr = cell.pairs[q];
      if (p >= 1 && pr.gone) continue;
      var from = pr.from, to = pr.to, n = pr.n, k;
      for (k = 0; k < 6 * n; k++) tmp[k] = from[k] + (to[k] - from[k]) * p;
      ctx.moveTo(tmp[0], tmp[1]);
      for (var j = 0; j < n; j++) {
        var nx = ((j + 1) % n) * 6;
        ctx.bezierCurveTo(tmp[6 * j + 2], tmp[6 * j + 3], tmp[6 * j + 4], tmp[6 * j + 5], tmp[nx], tmp[nx + 1]);
      }
      ctx.closePath();
    }
    ctx.fill();
  }
}

/* ---------- time ---------- */
var psec = -1;

function pad(n) { return (n < 10 ? '0' : '') + n; }

function whatisthetime() {
  var d = new Date();
  var sec = d.getSeconds();
  if (sec !== psec) {
    psec = sec;
    var s = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(sec);
    for (var i = 0; i < NCELLS; i++) chars[i] = s[i];
    return true;
  }
  return false;
}

/* ---------- speeds ---------- */
// Clock jitter: from 1 change per second up to one per screen refresh (slider far right = "max").
function jitterRate(v) { return Math.pow(120, v); }                 // 1 .. 120 per second
function jitterInterval(v) { return v >= 0.995 ? 0 : 1000 / jitterRate(v); }   // ms; 0 = every frame
// Background: from one change a minute up to one a second.
function bgPeriod(v) { return Math.pow(60, 1 - v); }                // seconds, 60 .. 1

function fmtJitter(v) {
  if (v >= 0.995) return 'max';
  var r = jitterRate(v);
  return (r < 10 ? r.toFixed(1) : Math.round(r)) + '/s';
}
function fmtBg(v) {
  var p = bgPeriod(v);
  if (p < 1.05) return '1/s';
  if (p > 58) return '1/min';
  return 'every ' + (p < 10 ? p.toFixed(1) : Math.round(p)) + 's';
}
function fmtMorph(v) { return v <= 0.005 ? 'off' : Math.round(v * 100) + '%'; }

/* ---------- main loop ---------- */
var lastBg = -Infinity;

// "vary per letter": every character gets its own speed multiplier, re-rolled every few seconds
var MIN_FACTOR = 0.4, MAX_FACTOR = 3;
function rollFactor(cell, now) {
  cell.factor = Math.exp(Math.log(MIN_FACTOR) + Math.random() * (Math.log(MAX_FACTOR) - Math.log(MIN_FACTOR)));
  cell.rerollAt = now + 1500 + Math.random() * 4500;
}
cells.forEach(function (c) { c.factor = 1; c.rerollAt = 0; c.last = -Infinity; c.lastChar = ''; });

// ms between changes for one character (never slower than once a second)
function cellInterval(cell) {
  var base = jitterInterval(settings.jitter) || 1000 / 60;
  return settings.vary ? Math.min(1000, base / cell.factor) : base;
}

// give one character a new font, shape and colour, and start morphing towards them
function retarget(i, now) {
  var cell = cells[i];
  cell.last = now;
  cell.lastChar = chars[i];
  var glyph = getGlyph(nextFont(i), chars[i]);
  if (glyph) startMorph(cell, glyph, lightColour(), now, settings.morph * cellInterval(cell));
}

function frame(now) {
  var timeChanged = whatisthetime();
  if (poolDirty) rebuildPool();
  if (pool.length) {
    for (var i = 0; i < NCELLS; i++) {
      var cell = cells[i];
      if (settings.vary && now >= cell.rerollAt) rollFactor(cell, now);
      // a new digit always retargets; otherwise each character runs on its own clock
      var digitChanged = timeChanged && (!settings.vary || chars[i] !== cell.lastChar);
      if (digitChanged || now - cell.last >= cellInterval(cell) - 2) retarget(i, now);
    }
  }
  var period = bgPeriod(settings.bg) * 1000;
  if (now - lastBg >= period - 2) {
    lastBg = now;
    var e = bg.dur > 0 ? clamp01((now - bg.t0) / bg.dur) : 1;
    bg.from = lerpRGB(bg.from, bg.to, e);
    bg.to = darkColour();
    bg.t0 = now;
    // fade over the whole gap when it's slow, but never longer than 5s
    bg.dur = Math.min(period, 5000);
  }
  draw(now);
  requestAnimationFrame(frame);
}
updateLayout();
requestAnimationFrame(frame);

/* ---------- controls ---------- */
var controls = document.getElementById('controls');
var styleGroup = document.getElementById('style-group');
var colourGroup = document.getElementById('colour-group');

function makeButton(parent, label, onClick, cls) {
  var b = document.createElement('button');
  b.type = 'button';
  if (cls) b.className = cls;
  if (label) b.textContent = label;
  b.addEventListener('click', onClick);
  parent.appendChild(b);
  return b;
}

var styleButtons = {};
[['all', 'All']].concat(Object.keys(STYLES).map(function (k) { return [k, STYLES[k].label]; }))
  .forEach(function (pair) {
    styleButtons[pair[0]] = makeButton(styleGroup, pair[1], function () {
      settings.style = pair[0];
      poolDirty = true;
      save();
      refreshControls();
    });
  });

var colourButtons = {};
COLOURS.forEach(function (c) {
  var b = makeButton(colourGroup, '', function () {
    settings.colour = c.id;
    lastBg = -Infinity;   // repaint the background straight away
    save();
    refreshControls();
  }, 'swatch');
  b.style.background = c.swatch;
  b.title = c.label;
  b.setAttribute('aria-label', c.label + ' colour');
  colourButtons[c.id] = b;
});

// sliders (size / spacing / speeds / morph) and the overlap blend mode
var tuneGroup = document.createElement('div');
tuneGroup.className = 'group tune';
tuneGroup.setAttribute('role', 'group');
tuneGroup.setAttribute('aria-label', 'Size, spacing, speed, morph and overlap');
controls.appendChild(tuneGroup);

var sliderEls = {};
function makeSlider(key, label, format) {
  var wrap = document.createElement('label');
  wrap.className = 'slider';
  var text = document.createElement('span');
  text.textContent = label;
  var readout = document.createElement('output');
  readout.className = 'readout';
  var input = document.createElement('input');
  input.type = 'range';
  input.min = SLIDERS[key].min;
  input.max = SLIDERS[key].max;
  input.step = SLIDERS[key].step;
  input.value = settings[key];
  input.addEventListener('input', function () {
    settings[key] = Number(input.value);
    if (format) readout.textContent = format(settings[key]);
    updateLayout();
    save();
    refreshControls();
  });
  if (format) readout.textContent = format(settings[key]);
  wrap.appendChild(text);
  wrap.appendChild(input);
  if (format) wrap.appendChild(readout);
  tuneGroup.appendChild(wrap);
  sliderEls[key] = { input: input, readout: readout, format: format };
}
makeSlider('size', 'Size');
makeSlider('spacing', 'Spacing');
makeSlider('jitter', 'Jitter speed', fmtJitter);
makeSlider('morph', 'Morph', fmtMorph);
makeSlider('bg', 'Background speed', fmtBg);

var varyWrap = document.createElement('label');
varyWrap.className = 'slider check';
var varyBox = document.createElement('input');
varyBox.type = 'checkbox';
varyBox.checked = settings.vary;
varyBox.addEventListener('change', function () {
  settings.vary = varyBox.checked;
  cells.forEach(function (c) { rollFactor(c, performance.now()); });
  save();
});
var varyText = document.createElement('span');
varyText.textContent = 'Vary speed per letter';
varyWrap.appendChild(varyBox);
varyWrap.appendChild(varyText);
tuneGroup.appendChild(varyWrap);

var blendWrap = document.createElement('label');
blendWrap.className = 'slider';
var blendText = document.createElement('span');
blendText.textContent = 'Overlap';
var blendSelect = document.createElement('select');
BLENDS.forEach(function (b) {
  var o = document.createElement('option');
  o.value = b.id;
  o.textContent = b.label;
  blendSelect.appendChild(o);
});
blendSelect.value = settings.blend;
blendSelect.addEventListener('change', function () {
  settings.blend = blendSelect.value;
  save();
  refreshControls();
});
blendWrap.appendChild(blendText);
blendWrap.appendChild(blendSelect);
tuneGroup.appendChild(blendWrap);

// presets: one click sets everything
var presetGroup = document.createElement('div');
presetGroup.className = 'group presets';
presetGroup.setAttribute('role', 'group');
presetGroup.setAttribute('aria-label', 'Presets');
controls.insertBefore(presetGroup, controls.firstChild);

function applyPreset(preset) {
  Object.keys(preset.settings).forEach(function (k) { settings[k] = preset.settings[k]; });
  poolDirty = true;
  lastBg = -Infinity;
  Object.keys(sliderEls).forEach(function (k) {
    var el = sliderEls[k];
    el.input.value = settings[k];
    if (el.format) el.readout.textContent = el.format(settings[k]);
  });
  blendSelect.value = settings.blend;
  updateLayout();
  save();
  refreshControls();
}

function presetActive(preset) {
  return Object.keys(preset.settings).every(function (k) {
    var a = preset.settings[k], b = settings[k];
    return typeof a === 'number' ? Math.abs(a - b) < 0.006 : a === b;
  });
}

var presetButtons = PRESETS.map(function (preset) {
  return makeButton(presetGroup, preset.label, function () { applyPreset(preset); });
});

function refreshControls() {
  presetButtons.forEach(function (b, i) {
    b.setAttribute('aria-pressed', String(presetActive(PRESETS[i])));
  });
  Object.keys(styleButtons).forEach(function (k) {
    styleButtons[k].setAttribute('aria-pressed', String(k === settings.style));
  });
  Object.keys(colourButtons).forEach(function (k) {
    colourButtons[k].setAttribute('aria-pressed', String(k === settings.colour));
  });
}
refreshControls();

// controls fade away when idle; any movement/touch/key brings them back
var hideTimer;
function showControls() {
  controls.classList.add('visible');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(function () { controls.classList.remove('visible'); }, 3500);
}
['pointermove', 'pointerdown', 'keydown'].forEach(function (ev) {
  window.addEventListener(ev, showControls, { passive: true });
});
showControls();
