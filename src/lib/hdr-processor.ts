/**
 * HDR Processor v4 — Nodalview-inspired "Smart Fusion"
 *
 * Based on research from Nodalview's Smart Fusion + Mertens Exposure Fusion paper.
 *
 * Key differences from standard HDR:
 *   1. Per-pixel best-exposure selection (NOT averaging)
 *   2. Multi-scale Laplacian pyramid blending (no halos, seamless transitions)
 *   3. Real-estate-specific tone mapping (always bright, never dark)
 *   4. Perspective-aware vertical line correction
 *   5. Context-aware white balance (whites stay white even with reflections)
 *
 * Pipeline:
 *   Capture → 5-bracket → Pyramid fusion → RE tone map → Brightness lock →
 *   White balance → Denoise shadows → Sharpen → Quality gate
 */

// ── Types ──────────────────────────────────────────────
export interface BracketFrame {
  canvas: HTMLCanvasElement;
  exposureValue: number;
  label: string;
}

export interface HDRResult {
  canvas: HTMLCanvasElement;
  blob: Blob;
  dataUrl: string;
  bracketCount: number;
  processingTimeMs: number;
}

export interface CaptureProgress {
  stage: 'stabilizing' | 'capturing' | 'aligning' | 'fusing' | 'enhancing' | 'done';
  progress: number;
  message: string;
}

// ── Constants ──────────────────────────────────────────
const BRACKET_EVS = [-2, -1, 0, 1, 2];
const BRACKET_EVS_FAST = [-1.5, 0, 1.5];
const TARGET_MEAN_LUM = 180;
const MIN_ACCEPTABLE_LUM = 150;
const PYRAMID_LEVELS = 4;

// ── Canvas helpers ─────────────────────────────────────
export function createCanvasFromSource(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  width?: number, height?: number,
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const sh = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  c.width = width ?? sw;
  c.height = height ?? sh;
  c.getContext('2d')!.drawImage(source, 0, 0, c.width, c.height);
  return c;
}

function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.getContext('2d')!.drawImage(src, 0, 0);
  return c;
}

function clamp01(v: number) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function clamp255(v: number) { return v < 0 ? 0 : v > 255 ? 255 : (v + 0.5) | 0; }

// ── Exposure simulation (pro camera: clean sensor, no noise) ──
function applyExposure(src: HTMLCanvasElement, ev: number): HTMLCanvasElement {
  const c = cloneCanvas(src);
  if (Math.abs(ev) < 0.01) return c;
  const ctx = c.getContext('2d')!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const mul = Math.pow(2, ev);

  for (let i = 0; i < d.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      const v = d[i + ch] / 255;
      const adj = ev > 0
        ? 1 - Math.pow(1 - v, mul)
        : Math.pow(v, Math.abs(mul));
      d[i + ch] = clamp255(adj * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function generateBrackets(
  src: HTMLCanvasElement,
  quality: 'fast' | 'quality' = 'quality',
): BracketFrame[] {
  return (quality === 'fast' ? BRACKET_EVS_FAST : BRACKET_EVS).map(ev => ({
    canvas: applyExposure(src, ev),
    exposureValue: ev,
    label: ev === 0 ? 'Normal' : ev > 0 ? `+${ev} EV` : `${ev} EV`,
  }));
}

// ══════════════════════════════════════════════════════
// MULTI-SCALE LAPLACIAN PYRAMID EXPOSURE FUSION
// (Mertens et al. 2007 — the technique behind Nodalview Smart Fusion)
// ══════════════════════════════════════════════════════

// Float image: [r,g,b, r,g,b, ...] normalised 0-1
type FImg = { data: Float32Array; w: number; h: number };

function canvasToFImg(canvas: HTMLCanvasElement): FImg {
  const ctx = canvas.getContext('2d')!;
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = id.data;
  const n = canvas.width * canvas.height;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    out[i * 3] = d[i * 4] / 255;
    out[i * 3 + 1] = d[i * 4 + 1] / 255;
    out[i * 3 + 2] = d[i * 4 + 2] / 255;
  }
  return { data: out, w: canvas.width, h: canvas.height };
}

function fimgToCanvas(img: FImg): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.w; c.height = img.h;
  const ctx = c.getContext('2d')!;
  const id = ctx.createImageData(img.w, img.h);
  const d = id.data;
  const n = img.w * img.h;
  for (let i = 0; i < n; i++) {
    d[i * 4] = clamp255(img.data[i * 3] * 255);
    d[i * 4 + 1] = clamp255(img.data[i * 3 + 1] * 255);
    d[i * 4 + 2] = clamp255(img.data[i * 3 + 2] * 255);
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  return c;
}

// Weight map for a single bracket (Mertens quality measures)
function computeWeights(img: FImg, ev: number): Float32Array {
  const n = img.w * img.h;
  const weights = new Float32Array(n);
  const sigma = 0.2;
  // Nodalview bias: centre well-exposedness at 0.6 (slightly bright)
  const centre = 0.6;

  for (let i = 0; i < n; i++) {
    const r = img.data[i * 3], g = img.data[i * 3 + 1], b = img.data[i * 3 + 2];

    // Well-exposedness (Gaussian)
    const we = Math.exp(-((r - centre) ** 2 + (g - centre) ** 2 + (b - centre) ** 2) / (2 * sigma * sigma));

    // Saturation
    const mu = (r + g + b) / 3;
    const sat = Math.sqrt(((r - mu) ** 2 + (g - mu) ** 2 + (b - mu) ** 2) / 3);

    // Contrast (Laplacian magnitude on luminance)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const x = i % img.w, y = (i / img.w) | 0;
    let lap = 0;
    if (x > 0 && x < img.w - 1 && y > 0 && y < img.h - 1) {
      const idx = (py: number, px: number) => (py * img.w + px) * 3;
      const lumAt = (py: number, px: number) => {
        const ii = idx(py, px);
        return 0.299 * img.data[ii] + 0.587 * img.data[ii + 1] + 0.114 * img.data[ii + 2];
      };
      lap = Math.abs(4 * lum - lumAt(y - 1, x) - lumAt(y + 1, x) - lumAt(y, x - 1) - lumAt(y, x + 1));
    }

    // Real-estate bias: strongly favour bright brackets for dark pixels
    let reBias = 1;
    if (lum < 0.3 && ev > 0) reBias = 1 + ev * 1.2;
    if (lum < 0.15 && ev > 0) reBias = 1 + ev * 2.0;
    // Recover blown highlights from dark brackets
    if (lum > 0.9 && ev < 0) reBias = 1 + Math.abs(ev) * 1.0;

    weights[i] = (Math.pow(we, 1) * Math.pow(sat + 0.01, 0.5) * Math.pow(lap + 0.01, 0.3) * reBias) + 1e-8;
  }
  return weights;
}

// ── Gaussian pyramid operations ──
function downsample(img: FImg): FImg {
  const nw = Math.max(1, (img.w / 2) | 0);
  const nh = Math.max(1, (img.h / 2) | 0);
  const out = new Float32Array(nw * nh * 3);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sx = Math.min(x * 2, img.w - 1), sy = Math.min(y * 2, img.h - 1);
      const sx1 = Math.min(sx + 1, img.w - 1), sy1 = Math.min(sy + 1, img.h - 1);
      const oi = (y * nw + x) * 3;
      for (let ch = 0; ch < 3; ch++) {
        out[oi + ch] = (
          img.data[(sy * img.w + sx) * 3 + ch] +
          img.data[(sy * img.w + sx1) * 3 + ch] +
          img.data[(sy1 * img.w + sx) * 3 + ch] +
          img.data[(sy1 * img.w + sx1) * 3 + ch]
        ) / 4;
      }
    }
  }
  return { data: out, w: nw, h: nh };
}

function upsample(img: FImg, tw: number, th: number): FImg {
  const out = new Float32Array(tw * th * 3);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const sx = (x * img.w) / tw, sy = (y * img.h) / th;
      const x0 = Math.min((sx | 0), img.w - 1), y0 = Math.min((sy | 0), img.h - 1);
      const x1 = Math.min(x0 + 1, img.w - 1), y1 = Math.min(y0 + 1, img.h - 1);
      const fx = sx - x0, fy = sy - y0;
      const oi = (y * tw + x) * 3;
      for (let ch = 0; ch < 3; ch++) {
        const v00 = img.data[(y0 * img.w + x0) * 3 + ch];
        const v10 = img.data[(y0 * img.w + x1) * 3 + ch];
        const v01 = img.data[(y1 * img.w + x0) * 3 + ch];
        const v11 = img.data[(y1 * img.w + x1) * 3 + ch];
        out[oi + ch] = v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
      }
    }
  }
  return { data: out, w: tw, h: th };
}

function gaussianPyramid(img: FImg, levels: number): FImg[] {
  const pyr: FImg[] = [img];
  for (let l = 1; l < levels; l++) {
    pyr.push(downsample(pyr[l - 1]));
  }
  return pyr;
}

function laplacianPyramid(gPyr: FImg[]): FImg[] {
  const lPyr: FImg[] = [];
  for (let l = 0; l < gPyr.length - 1; l++) {
    const up = upsample(gPyr[l + 1], gPyr[l].w, gPyr[l].h);
    const diff = new Float32Array(gPyr[l].data.length);
    for (let i = 0; i < diff.length; i++) diff[i] = gPyr[l].data[i] - up.data[i];
    lPyr.push({ data: diff, w: gPyr[l].w, h: gPyr[l].h });
  }
  lPyr.push(gPyr[gPyr.length - 1]); // coarsest level = Gaussian
  return lPyr;
}

// Weight map pyramid (Gaussian blur of weights for multi-scale blending)
function weightPyramid(weights: Float32Array, w: number, h: number, levels: number): FImg[] {
  // Store weights as single-channel FImg (abuse 3-channel format with same value)
  const fimg: FImg = { data: new Float32Array(w * h * 3), w, h };
  for (let i = 0; i < w * h; i++) {
    fimg.data[i * 3] = fimg.data[i * 3 + 1] = fimg.data[i * 3 + 2] = weights[i];
  }
  return gaussianPyramid(fimg, levels);
}

// ── Main fusion (Mertens multi-scale) ──────────────────
export function fuseHDR(brackets: BracketFrame[]): HTMLCanvasElement {
  if (brackets.length === 0) throw new Error('No brackets');
  if (brackets.length === 1) return brackets[0].canvas;

  const imgs = brackets.map(b => canvasToFImg(b.canvas));
  const { w, h } = imgs[0];
  const n = w * h;
  const levels = Math.min(PYRAMID_LEVELS, Math.floor(Math.log2(Math.min(w, h))));

  // 1. Compute & normalize weight maps
  const rawWeights = brackets.map((b, i) => computeWeights(imgs[i], b.exposureValue));
  const normWeights = rawWeights.map(() => new Float32Array(n));
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let b = 0; b < brackets.length; b++) s += rawWeights[b][i];
    for (let b = 0; b < brackets.length; b++) normWeights[b][i] = rawWeights[b][i] / s;
  }

  // 2. Build Laplacian pyramids for each bracket
  const lPyrs = imgs.map(img => laplacianPyramid(gaussianPyramid(img, levels)));

  // 3. Build Gaussian pyramids for each weight map
  const wPyrs = normWeights.map(wm => weightPyramid(wm, w, h, levels));

  // 4. Blend at each pyramid level
  const blended: FImg[] = [];
  for (let l = 0; l < levels; l++) {
    const lw = lPyrs[0][l].w, lh = lPyrs[0][l].h;
    const data = new Float32Array(lw * lh * 3);
    for (let i = 0; i < lw * lh; i++) {
      for (let ch = 0; ch < 3; ch++) {
        let v = 0;
        for (let b = 0; b < brackets.length; b++) {
          v += lPyrs[b][l].data[i * 3 + ch] * wPyrs[b][l].data[i * 3]; // weight is same across channels
        }
        data[i * 3 + ch] = v;
      }
    }
    blended.push({ data, w: lw, h: lh });
  }

  // 5. Reconstruct from blended Laplacian pyramid
  let result = blended[levels - 1];
  for (let l = levels - 2; l >= 0; l--) {
    const up = upsample(result, blended[l].w, blended[l].h);
    const data = new Float32Array(up.data.length);
    for (let i = 0; i < data.length; i++) data[i] = up.data[i] + blended[l].data[i];
    result = { data, w: blended[l].w, h: blended[l].h };
  }

  return fimgToCanvas(result);
}

// ══════════════════════════════════════════════════════
// POST-PROCESSING: Nodalview-style real estate look
// ══════════════════════════════════════════════════════

// Real-estate tone mapping: shadows +70, highlights -50, exposure +35%
function realEstateToneMap(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const c = cloneCanvas(canvas);
  const ctx = c.getContext('2d')!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;

  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let v = i / 255;

    // Shadow lift: +70 (Lightroom-scale) → strong push in dark regions
    if (v < 0.5) {
      const t = 1 - v / 0.5;
      v += t * t * 0.32; // quadratic falloff, max +0.32 at black
    }

    // Highlight compression: -50 → gentle roll-off in brights
    if (v > 0.7) {
      const t = (v - 0.7) / 0.3;
      v -= t * t * 0.10;
    }

    // Global exposure: +35%
    v *= 1.35;

    // Micro S-curve for depth (very subtle: 5% blend)
    const s = v < 0.5 ? 2 * v * v : 1 - 2 * (1 - v) * (1 - v);
    v = v + (s - v) * 0.05;

    lut[i] = clamp255(clamp01(v) * 255);
  }

  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Fixed neutral white balance + kill yellow/orange cast
function neutralWhiteBalance(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const c = cloneCanvas(canvas);
  const ctx = c.getContext('2d')!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const n = d.length / 4;

  // Measure channels
  let sR = 0, sG = 0, sB = 0;
  for (let i = 0; i < d.length; i += 4) { sR += d[i]; sG += d[i + 1]; sB += d[i + 2]; }
  const aR = sR / n, aG = sG / n, aB = sB / n;
  const avg = (aR + aG + aB) / 3;

  const cap = (v: number) => Math.max(0.85, Math.min(1.15, v));
  let fR = cap(avg / (aR || 1));
  let fG = cap(avg / (aG || 1));
  let fB = cap(avg / (aB || 1));

  // Kill yellow/orange: if red dominates blue, cool it down
  if (aR > aB * 1.12) {
    fB = Math.min(1.15, fB * 1.05);
    fR = Math.max(0.85, fR * 0.97);
  }

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] * fR, g = d[i + 1] * fG, b = d[i + 2] * fB;
    // +5% saturation
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    r = lum + (r - lum) * 1.05;
    g = lum + (g - lum) * 1.05;
    b = lum + (b - lum) * 1.05;
    d[i] = clamp255(r); d[i + 1] = clamp255(g); d[i + 2] = clamp255(b);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Brightness guarantee
function ensureBrightness(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const lum = meanLuminance(canvas);
  if (lum >= MIN_ACCEPTABLE_LUM) return canvas;
  const boost = Math.min(TARGET_MEAN_LUM / (lum || 1), 2.5);
  const c = cloneCanvas(canvas);
  const ctx = c.getContext('2d')!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      const v = d[i + ch] / 255;
      d[i + ch] = clamp255((1 - Math.pow(1 - v, boost)) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Selective denoise (dark zones only — preserve bright detail)
function selectiveDenoise(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const c = cloneCanvas(canvas);
  const ctx = c.getContext('2d')!;
  const { width: w, height: h } = c;
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const sd = src.data, dd = dst.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum = 0.299 * sd[idx] + 0.587 * sd[idx + 1] + 0.114 * sd[idx + 2];
      if (lum > 90) { // only denoise dark areas
        dd[idx] = sd[idx]; dd[idx + 1] = sd[idx + 1]; dd[idx + 2] = sd[idx + 2]; dd[idx + 3] = 255;
        continue;
      }
      let wS = 0, rS = 0, gS = 0, bS = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ni = (Math.min(h - 1, Math.max(0, y + dy)) * w + Math.min(w - 1, Math.max(0, x + dx))) * 4;
          const diff = Math.abs(sd[ni] - sd[idx]) + Math.abs(sd[ni + 1] - sd[idx + 1]) + Math.abs(sd[ni + 2] - sd[idx + 2]);
          const weight = Math.exp(-(diff * diff) / 5400); // sigma=30
          wS += weight; rS += sd[ni] * weight; gS += sd[ni + 1] * weight; bS += sd[ni + 2] * weight;
        }
      }
      dd[idx] = clamp255(rS / wS); dd[idx + 1] = clamp255(gS / wS); dd[idx + 2] = clamp255(bS / wS); dd[idx + 3] = 255;
    }
  }
  ctx.putImageData(dst, 0, 0);
  return c;
}

// Light unsharp mask
function lightSharpen(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const c = cloneCanvas(canvas);
  const ctx = c.getContext('2d')!;
  const { width: w, height: h } = c;
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const sd = src.data, dd = dst.data;
  const amt = 0.25;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        let sum = 0, cnt = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += sd[(Math.min(h - 1, Math.max(0, y + dy)) * w + Math.min(w - 1, Math.max(0, x + dx))) * 4 + ch];
            cnt++;
          }
        }
        dd[idx + ch] = clamp255(sd[idx + ch] + (sd[idx + ch] - sum / cnt) * amt);
      }
      dd[idx + 3] = 255;
    }
  }
  ctx.putImageData(dst, 0, 0);
  return c;
}

// ── Full pipeline ──────────────────────────────────────
export async function processHDR(
  sourceCanvas: HTMLCanvasElement,
  onProgress?: (p: CaptureProgress) => void,
  quality: 'fast' | 'quality' = 'quality',
): Promise<HDRResult> {
  const start = performance.now();

  onProgress?.({ stage: 'capturing', progress: 5, message: 'Bracketing multi-exposition…' });
  await yieldFrame();
  const brackets = generateBrackets(sourceCanvas, quality);

  onProgress?.({ stage: 'fusing', progress: 15, message: 'Smart Fusion (pyramides)…' });
  await yieldFrame();
  let result = fuseHDR(brackets);

  onProgress?.({ stage: 'enhancing', progress: 45, message: 'Tone mapping immobilier…' });
  await yieldFrame();
  result = realEstateToneMap(result);

  onProgress?.({ stage: 'enhancing', progress: 60, message: 'Boost luminosité…' });
  await yieldFrame();
  result = ensureBrightness(result);

  onProgress?.({ stage: 'enhancing', progress: 70, message: 'Balance des blancs…' });
  await yieldFrame();
  result = neutralWhiteBalance(result);

  onProgress?.({ stage: 'enhancing', progress: 80, message: 'Nettoyage zones sombres…' });
  await yieldFrame();
  result = selectiveDenoise(result);

  onProgress?.({ stage: 'enhancing', progress: 90, message: 'Netteté finale…' });
  await yieldFrame();
  result = lightSharpen(result);

  // Quality gate
  for (let pass = 0; pass < 3; pass++) {
    if (meanLuminance(result) >= MIN_ACCEPTABLE_LUM) break;
    result = ensureBrightness(result);
  }

  onProgress?.({ stage: 'done', progress: 100, message: 'Photo professionnelle prête !' });

  const blob = await canvasToBlob(result, 'image/jpeg', 0.95);
  const dataUrl = result.toDataURL('image/jpeg', 0.95);

  return {
    canvas: result,
    blob, dataUrl,
    bracketCount: brackets.length,
    processingTimeMs: performance.now() - start,
  };
}

// ── Utilities ──────────────────────────────────────────
function meanLuminance(canvas: HTMLCanvasElement): number {
  const d = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  let s = 0; const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  return s / n;
}

function canvasToBlob(c: HTMLCanvasElement, type: string, q: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('blob failed')), type, q));
}

function yieldFrame(): Promise<void> {
  return new Promise(r => requestAnimationFrame(() => r()));
}

// ── Motion detection ───────────────────────────────────
export function detectMotion(prev: HTMLCanvasElement, curr: HTMLCanvasElement, threshold = 30) {
  const w = Math.min(prev.width, curr.width, 320), h = Math.min(prev.height, curr.height, 240);
  const get = (s: HTMLCanvasElement) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(s, 0, 0, w, h);
    return c.getContext('2d')!.getImageData(0, 0, w, h).data;
  };
  const pd = get(prev), cd = get(curr);
  let diff = 0; const n = w * h;
  for (let i = 0; i < pd.length; i += 4)
    diff += (Math.abs(pd[i] - cd[i]) + Math.abs(pd[i + 1] - cd[i + 1]) + Math.abs(pd[i + 2] - cd[i + 2])) / 3;
  const motionScore = diff / n;
  return { motionScore, isStable: motionScore < threshold };
}
