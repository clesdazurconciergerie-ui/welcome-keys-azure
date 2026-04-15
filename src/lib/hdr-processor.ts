/**
 * Photo Processor — Minimal prep for AI enhancement
 * 
 * All heavy lifting is done server-side by the AI.
 * This module only handles:
 *   - Canvas capture from camera/video/file
 *   - Auto-levels normalization (clean input for AI)
 *   - Motion/stability detection for camera UX
 */

// ── Types ──────────────────────────────────────────────
export interface HDRResult {
  canvas: HTMLCanvasElement;
  blob: Blob;
  dataUrl: string;
  bracketCount: number;
  processingTimeMs: number;
}

export interface CaptureProgress {
  stage: 'stabilizing' | 'capturing' | 'processing' | 'done';
  progress: number;
  message: string;
}

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

function clamp255(v: number) { return v < 0 ? 0 : v > 255 ? 255 : (v + 0.5) | 0; }

// ── Auto-levels normalization ──────────────────────────
// Stretches histogram to use full range — gives AI the cleanest input
function autoLevels(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = canvas.width;
  c.height = canvas.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;

  // Find actual min/max per channel
  let minR = 255, minG = 255, minB = 255;
  let maxR = 0, maxG = 0, maxB = 0;
  
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] < minR) minR = d[i];
    if (d[i] > maxR) maxR = d[i];
    if (d[i + 1] < minG) minG = d[i + 1];
    if (d[i + 1] > maxG) maxG = d[i + 1];
    if (d[i + 2] < minB) minB = d[i + 2];
    if (d[i + 2] > maxB) maxB = d[i + 2];
  }

  // Clip 1% from each end to ignore outliers
  const clipLow = 5;  // ~2% floor
  const clipHigh = 250; // ~98% ceiling
  minR = Math.max(minR, clipLow); minG = Math.max(minG, clipLow); minB = Math.max(minB, clipLow);
  maxR = Math.min(maxR, clipHigh); maxG = Math.min(maxG, clipHigh); maxB = Math.min(maxB, clipHigh);

  const rangeR = maxR - minR || 1;
  const rangeG = maxG - minG || 1;
  const rangeB = maxB - minB || 1;

  // Only apply if the histogram is actually compressed
  if (rangeR > 200 && rangeG > 200 && rangeB > 200) {
    ctx.putImageData(img, 0, 0);
    return c;
  }

  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp255(((d[i] - minR) / rangeR) * 255);
    d[i + 1] = clamp255(((d[i + 1] - minG) / rangeG) * 255);
    d[i + 2] = clamp255(((d[i + 2] - minB) / rangeB) * 255);
  }
  
  ctx.putImageData(img, 0, 0);
  return c;
}

// ── Main pipeline: prepare photo for AI ────────────────
export async function processHDR(
  sourceCanvas: HTMLCanvasElement,
  onProgress?: (p: CaptureProgress) => void,
  _quality: 'fast' | 'quality' = 'quality',
): Promise<HDRResult> {
  const start = performance.now();

  onProgress?.({ stage: 'capturing', progress: 10, message: 'Capture en cours…' });
  await yieldFrame();

  onProgress?.({ stage: 'processing', progress: 40, message: 'Préparation de l\'image…' });
  await yieldFrame();

  // Only auto-levels — no fake HDR, no degradation
  const result = autoLevels(sourceCanvas);

  onProgress?.({ stage: 'done', progress: 100, message: 'Photo prête !' });

  const blob = await canvasToBlob(result, 'image/jpeg', 0.95);
  const dataUrl = result.toDataURL('image/jpeg', 0.95);

  return {
    canvas: result,
    blob,
    dataUrl,
    bracketCount: 1,
    processingTimeMs: performance.now() - start,
  };
}

// ── Utilities ──────────────────────────────────────────
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
