// Quick look at every font's digit outlines (usage: node tools/stats.mjs <ttf-dir>)
import fs from 'node:fs';
import path from 'node:path';
import { loadFont } from './ttf.mjs';

const dir = process.argv[2];
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.ttf')).sort()) {
  try {
    const font = loadFont(path.join(dir, file));
    const rows = [];
    let maxPts = 0, maxC = 0, minBot = 1e9, maxTop = -1e9, missing = 0;
    for (const ch of '0123456789:') {
      const gid = font.glyphFor(ch);
      const cs = font.contours(gid);
      if (!cs.length) { missing++; continue; }
      maxC = Math.max(maxC, cs.length);
      let top = -1e9, bot = 1e9, pts = 0;
      for (const c of cs) for (const q of c) { top = Math.max(top, q.y); bot = Math.min(bot, q.y); pts += 1; }
      maxPts = Math.max(maxPts, pts);
      if (ch !== ':') { minBot = Math.min(minBot, bot); maxTop = Math.max(maxTop, top); rows.push({ ch, top, bot }); }
    }
    const upm = font.unitsPerEm;
    const desc = rows.filter((r) => r.bot < -0.08 * upm).map((r) => r.ch).join('');
    console.log(file.padEnd(28), 'fvar:' + (font.hasFvar ? 'y' : 'n'), 'maxContours:' + maxC, 'maxPts:' + String(maxPts).padStart(4), 'h:' + ((maxTop - minBot) / upm).toFixed(2), 'missing:' + missing, desc ? 'DESCENDERS:' + desc : '');
  } catch (e) {
    console.log(file.padEnd(28), 'ERROR', e.message);
  }
}
