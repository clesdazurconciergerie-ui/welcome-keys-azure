/**
 * HDR Processor v3 — Professional real-estate camera simulation
 *
 * Philosophy: Commercial beauty > reality. Always bright, clean, sharp.
 *
 * Pipeline:
 *   1. Simulated pro camera (ISO 100, f/8, fixed WB)
 *   2. 5-bracket capture (EV -2 … +2)
 *   3. Per-pixel best-exposure selection (NOT averaging)
 *   4. Forced brightness lift (exposure +30%, shadows +60, highlights -40)
 *   5. Fixed white balance (neutral 5500K, kill yellow/orange cast)
 *   6. Selective denoise (dark zones only)
 *   7. Light sharpen
 *   8. Quality gate: reprocess if dark
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
const TARGET_MEAN_LUM = 175; // very bright target
const MIN_ACCEPTABLE_LUM = 145;

// ── Canvas from source ─────────────────────────────────
export function createCanvasFromSource(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  width?: number,
  height?: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const sh = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  canvas.width = width ?? sw;
  canvas.height = height ?? sh;
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// ── Simulate exposure (pro camera: clean, no noise) ────
function applyExposure(src: HTMLCanvasElement, ev: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  if (Math.abs(ev) < 0.01) return c;

  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const mul = Math.pow(2, ev);

  for (let i = 0; i < d.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      const v = d[i + ch] / 255;
      // Clean power curve — simulates sensor response, not software gamma
      const adjusted = ev > 0
        ? 1 - Math.pow(1 - v, mul)   // lift shadows, soft highlight rolloff
        : Math.pow(v, Math.abs(mul)); // darken, preserve highlights
      d[i + ch] = clamp255(adjusted * 255);
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
    canvas: applyExposure(src, ev),
    exposureValue: ev,
    label: ev === 0 ? 'Normal' : ev > 0 ? `+${ev} EV` : `${ev} EV`,
  }));
}

// ── BEST-EXPOSURE SELECTION (not HDR averaging) ────────
// For each pixel, pick the single best bracket:
//   • Dark pixel (lum < 0.3) → pick brightest bracket (EV+2, then +1)
//   • Bright pixel (lum > 0.85) → pick darkest bracket (EV-2, then -1)
//   • Mid pixel → pick EV 0 or slight preference for brighter
// Then blend slightly with neighbours to avoid harsh edges.

export function fuseHDR(brackets: BracketFrame[]): HTMLCanvasElement {
  if (brackets.length === 0) throw new Error('No brackets');
  if (brackets.length === 1) return brackets[0].canvas;

  const { width, height } = brackets[0].canvas;
  const n = width * height;

  // Sort brackets by EV (darkest first)
  const sorted = [...brackets].sort((a, b) => a.exposureValue - b.exposureValue);
  const srcs = sorted.map(b => b.canvas.getContext('2d')!.getImageData(0, 0, width, height).data);

  const result = document.createElement('canvas');
  result.width = width;
  result.height = height;
  const ctx = result.getContext('2d')!;
  const out = ctx.createImageData(width, height);
  const od = out.data;

  for (let i = 0; i < n; i++) {
    const idx = i * 4;

    // Measure luminance from the middle exposure (EV 0)
    const midIdx = Math.floor(sorted.length / 2);
    const midR = srcs[midIdx][idx], midG = srcs[midIdx][idx + 1], midB = srcs[midIdx][idx + 2];
    const midLum = (0.299 * midR + 0.587 * midG + 0.114 * midB) / 255;

    // Decide which exposures to blend based on zone
    let weights: number[];

    if (midLum < 0.15) {
      // Very dark → almost entirely from brightest frames
      weights = sorted.map(b => b.exposureValue >= 1 ? 5 : b.exposureValue === 0 ? 0.5 : 0.05);
    } else if (midLum < 0.35) {
      // Dark → favour bright frames heavily
      weights = sorted.map(b => {
        if (b.exposureValue >= 2) return 4;
        if (b.exposureValue >= 1) return 3;
        if (b.exposureValue === 0) return 1;
        return 0.1;
      });
    } else if (midLum > 0.92) {
      // Blown out → use darkest frames
      weights = sorted.map(b => b.exposureValue <= -1 ? 4 : b.exposureValue === 0 ? 1 : 0.1);
    } else if (midLum > 0.75) {
      // Bright → favour darker frames to recover highlights
      weights = sorted.map(b => {
        if (b.exposureValue <= -2) return 3;
        if (b.exposureValue <= -1) return 2.5;
        if (b.exposureValue === 0) return 2;
        if (b.exposureValue >= 1) return 0.5;
        return 0.3;
      });
    } else {
      // Mid-range → slight preference for brighter to keep image luminous
      weights = sorted.map(b => {
        if (b.exposureValue === 0) return 2;
        if (b.exposureValue === 1) return 2.5;
        if (b.exposureValue === 2) return 1.5;
        if (b.exposureValue === -1) return 1;
        return 0.5;
      });
    }

    // Normalize and blend
    const wSum = weights.reduce((a, b) => a + b, 0);
    let r = 0, g = 0, b = 0;
    for (let bi = 0; bi < sorted.length; bi++) {
      const w = weights[bi] / wSum;
      r += srcs[bi][idx] * w;
      g += srcs[bi][idx + 1] * w;
      b += srcs[bi][idx + 2] * w;
    }

    od[idx] = clamp255(r);
    od[idx + 1] = clamp255(g);
    od[idx + 2] = clamp255(b);
    od[idx + 3] = 255;
  }

  ctx.putImageData(out, 0, 0);
  return result;
}

// ── Real-estate brightness + tone ──────────────────────
function realEstateToneMap(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const c = cloneCanvas(canvas);
  const ctx = c.getContext('2d')!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;

  // Build LUT
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let v = i / 255;

    // 1. Shadow lift: aggressive (+60 on 0-100 scale ≈ +0.24 on 0-1)
    if (v < 0.45) {
      const t = 1 - v / 0.45; // 1 at black, 0 at mid
      v += t * 0.28;
    }

    // 2. Highlight compression (-40 ≈ -0.06 at top)
    if (v > 0.8) {
      const t = (v - 0.8) / 0.2;
      v -= t * 0.06;
    }

    // 3. Global exposure boost +30%
    v *= 1.30;

    // 4. Micro contrast (very gentle)
    const curved = v < 0.5 ? 2 * v * v : 1 - 2 * (1 - v) * (1 - v);
    v = v + (curved - v) * 0.08; // 8% S-curve blend

    lut[i] = clamp255(v * 255);
  }

  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }

  ctx.putImageData(img, 0, 0);
  return c;
}

// ── Fixed white balance (5500K neutral, kill yellow cast) ──
function fixedWhiteBalance(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const c = cloneCanvas(canvas);
  const ctx = c.getContext('2d')!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const n = d.length / 4;

  // Measure channel averages
  let sR = 0, sG = 0, sB = 0;
  for (let i = 0; i < d.length; i += 4) {
    sR += d[i]; sG += d[i + 1]; sB += d[i + 2];
  }
  const aR = sR / n, aG = sG / n, aB = sB / n;
  const avg = (aR + aG + aB) / 3;

  // Correction factors clamped to ±15%
  const clampF = (v: number) => Math.max(0.85, Math.min(1.15, v));
  let fR = clampF(avg / (aR || 1));
  let fG = clampF(avg / (aG || 1));
  let fB = clampF(avg / (aB || 1));

  // Extra: suppress yellow/orange cast (push blue up slightly if R>B significantly)
  if (aR > aB * 1.15) {
    fB = Math.min(1.15, fB * 1.04);
    fR = Math.max(0.85, fR * 0.98);
  }

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] * fR;
    let g = d[i + 1] * fG;
    let b = d[i + 2] * fB;

    // Subtle saturation (+5% only — keep it natural)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    r = lum + (r - lum) * 1.05;
    g = lum + (g - lum) * 1.05;
    b = lum + (b - lum) * 1.05;

    d[i] = clamp255(r);
    d[i + 1] = clamp255(g);
    d[i + 2] = clamp255(b);
  }

  ctx.putImageData(img, 0, 0);
  return c;
}

// ── Brightness guarantee ───────────────────────────────
function ensureBrightness(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const lum = measureMeanLuminance(canvas);
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

// ── Selective denoise (dark zones only) ────────────────
function selectiveDenoise(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const c = cloneCanvas(canvas);
  const ctx = c.getContext('2d')!;
  const { width, height } = c;
  const src = ctx.getImageData(0, 0, width, height);
  const dst = ctx.createImageData(width, height);
  const sd = src.data, dd = dst.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lum = 0.299 * sd[idx] + 0.587 * sd[idx + 1] + 0.114 * sd[idx + 2];

      // Only denoise below luminance 100 — preserve bright detail
      if (lum > 100) {
        dd[idx] = sd[idx]; dd[idx + 1] = sd[idx + 1]; dd[idx + 2] = sd[idx + 2]; dd[idx + 3] = 255;
        continue;
      }

      // 3×3 bilateral blur
      let wS = 0, rS = 0, gS = 0, bS = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          const ni = (ny * width + nx) * 4;
          const diff = Math.abs(sd[ni] - sd[idx]) + Math.abs(sd[ni + 1] - sd[idx + 1]) + Math.abs(sd[ni + 2] - sd[idx + 2]);
          const w = Math.exp(-(diff * diff) / (2 * 30 * 30 * 3));
          wS += w; rS += sd[ni] * w; gS += sd[ni + 1] * w; bS += sd[ni + 2] * w;
        }
      }
      dd[idx] = clamp255(rS / wS);
      dd[idx + 1] = clamp255(gS / wS);
      dd[idx + 2] = clamp255(bS / wS);
      dd[idx + 3] = 255;
    }
  }

  ctx.putImageData(dst, 0, 0);
  return c;
}

// ── Light unsharp mask ─────────────────────────────────
function lightSharpen(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const c = cloneCanvas(canvas);
  const ctx = c.getContext('2d')!;
  const { width, height } = c;
  const src = ctx.getImageData(0, 0, width, height);
  const dst = ctx.createImageData(width, height);
  const sd = src.data, dd = dst.data;
  const amount = 0.3; // subtle

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        // Simple 3×3 average for blur approximation
        let sum = 0, cnt = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = Math.min(width - 1, Math.max(0, x + dx));
            const ny = Math.min(height - 1, Math.max(0, y + dy));
            sum += sd[(ny * width + nx) * 4 + ch];
            cnt++;
          }
        }
        const blur = sum / cnt;
        const sharp = sd[idx + ch] + (sd[idx + ch] - blur) * amount;
        dd[idx + ch] = clamp255(sharp);
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

  onProgress?.({ stage: 'capturing', progress: 5, message: 'Simulation caméra pro…' });
  await yieldFrame();
  const brackets = generateBrackets(sourceCanvas, quality);

  onProgress?.({ stage: 'fusing', progress: 20, message: 'Sélection intelligente par zone…' });
  await yieldFrame();
  let result = fuseHDR(brackets);

  onProgress?.({ stage: 'enhancing', progress: 40, message: 'Tone mapping immobilier…' });
  await yieldFrame();
  result = realEstateToneMap(result);

  onProgress?.({ stage: 'enhancing', progress: 55, message: 'Boost luminosité…' });
  await yieldFrame();
  result = ensureBrightness(result);

  onProgress?.({ stage: 'enhancing', progress: 65, message: 'Balance des blancs fixe…' });
  await yieldFrame();
  result = fixedWhiteBalance(result);

  onProgress?.({ stage: 'enhancing', progress: 75, message: 'Réduction du bruit…' });
  await yieldFrame();
  result = selectiveDenoise(result);

  onProgress?.({ stage: 'enhancing', progress: 85, message: 'Netteté…' });
  await yieldFrame();
  result = lightSharpen(result);

  // Quality gate — reprocess up to 3× if too dark
  for (let pass = 0; pass < 3; pass++) {
    if (measureMeanLuminance(result) >= MIN_ACCEPTABLE_LUM) break;
    result = ensureBrightness(result);
  }

  onProgress?.({ stage: 'done', progress: 100, message: 'Photo professionnelle prête !' });

  const blob = await canvasToBlob(result, 'image/jpeg', 0.95);
  const dataUrl = result.toDataURL('image/jpeg', 0.95);

  return {
    canvas: result,
    blob,
    dataUrl,
    bracketCount: brackets.length,
    processingTimeMs: performance.now() - start,
  };
}

// ── Utilities ──────────────────────────────────────────
function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : (v + 0.5) | 0;
}

function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d')!.drawImage(src, 0, 0);
  return c;
}

function measureMeanLuminance(canvas: HTMLCanvasElement): number {
  const d = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
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
      blob => (blob ? resolve(blob) : reject(new Error('Failed to create blob'))),
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
  const getData = (src: HTMLCanvasElement) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(src, 0, 0, w, h);
    return c.getContext('2d')!.getImageData(0, 0, w, h).data;
  };
  const pd = getData(prev), cd = getData(curr);
  let diff = 0;
  const n = w * h;
  for (let i = 0; i < pd.length; i += 4) {
    diff += (Math.abs(pd[i] - cd[i]) + Math.abs(pd[i + 1] - cd[i + 1]) + Math.abs(pd[i + 2] - cd[i + 2])) / 3;
  }
  const motionScore = diff / n;
  return { motionScore, isStable: motionScore < threshold };
}
