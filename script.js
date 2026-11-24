/* ---------- typefaces, grouped by style ---------- */
// 'Name' or 'Name|weight'. Every name here is a Google Font.
var STYLES = {
  mono: { label: 'Mono', generic: 'monospace', fonts: [
    'Cousine', 'B612 Mono', 'Fira Code', 'Cutive Mono', 'Oxygen Mono', 'Overpass Mono',
    'VT323', 'Space Mono', 'Fira Mono', 'Anonymous Pro', 'IBM Plex Mono', 'Share Tech Mono',
    'PT Mono', 'Nanum Gothic Coding', 'Roboto Mono', 'Inconsolata', 'Source Code Pro', 'Ubuntu Mono'
  ]},
  serif: { label: 'Serif', generic: 'serif', fonts: [
    'Libre Baskerville|700', 'Playfair Display', 'Cormorant Garamond', 'Lora', 'DM Serif Display',
    'Abril Fatface', 'Bodoni Moda', 'Cinzel', 'Old Standard TT', 'Prata'
  ]},
  sans: { label: 'Sans', generic: 'sans-serif', fonts: [
    'Montserrat', 'Oswald', 'Poppins', 'Raleway', 'Bebas Neue',
    'Josefin Sans', 'Quicksand', 'Work Sans', 'Barlow Condensed'
  ]},
  chunky: { label: 'Chunky', generic: 'sans-serif', fonts: [
    'Alfa Slab One', 'Bevan', 'Chango', 'Titan One', 'Bungee', 'Rubik Mono One',
    'Black Ops One', 'Anton', 'Archivo Black', 'Bowlby One', 'Luckiest Guy', 'Paytone One'
  ]},
  script: { label: 'Script', generic: 'cursive', fonts: [
    'Birthstone', 'Ephesis', 'Pacifico', 'Lobster', 'Dancing Script',
    'Great Vibes', 'Sacramento', 'Satisfy', 'Caveat'
  ]},
  weird: { label: 'Weird', generic: 'fantasy', fonts: [
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
// blend modes for where characters overlap
var BLENDS = [
  { id: 'normal',      label: 'Solid' },
  { id: 'screen',      label: 'Screen' },
  { id: 'plus-lighter', label: 'Add' },
  { id: 'difference',  label: 'Difference' },
  { id: 'exclusion',   label: 'Exclusion' },
  { id: 'overlay',     label: 'Overlay' }
];
// sliders: size is a multiplier on the fit-to-screen size, spacing a multiplier on the gap between characters
var SLIDERS = {
  size:    { min: 0.2, max: 1.6, step: 0.01 },
  spacing: { min: 0.1, max: 1.6, step: 0.01 },
  // speeds are slider positions 0..1 on a log scale (see jitterInterval / bgPeriod)
  jitter:  { min: 0, max: 1, step: 0.005 },
  bg:      { min: 0, max: 1, step: 0.005 }
};

var settings = { style: 'all', colour: 'rainbow', size: 1, spacing: 1, blend: 'normal', jitter: 1, bg: 1 };
try {
  var saved = JSON.parse(localStorage.getItem('clocky-clock') || '{}');
  if (saved.style === 'all' || STYLES[saved.style]) settings.style = saved.style;
  if (COLOURS.some(function (c) { return c.id === saved.colour; })) settings.colour = saved.colour;
  if (BLENDS.some(function (b) { return b.id === saved.blend; })) settings.blend = saved.blend;
  ['size', 'spacing', 'jitter', 'bg'].forEach(function (k) {
    var v = Number(saved[k]);
    if (isFinite(v) && v >= SLIDERS[k].min && v <= SLIDERS[k].max) settings[k] = v;
  });
} catch (e) {}

function save() {
  try { localStorage.setItem('clocky-clock', JSON.stringify(settings)); } catch (e) {}
}

// the 8 characters of "hh:mm:ss", each in its own span
var parts = Array.prototype.slice.call(document.querySelectorAll('#clock .slot span'));
var chars = ['', '', ':', '', '', ':', '', ''];
function isSep(i) { return i === 2 || i === 5; }
var bgdEl = document.getElementById('bgd');

/* ---------- load the fonts ---------- */
var loaded = {};   // font entry -> true once its digits are ready
var widths = {};   // font entry -> { char: advance width in em } (so we never have to measure the page)
var poolDirty = true;
var CHARS = '0123456789:';

function parseFont(entry) {
  var bits = entry.split('|');
  return { name: bits[0], weight: bits[1] || '400' };
}

var measureCtx = document.createElement('canvas').getContext('2d');

function measureFont(entry) {
  var f = parseFont(entry);
  measureCtx.font = f.weight + ' 100px "' + f.name + '"';
  var w = {};
  for (var i = 0; i < CHARS.length; i++) w[CHARS[i]] = measureCtx.measureText(CHARS[i]).width / 100;
  widths[entry] = w;
}

(function loadFonts() {
  var families = [];
  Object.keys(STYLES).forEach(function (key) {
    STYLES[key].fonts.forEach(function (entry) {
      var f = parseFont(entry);
      families.push('family=' + f.name.replace(/ /g, '+') + (f.weight !== '400' ? ':wght@' + f.weight : ''));
    });
  });
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?' + families.join('&') + '&display=swap';
  link.onload = function () {
    // fetch just the glyphs we need, and only use a font once it's ready (no flashing fallbacks)
    Object.keys(STYLES).forEach(function (key) {
      STYLES[key].fonts.forEach(function (entry) {
        var f = parseFont(entry);
        document.fonts.load(f.weight + ' 40px "' + f.name + '"', CHARS).then(function () {
          measureFont(entry);
          loaded[entry] = true;
          poolDirty = true;
        }).catch(function () {});
      });
    });
  };
  document.head.appendChild(link);
})();

var pool = [];
function rebuildPool() {
  var keys = settings.style === 'all' ? Object.keys(STYLES) : [settings.style];
  pool = [];
  keys.forEach(function (key) {
    STYLES[key].fonts.forEach(function (entry) {
      if (loaded[entry]) pool.push({
        family: '"' + parseFont(entry).name + '", ' + STYLES[key].generic,
        weight: parseFont(entry).weight,
        widths: widths[entry]
      });
    });
  });
  decks = [];     // start fresh shuffles
  poolDirty = false;
}

// Random order without clumping: each character walks through a shuffled deck of
// every font, then reshuffles, so all fonts get shown before any repeats.
var decks = [];
function nextFont(i) {
  var deck = decks[i];
  if (!deck || !deck.length) {
    var last = deck && deck.last;
    deck = [];
    for (var k = 0; k < pool.length; k++) deck.push(pool[k]);
    for (var a = deck.length - 1; a > 0; a--) {
      var b = (Math.random() * (a + 1)) | 0, t = deck[a]; deck[a] = deck[b]; deck[b] = t;
    }
    // don't open the new deck with the font we just showed
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

function lightColour() { return randomColor({ luminosity: 'light', hue: currentHue() }); }
function darkColour()  { return randomColor({ luminosity: 'dark',  hue: currentHue() }); }

/* ---------- layout (only changes when the screen does) ---------- */
var portraitQuery = window.matchMedia('(orientation: portrait)');
var layout = { base: 100, digitW: 100, sepW: 50 };

function updateLayout() {
  var vw = window.innerWidth, vh = window.innerHeight;
  var size = settings.size, gap = settings.spacing;
  var base, digitW, sepW, slotH;
  if (portraitQuery.matches) {
    base   = Math.min(vh * 0.27, vw * 0.58) * size;
    digitW = base * 0.8;
    sepW   = 0;
    slotH  = vh * 0.3 * size * gap;
  } else {
    base   = Math.min(vw * 0.177, vh * 0.6) * size;
    digitW = base * 0.75;
    sepW   = base * 0.4;
    slotH  = base * 1.2;
  }
  // glyphs are sized to the normal slot, then the slots are squeezed/stretched by the
  // spacing slider, so characters can overlap when spacing is low
  layout = { base: base, digitW: digitW, sepW: sepW };
  parts.forEach(function (el, i) {
    var slot = el.parentNode;
    slot.style.width  = (isSep(i) ? sepW : digitW) * gap + 'px';
    slot.style.height = slotH + 'px';
    el.style.mixBlendMode = settings.blend;
  });
}

window.addEventListener('resize', updateLayout);

/* ---------- the jitter: every character gets its own font and colour, every frame ---------- */
function jitter() {
  if (poolDirty) rebuildPool();
  var base = layout.base;
  for (var i = 0; i < parts.length; i++) {
    var el = parts[i], st = el.style;
    if (pool.length) {
      var pick = nextFont(i);
      st.fontFamily = pick.family;
      st.fontWeight = pick.weight;
      // shrink (never grow) so this glyph fits its slot; widths come from a table, not from layout
      var room = (isSep(i) ? layout.sepW : layout.digitW) * 0.96;
      var w = pick.widths[chars[i]] || 0.6;
      st.fontSize = Math.min(base, room / w) + 'px';
    } else {
      st.fontSize = base + 'px';
    }
    st.color = lightColour();
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
    for (var i = 0; i < parts.length; i++) {
      chars[i] = s[i];
      parts[i].textContent = s[i];
    }
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

var lastJitter = -Infinity, lastBg = -Infinity;

// one pass per screen refresh; the sliders decide whether this pass actually changes anything
function frame(now) {
  var timeChanged = whatisthetime();
  if (timeChanged || now - lastJitter >= jitterInterval(settings.jitter) - 2) {
    lastJitter = now;
    jitter();
  }
  var period = bgPeriod(settings.bg) * 1000;
  if (now - lastBg >= period - 2) {
    lastBg = now;
    // fade over the whole gap when it's slow, but never longer than 5s
    bgdEl.style.transitionDuration = Math.min(period, 5000) + 'ms';
    bgdEl.style.background = darkColour();
  }
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

// sliders (size / spacing) and the overlap blend mode
var tuneGroup = document.createElement('div');
tuneGroup.className = 'group tune';
tuneGroup.setAttribute('role', 'group');
tuneGroup.setAttribute('aria-label', 'Size, spacing and overlap');
controls.appendChild(tuneGroup);

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
  });
  if (format) readout.textContent = format(settings[key]);
  wrap.appendChild(text);
  wrap.appendChild(input);
  if (format) wrap.appendChild(readout);
  tuneGroup.appendChild(wrap);
}
makeSlider('size', 'Size');
makeSlider('spacing', 'Spacing');
makeSlider('jitter', 'Jitter speed', fmtJitter);
makeSlider('bg', 'Background speed', fmtBg);

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
  updateLayout();
  save();
});
blendWrap.appendChild(blendText);
blendWrap.appendChild(blendSelect);
tuneGroup.appendChild(blendWrap);

function refreshControls() {
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
