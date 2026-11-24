# clocky-clock ⏰️ 
 
A neurotic, jittery clock. It changes colour and typeface lots of times per second. 

Online at [https://clockyclock.netlify.com](https://clockyclock.netlify.com).

## How the morphing works

The clock is drawn on a canvas, not with text. `glyphs.js` holds the outlines of `0-9` and `:` for every font, so no font files are loaded at runtime. When a character changes font, its outline is morphed into the new one by interpolating Bezier control points (contours are matched up with dynamic time warping so features line up).

To rebuild `glyphs.js` from the Google Fonts TTF files (names like `Fira_Code.ttf`):

```
node tools/extract-glyphs.mjs path/to/ttfs > glyphs.js
```

The fonts are from Google Fonts and are licensed under the SIL Open Font License.
