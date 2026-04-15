/**
 * HDR Processor — Real-estate optimised exposure fusion
 *
 * Pipeline:
 *   1. Simulated 5-bracket capture  (EV -2 … +2, biased bright)
 *   2. Luminance-mask weighted fusion  (shadow→bright frame, highlight→dark frame)
 *   3. Real-estate tone mapping  (lift shadows +60, compress highlights -40)
 *   4. Auto brightness guarantee  (target mean luminance ≥ 160/255)
 *   5. White-balance + subtle saturation + light sharpen
 *   6. Quality gate  (re-process if still dark)
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
const BRACKET_EVS       = [-2, -1, 0, 1, 2];          // 5 stops
const BRACKET_EVS_FAST  = [-1.5, 0, 1.5];              // 3 stops
const TARGET_MEAN_LUM   = 160;                          // /255 — bright!
const MIN_ACCEPTABLE_LUM = 130;
const MAX_REPROCESS      = 2;

// ── Canvas from source ─────────────────────────────────
export function createCanvasFromSource(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  width?: number,
  height?: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const sh = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  canvas.width  = width  ?? sw;
  canvas.height = height ?? sh;
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// ── Simulate exposure bracket ──────────────────────────
function applyExposureCurve(src: HTMLCanvasElement, ev: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width  = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  if (Math.abs(ev) < 0.01) return c;

  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d   = img.data;
  const mul = Math.pow(2, ev);

  for (let i = 0; i < d.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      const v = d[i + ch] / 255;
      let adj: number;
      if (ev > 0) {
        // Lift — favour shadows strongly
        adj = 1 - Math.pow(1 - v, mul);
      } else {
        // Darken — protect highlights
        adj = Math.pow(v, Math.abs(mul));
      }
      d[i + ch] = clamp255(adj * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ── Generate brackets ──────────────────────────────────
export function generateBrackets(
  src: HTMLCanvasElement,
  quality: 'fast' | 'quality' = 'quality',
): BracketFrame[] {
  const evs = quality === 'fast' ? BRACKET_EVS_FAST : BRACKET_EVS;
  return evs.map(ev => ({
    canvas: applyExposureCurve(src, ev),
    exposureValue: ev,
    label: ev === 0 ? 'Normal' : ev > 0 ? `+${ev} EV` : `${ev} EV`,
  }));
}

// ── Luminance-mask weighted fusion ─────────────────────
// For each pixel we compute a per-bracket weight that:
//   • heavily favours bright frames in dark regions  (shadow lift)
//   • keeps dark frames for blown-out regions        (highlight recovery)
//   • uses well-exposedness Gaussian centred at 0.55  (slightly bright bias)

function computeWeightMap(canvas: HTMLCanvasElement, ev: number): Float32Array {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const d = ctx.getImageData(0, 0, width, height).data;
  const n = width * height;
  const w = new Float32Array(n);
  const sigma = 0.25;
  // Bias centre toward 0.55 so slightly-over-exposed pixels score higher
  const centre = 0.55;

  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    const r = d[idx] / 255, g = d[idx + 1] / 255, b = d[idx + 2] / 255;

    // Well-exposedness (Gaussian at centre)
    const we =
      Math.exp(-((r - centre) ** 2) / (2 * sigma * sigma)) *
      Math.exp(-((g - centre) ** 2) / (2 * sigma * sigma)) *
      Math.exp(-((b - centre) ** 2) / (2 * sigma * sigma));

    // Saturation
    const mean = (r + g + b) / 3;
    const sat = Math.sqrt(((r - mean) ** 2 + (g - mean) ** 2 + (b - mean) ** 2) / 3);

    // Luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Shadow-lift bias: if pixel is dark AND this is a bright bracket, boost weight
    let shadowBoost = 1;
    if (lum < 0.35 && ev > 0) shadowBoost = 1 + ev * 0.8;   // strong push
    if (lum < 0.20 && ev > 0) shadowBoost = 1 + ev * 1.5;   // very strong

    // Highlight-recovery: if pixel is bright AND this is a dark bracket, boost weight
    let hlBoost = 1;
    if (lum > 0.85 && ev < 0) hlBoost = 1 + Math.abs(ev) * 0.6;

    w[i] = (we + 0.01) * (sat + 0.05) * shadowBoost * hlBoost + 1e-6;
  }
  return w;
}

export function fuseHDR(brackets: BracketFrame[]): HTMLCanvasElement {
  if (brackets.length === 0) throw new Error('No brackets');
  if (brackets.length === 1) return brackets[0].canvas;

  const { width, height } = brackets[0].canvas;
  const n = width * height;

  // Weights
  const maps = brackets.map(b => computeWeightMap(b.canvas, b.exposureValue));
  const norm = maps.map(() => new Float32Array(n));
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let b = 0; b < brackets.length; b++) s += maps[b][i];
    for (let b = 0; b < brackets.length; b++) norm[b][i] = maps[b][i] / s;
  }

  const srcs = brackets.map(b => b.canvas.getContext('2d')!.getImageData(0, 0, width, height).data);

  const result = document.createElement('canvas');
  result.width  = width;
  result.height = height;
  const ctx  = result.getContext('2d')!;
  const out  = ctx.createImageData(width, height);
  const od   = out.data;

  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    let r = 0, g = 0, b = 0;
    for (let bi = 0; bi < brackets.length; bi++) {
      const w = norm[bi][i];
      r += srcs[bi][idx]     * w;
      g += srcs[bi][idx + 1] * w;
      b += srcs[bi][idx + 2] * w;
    }
    od[idx]     = clamp255(r);
    od[idx + 1] = clamp255(g);
    od[idx + 2] = clamp255(b);
    od[idx + 3] = 255;
  }

  ctx.putImageData(out, 0, 0);
  return result;
}

// ── Real-estate tone mapping ───────────────────────────
// Lift shadows aggressively, compress highlights gently, boost overall exposure
function realEstateToneMap(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width  = canvas.width;
  c.height = canvas.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0);

  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d   = img.data;

  // Build a lookup table for speed
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let v = i / 255;

    // 1. Lift shadows strongly (+60%)
    if (v < 0.4) {
      const t = v / 0.4;                       // 0→1 in shadow range
      v = v + (1 - t) * 0.25;                  // add up to +0.25 in deep shadows
    }

    // 2. Compress highlights gently (-40%)
    if (v > 0.75) {
      const t = (v - 0.75) / 0.25;             // 0→1 in highlight range
      v = v - t * 0.08;                        // subtract up to 0.08 in extreme highlights
    }

    // 3. Global exposure boost (+25%)
    v = v * 1.25;

    // 4. Very gentle S-curve for depth (subtle, not dramatic)
    v = gentleSCurve(v);

    lut[i] = clamp255(v * 255);
  }

  for (let i = 0; i < d.length; i += 4) {
    d[i]     = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }

  ctx.putImageData(img, 0, 0);
  return c;
}

function gentleSCurve(x: number): number {
  // Very subtle — barely visible
  const strength = 0.15;   // 0 = linear, 1 = full cubic S
  const curved = x < 0.5
    ? 2 * x * x
    : 1 - 2 * (1 - x) * (1 - x);
  return x + (curved - x) * strength;
}

// ── Auto brightness guarantee ──────────────────────────
function ensureBrightness(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d   = img.data;
  const n   = d.length / 4;

  // Measure mean luminance
  let sumLum = 0;
  for (let i = 0; i < d.length; i += 4) {
    sumLum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }
  const meanLum = sumLum / n;

  if (meanLum >= MIN_ACCEPTABLE_LUM) return canvas;  // already bright enough

  // Compute multiplier to reach target
  const boost = Math.min(TARGET_MEAN_LUM / (meanLum || 1), 2.0);

  const c = document.createElement('canvas');
  c.width  = canvas.width;
  c.height = canvas.height;
  const ctx2 = c.getContext('2d')!;
  ctx2.drawImage(canvas, 0, 0);
  const img2 = ctx2.getImageData(0, 0, c.width, c.height);
  const d2 = img2.data;

  for (let i = 0; i < d2.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      const v = d2[i + ch] / 255;
      // Lift with soft highlight protection
      const lifted = 1 - Math.pow(1 - v, boost);
      d2[i + ch] = clamp255(lifted * 255);
    }
  }
  ctx2.putImageData(img2, 0, 0);
  return c;
}

// ── White balance + colour clean-up ────────────────────
function autoWhiteBalance(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width  = canvas.width;
  c.height = canvas.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0);

  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d   = img.data;
  const n   = d.length / 4;

  // Gray-world white balance
  let sR = 0, sG = 0, sB = 0;
  for (let i = 0; i < d.length; i += 4) {
    sR += d[i]; sG += d[i + 1]; sB += d[i + 2];
  }
  const aR = sR / n, aG = sG / n, aB = sB / n;
  const avg = (aR + aG + aB) / 3;
  const scR = avg / (aR || 1);
  const scG = avg / (aG || 1);
  const scB = avg / (aB || 1);

  // Limit correction to ±20% to avoid colour shifts
  const limit = (v: number) => Math.max(0.8, Math.min(1.2, v));
  const fR = limit(scR), fG = limit(scG), fB = limit(scB);

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] * fR;
    let g = d[i + 1] * fG;
    let b = d[i + 2] * fB;

    // Subtle saturation boost (+8%)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    r = lum + (r - lum) * 1.08;
    g = lum + (g - lum) * 1.08;
    b = lum + (b - lum) * 1.08;

    d[i]     = clamp255(r);
    d[i + 1] = clamp255(g);
    d[i + 2] = clamp255(b);
  }

  ctx.putImageData(img, 0, 0);
  return c;
}

// ── Light noise reduction (3×3 bilateral-ish) ──────────
function lightDenoise(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width  = canvas.width;
  c.height = canvas.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0);

  const { width, height } = c;
  const src = ctx.getImageData(0, 0, width, height);
  const dst = ctx.createImageData(width, height);
  const sd = src.data, dd = dst.data;
  const sigmaRange = 25;   // colour similarity threshold

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Only denoise dark-ish areas (< 120 lum) to preserve detail in bright areas
      const lum = 0.299 * sd[idx] + 0.587 * sd[idx + 1] + 0.114 * sd[idx + 2];
      if (lum > 120) {
        dd[idx] = sd[idx]; dd[idx + 1] = sd[idx + 1]; dd[idx + 2] = sd[idx + 2]; dd[idx + 3] = 255;
        continue;
      }

      let wSum = 0, rSum = 0, gSum = 0, bSum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          const ni = (ny * width + nx) * 4;
          const diff = Math.abs(sd[ni] - sd[idx]) + Math.abs(sd[ni + 1] - sd[idx + 1]) + Math.abs(sd[ni + 2] - sd[idx + 2]);
          const w = Math.exp(-(diff * diff) / (2 * sigmaRange * sigmaRange * 3));
          wSum += w;
          rSum += sd[ni] * w;
          gSum += sd[ni + 1] * w;
          bSum += sd[ni + 2] * w;
        }
      }
      dd[idx]     = clamp255(rSum / wSum);
      dd[idx + 1] = clamp255(gSum / wSum);
      dd[idx + 2] = clamp255(bSum / wSum);
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

  onProgress?.({ stage: 'fusing', progress: 25, message: 'Fusion HDR intelligente…' });
  await yieldFrame();
  let result = fuseHDR(brackets);

  onProgress?.({ stage: 'enhancing', progress: 50, message: 'Tone mapping immobilier…' });
  await yieldFrame();
  result = realEstateToneMap(result);

  onProgress?.({ stage: 'enhancing', progress: 65, message: 'Boost luminosité…' });
  await yieldFrame();
  result = ensureBrightness(result);

  onProgress?.({ stage: 'enhancing', progress: 75, message: 'Balance des blancs…' });
  await yieldFrame();
  result = autoWhiteBalance(result);

  onProgress?.({ stage: 'enhancing', progress: 85, message: 'Réduction du bruit…' });
  await yieldFrame();
  result = lightDenoise(result);

  // Quality gate — re-check brightness after all processing
  for (let pass = 0; pass < MAX_REPROCESS; pass++) {
    const lum = measureMeanLuminance(result);
    if (lum >= MIN_ACCEPTABLE_LUM) break;
    result = ensureBrightness(result);
  }

  onProgress?.({ stage: 'done', progress: 100, message: 'Photo HDR prête !' });

  const blob    = await canvasToBlob(result, 'image/jpeg', 0.95);
  const dataUrl = result.toDataURL('image/jpeg', 0.95);

  return {
    canvas: result,
    blob,
    dataUrl,
    bracketCount: brackets.length,
    processingTimeMs: performance.now() - start,
  };
}

// ── Helpers ────────────────────────────────────────────
function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function measureMeanLuminance(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d')!;
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let s = 0;
  const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) {
    s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }
  return s / n;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
      type,
      quality,
    );
  });
}

function yieldFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

// ── Motion detection ───────────────────────────────────
export function detectMotion(
  prev: HTMLCanvasElement,
  curr: HTMLCanvasElement,
  threshold = 30,
): { motionScore: number; isStable: boolean } {
  const w = Math.min(prev.width, curr.width, 320);
  const h = Math.min(prev.height, curr.height, 240);

  const make = (src: HTMLCanvasElement) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(src, 0, 0, w, h);
    return c.getContext('2d')!.getImageData(0, 0, w, h).data;
  };

  const pd = make(prev), cd = make(curr);
  let diff = 0;
  const n = w * h;
  for (let i = 0; i < pd.length; i += 4) {
    diff += (Math.abs(pd[i] - cd[i]) + Math.abs(pd[i + 1] - cd[i + 1]) + Math.abs(pd[i + 2] - cd[i + 2])) / 3;
  }
  const motionScore = diff / n;
  return { motionScore, isStable: motionScore < threshold };
}
