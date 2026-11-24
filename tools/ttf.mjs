// Minimal TrueType reader: just enough to pull glyph outlines for a few characters.
// No dependencies. Handles simple + composite glyphs (glyf table), cmap formats 4 and 12,
// and GSUB 'lnum' (lining numerals) so fonts with old-style default figures still give lining digits.

import fs from 'node:fs';

export function loadFont(path) {
  const buf = fs.readFileSync(path);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const numTables = dv.getUint16(4);
  const tables = {};
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16;
    const tag = String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);
    tables[tag] = { off: dv.getUint32(o + 8), len: dv.getUint32(o + 12) };
  }
  if (!tables.glyf) throw new Error('no glyf table (CFF fonts not supported): ' + path);

  const head = tables.head.off;
  const unitsPerEm = dv.getUint16(head + 18);
  const locaLong = dv.getInt16(head + 50) === 1;
  const numGlyphs = dv.getUint16(tables.maxp.off + 4);

  // ---- cmap
  function cmapLookup(code) {
    const base = tables.cmap.off;
    const n = dv.getUint16(base + 2);
    let best = null;
    for (let i = 0; i < n; i++) {
      const plat = dv.getUint16(base + 4 + i * 8);
      const enc = dv.getUint16(base + 6 + i * 8);
      const off = base + dv.getUint32(base + 8 + i * 8);
      const fmt = dv.getUint16(off);
      const score = (plat === 3 && enc === 10 && fmt === 12) ? 3 : (plat === 3 && enc === 1 && fmt === 4) ? 2 : (plat === 0 && (fmt === 4 || fmt === 12)) ? 1 : 0;
      if (score && (!best || score > best.score)) best = { score, off, fmt };
    }
    if (!best) return 0;
    const off = best.off;
    if (best.fmt === 4) {
      const segX2 = dv.getUint16(off + 6);
      const endO = off + 14, startO = endO + segX2 + 2, deltaO = startO + segX2, rangeO = deltaO + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = dv.getUint16(endO + s * 2);
        if (code > end) continue;
        const start = dv.getUint16(startO + s * 2);
        if (code < start) return 0;
        const delta = dv.getInt16(deltaO + s * 2);
        const ro = dv.getUint16(rangeO + s * 2);
        if (ro === 0) return (code + delta) & 0xffff;
        const g = dv.getUint16(rangeO + s * 2 + ro + (code - start) * 2);
        return g === 0 ? 0 : (g + delta) & 0xffff;
      }
      return 0;
    }
    const nGroups = dv.getUint32(off + 12);
    for (let g = 0; g < nGroups; g++) {
      const o = off + 16 + g * 12;
      const start = dv.getUint32(o), end = dv.getUint32(o + 4);
      if (code >= start && code <= end) return dv.getUint32(o + 8) + (code - start);
    }
    return 0;
  }

  // ---- GSUB single substitutions for a feature tag (e.g. 'lnum')
  function gsubMap(featureTag) {
    const map = new Map();
    if (!tables.GSUB) return map;
    const g = tables.GSUB.off;
    const featList = g + dv.getUint16(g + 6);
    const lookupList = g + dv.getUint16(g + 8);
    const nFeat = dv.getUint16(featList);
    const lookups = new Set();
    for (let i = 0; i < nFeat; i++) {
      const o = featList + 2 + i * 6;
      const tag = String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
      if (tag !== featureTag) continue;
      const feat = featList + dv.getUint16(o + 4);
      const nl = dv.getUint16(feat + 2);
      for (let k = 0; k < nl; k++) lookups.add(dv.getUint16(feat + 4 + k * 2));
    }
    function coverage(off) {
      const fmt = dv.getUint16(off), out = [];
      if (fmt === 1) {
        const n = dv.getUint16(off + 2);
        for (let i = 0; i < n; i++) out.push(dv.getUint16(off + 4 + i * 2));
      } else {
        const n = dv.getUint16(off + 2);
        for (let i = 0; i < n; i++) {
          const s = dv.getUint16(off + 4 + i * 6), e = dv.getUint16(off + 6 + i * 6);
          for (let gid = s; gid <= e; gid++) out.push(gid);
        }
      }
      return out;
    }
    for (const li of lookups) {
      const lk = lookupList + dv.getUint16(lookupList + 2 + li * 2);
      let type = dv.getUint16(lk);
      const nSub = dv.getUint16(lk + 4);
      for (let s = 0; s < nSub; s++) {
        let sub = lk + dv.getUint16(lk + 6 + s * 2);
        if (type === 7) { // extension
          type = dv.getUint16(sub + 2);
          sub = sub + dv.getUint32(sub + 4);
        }
        if (type !== 1) continue;
        const fmt = dv.getUint16(sub);
        const cov = coverage(sub + dv.getUint16(sub + 2));
        if (fmt === 1) {
          const delta = dv.getInt16(sub + 4);
          cov.forEach((gid) => map.set(gid, (gid + delta) & 0xffff));
        } else {
          cov.forEach((gid, i) => map.set(gid, dv.getUint16(sub + 6 + i * 2)));
        }
      }
    }
    return map;
  }

  // ---- glyf
  function glyphOffset(gid) {
    const l = tables.loca.off;
    const a = locaLong ? dv.getUint32(l + gid * 4) : dv.getUint16(l + gid * 2) * 2;
    const b = locaLong ? dv.getUint32(l + gid * 4 + 4) : dv.getUint16(l + gid * 2 + 2) * 2;
    return a === b ? null : tables.glyf.off + a;
  }

  // returns contours: [[{x,y,on}, ...], ...]
  function glyphContours(gid, depth = 0) {
    const off = glyphOffset(gid);
    if (off === null || depth > 6) return [];
    const nc = dv.getInt16(off);
    if (nc >= 0) {
      let p = off + 10;
      const ends = [];
      for (let i = 0; i < nc; i++) { ends.push(dv.getUint16(p)); p += 2; }
      const nPts = nc ? ends[nc - 1] + 1 : 0;
      p += 2 + dv.getUint16(p); // skip instructions
      const flags = [];
      while (flags.length < nPts) {
        const f = dv.getUint8(p++);
        flags.push(f);
        if (f & 8) { let r = dv.getUint8(p++); while (r--) flags.push(f); }
      }
      const xs = [], ys = [];
      let v = 0;
      for (let i = 0; i < nPts; i++) {
        const f = flags[i];
        if (f & 2) { const d = dv.getUint8(p++); v += (f & 16) ? d : -d; }
        else if (!(f & 16)) { v += dv.getInt16(p); p += 2; }
        xs.push(v);
      }
      v = 0;
      for (let i = 0; i < nPts; i++) {
        const f = flags[i];
        if (f & 4) { const d = dv.getUint8(p++); v += (f & 32) ? d : -d; }
        else if (!(f & 32)) { v += dv.getInt16(p); p += 2; }
        ys.push(v);
      }
      const out = [];
      let s = 0;
      for (const e of ends) {
        const c = [];
        for (let i = s; i <= e; i++) c.push({ x: xs[i], y: ys[i], on: !!(flags[i] & 1) });
        out.push(c);
        s = e + 1;
      }
      return out;
    }
    // composite
    let p = off + 10, out = [], more = true;
    while (more) {
      const flags = dv.getUint16(p), idx = dv.getUint16(p + 2);
      p += 4;
      let dx, dy;
      if (flags & 1) { dx = dv.getInt16(p); dy = dv.getInt16(p + 2); p += 4; }
      else { dx = dv.getInt8(p); dy = dv.getInt8(p + 1); p += 2; }
      if (!(flags & 2)) { dx = 0; dy = 0; } // point-matching not supported
      let a = 1, b = 0, c = 0, d = 1;
      const f2 = (o) => dv.getInt16(o) / 16384;
      if (flags & 8) { a = d = f2(p); p += 2; }
      else if (flags & 0x40) { a = f2(p); d = f2(p + 2); p += 4; }
      else if (flags & 0x80) { a = f2(p); b = f2(p + 2); c = f2(p + 4); d = f2(p + 6); p += 8; }
      for (const contour of glyphContours(idx, depth + 1)) {
        out.push(contour.map((q) => ({ x: Math.round(a * q.x + c * q.y + dx), y: Math.round(b * q.x + d * q.y + dy), on: q.on })));
      }
      more = !!(flags & 0x20);
    }
    return out;
  }

  const lnum = gsubMap('lnum');
  return {
    unitsPerEm,
    numGlyphs,
    hasFvar: !!tables.fvar,
    glyphFor(ch, { lining = true } = {}) {
      let gid = cmapLookup(ch.codePointAt(0));
      if (lining && lnum.has(gid)) gid = lnum.get(gid);
      return gid;
    },
    contours: glyphContours,
  };
}
