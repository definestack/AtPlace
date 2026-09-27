#!/usr/bin/env node
/**
 * Regenerates every `assets/images/*` icon/splash variant from the single
 * design master at `docs/design/icon.png` (per `.claude/rules/design-reference.md`,
 * that file is the source of truth for the app's brand mark).
 *
 * The master is a flat, opaque RGB image: a blue rounded-square tile
 * (with a white glyph on it) sitting on a white canvas margin. Android's
 * adaptive icon system needs that decomposed into separate layers (a
 * transparent glyph silhouette for `foreground`/`monochrome`, composited by
 * the OS over the existing solid `background` gradient), and the in-app logo
 * (`splash-icon.png`) needs the tile cropped out with its rounded corners
 * made transparent so it sits cleanly on both light and dark screens.
 *
 * Run with: node scripts/generate-icons.mjs
 */
import { Jimp } from "jimp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MASTER_PATH = path.join(ROOT, "docs/design/icon.png");
const OUT_DIR = path.join(ROOT, "assets/images");

// A pixel counts as "background white" (vs. the saturated blue tile or its
// glyph) below this per-channel threshold.
const WHITE_THRESHOLD = 240;
// Fraction of the target canvas the glyph's longest side should occupy,
// matching the safe-zone sizing of the previous foreground/monochrome
// layers (~0.62-0.63) and Android's adaptive-icon safe-zone guidance.
const GLYPH_SAFE_ZONE_RATIO = 0.62;

function isNearWhite(r, g, b) {
  return r > WHITE_THRESHOLD && g > WHITE_THRESHOLD && b > WHITE_THRESHOLD;
}

/** Bounding box of pixels for which `predicate(r,g,b,a)` is true. */
function boundingBox(img, predicate) {
  let minX = img.bitmap.width;
  let minY = img.bitmap.height;
  let maxX = -1;
  let maxY = -1;
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, (x, y, idx) => {
    const { data } = img.bitmap;
    if (predicate(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  });
  if (maxX < 0) throw new Error("boundingBox: predicate matched no pixels");
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Flood-fills near-white pixels reachable from the four corners of `img`
 * (4-connected, plus a single-pixel dilation pass to catch anti-aliased
 * fringe pixels along the tile's rounded edge). Returns a `Uint8Array` mask,
 * one byte per pixel, 1 = "outside background", 0 = "tile/glyph".
 *
 * This separates the tile's rounded-corner background from its interior
 * white glyph without any manual coordinates: the glyph is fully enclosed by
 * the saturated blue tile, so it's never reachable from the white corners.
 */
function floodFillOutsideMask(img) {
  const { width, height, data } = img.bitmap;
  const mask = new Uint8Array(width * height);
  const stack = [];

  function seedCorner(x, y) {
    const idx = (y * width + x) * 4;
    if (isNearWhite(data[idx], data[idx + 1], data[idx + 2])) stack.push([x, y]);
  }
  seedCorner(0, 0);
  seedCorner(width - 1, 0);
  seedCorner(0, height - 1);
  seedCorner(width - 1, height - 1);

  // 8-connected: anti-aliased pixels along the tile's rounded-corner arc
  // are often only diagonally adjacent to each other (the arc is a thin
  // diagonal staircase at the pixel level). 4-connectivity leaves isolated
  // diagonal chains unreached, which get misclassified as "glyph" — a faint
  // stray line artifact along the corner curve.
  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const mIdx = y * width + x;
    if (mask[mIdx]) continue;
    const idx = mIdx * 4;
    if (!isNearWhite(data[idx], data[idx + 1], data[idx + 2])) continue;
    mask[mIdx] = 1;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) stack.push([nx, ny]);
      }
    }
  }

  // Dilate the mask by one pixel (8-connected) to sweep up anti-aliased
  // pixels that are "whitish" but fell under WHITE_THRESHOLD, which would
  // otherwise leave a faint light-gray fringe around the tile.
  const dilated = mask.slice();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const mIdx = y * width + x;
      if (mask[mIdx]) continue;
      const idx = mIdx * 4;
      const lightish = data[idx] > 180 && data[idx + 1] > 180 && data[idx + 2] > 180;
      if (!lightish) continue;
      let neighborIsOutside = false;
      for (let dy = -1; dy <= 1 && !neighborIsOutside; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[ny * width + nx]) {
            neighborIsOutside = true;
            break;
          }
        }
      }
      if (neighborIsOutside) dilated[mIdx] = 1;
    }
  }
  return dilated;
}

/**
 * Keeps only the largest 8-connected component of `predicate`-matching
 * pixels and clears the rest. Guards against stray specks/seams in the
 * source master (isolated pixel noise) leaking into the extracted glyph.
 */
function keepLargestComponent(width, height, matches) {
  const labels = new Int32Array(width * height).fill(-1);
  let bestLabel = -1;
  let bestSize = 0;
  let nextLabel = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const startIdx = y * width + x;
      if (!matches[startIdx] || labels[startIdx] !== -1) continue;
      const label = nextLabel++;
      const stack = [[x, y]];
      let size = 0;
      while (stack.length > 0) {
        const [cx, cy] = stack.pop();
        const idx = cy * width + cx;
        if (!matches[idx] || labels[idx] !== -1) continue;
        labels[idx] = label;
        size++;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) stack.push([nx, ny]);
          }
        }
      }
      if (size > bestSize) {
        bestSize = size;
        bestLabel = label;
      }
    }
  }

  const kept = new Uint8Array(width * height);
  for (let i = 0; i < kept.length; i++) kept[i] = labels[i] === bestLabel ? 1 : 0;
  return kept;
}

/** Square crop tightly bounding the tile (blue rounded square), centered on it. */
function squareTileCrop(master) {
  const box = boundingBox(master, (r, g, b) => !isNearWhite(r, g, b));
  const centerX = (box.minX + box.maxX) / 2;
  const centerY = (box.minY + box.maxY) / 2;
  const size = Math.max(box.width, box.height);
  const x = Math.round(centerX - size / 2);
  const y = Math.round(centerY - size / 2);
  return master.clone().crop({ x, y, w: size, h: size });
}

/** Tile crop with the outside-the-rounded-corners background made transparent. */
function tileWithTransparentCorners(tileCrop) {
  const outsideMask = floodFillOutsideMask(tileCrop);
  const img = tileCrop.clone();
  const { width, height, data } = img.bitmap;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (outsideMask[y * width + x]) {
        const idx = (y * width + x) * 4;
        data[idx + 3] = 0;
      }
    }
  }
  return img;
}

/**
 * Extracts the glyph as an opaque-white-on-transparent silhouette: pixels
 * that are near-white AND not reachable from the tile's corners (i.e.
 * enclosed by the blue tile) become opaque white; everything else
 * (background outside the tile, and the blue tile itself) is transparent.
 * Returned tightly autocropped to the glyph's own bounding box.
 */
function extractGlyphSilhouette(tileCrop) {
  const outsideMask = floodFillOutsideMask(tileCrop);
  const { width, height, data } = tileCrop.bitmap;
  const candidate = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const mIdx = y * width + x;
      const idx = mIdx * 4;
      candidate[mIdx] = !outsideMask[mIdx] && isNearWhite(data[idx], data[idx + 1], data[idx + 2]) ? 1 : 0;
    }
  }
  // Keep only the largest connected white region (the actual bell/pin
  // glyph) — discards any stray anti-aliasing specks elsewhere in the tile.
  const glyphMask = keepLargestComponent(width, height, candidate);

  const glyph = tileCrop.clone();
  const gd = glyph.bitmap.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const mIdx = y * width + x;
      const idx = mIdx * 4;
      gd[idx] = 255;
      gd[idx + 1] = 255;
      gd[idx + 2] = 255;
      gd[idx + 3] = glyphMask[mIdx] ? 255 : 0;
    }
  }
  const box = boundingBox(glyph, (r, g, b, a) => a > 0);
  return glyph.crop({ x: box.minX, y: box.minY, w: box.width, h: box.height });
}

/** Composites `glyph` centered on a transparent canvas of `canvasSize`, scaled to fill `ratio` of it. */
async function composeGlyphOnCanvas(glyph, canvasSize, ratio) {
  const scale = (canvasSize * ratio) / Math.max(glyph.bitmap.width, glyph.bitmap.height);
  const scaled = glyph.clone().scale(scale);
  const canvas = new Jimp({ width: canvasSize, height: canvasSize, color: 0x00000000 });
  const x = Math.round((canvasSize - scaled.bitmap.width) / 2);
  const y = Math.round((canvasSize - scaled.bitmap.height) / 2);
  canvas.composite(scaled, x, y);
  return canvas;
}

async function main() {
  const master = await Jimp.read(MASTER_PATH);

  // icon.png / favicon.png: straight resizes of the full master, preserving
  // its existing white margin convention (same as the assets they replace).
  const icon = master.clone().resize({ w: 1024, h: 1024 });
  await icon.write(path.join(OUT_DIR, "icon.png"));

  const favicon = master.clone().resize({ w: 48, h: 48 });
  await favicon.write(path.join(OUT_DIR, "favicon.png"));

  // On-screen logo tile: the tile only, rounded corners made transparent.
  const tileCrop = squareTileCrop(master);
  const splashIcon = tileWithTransparentCorners(tileCrop).resize({ w: 512, h: 512 });
  await splashIcon.write(path.join(OUT_DIR, "splash-icon.png"));

  // Android adaptive icon layers: white glyph silhouette on transparent,
  // centered and scaled into the safe zone. `android-icon-background.png`
  // is intentionally left untouched (still the plain blue gradient).
  const glyph = extractGlyphSilhouette(tileCrop);

  const foreground = await composeGlyphOnCanvas(glyph, 512, GLYPH_SAFE_ZONE_RATIO);
  await foreground.write(path.join(OUT_DIR, "android-icon-foreground.png"));

  const monochrome = await composeGlyphOnCanvas(glyph, 432, GLYPH_SAFE_ZONE_RATIO);
  await monochrome.write(path.join(OUT_DIR, "android-icon-monochrome.png"));

  console.log("Generated icon.png, favicon.png, splash-icon.png, android-icon-foreground.png, android-icon-monochrome.png");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
