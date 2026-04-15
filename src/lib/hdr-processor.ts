/**
 * HDR Processor — Client-side exposure bracketing simulation & HDR fusion
 * 
 * Since browsers don't expose camera exposure controls,
 * we simulate bracketing by applying gamma/brightness curves
 * to captured frames, then fuse them using Mertens-like
 * exposure fusion (contrast + saturation + well-exposedness weighting).
 */

// ── Types ──────────────────────────────────────────────
export interface BracketFrame {
  canvas: HTMLCanvasElement;
  exposureValue: number; // EV offset (-2, -1, 0, +1, +2)
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
  progress: number; // 0-100
  message: string;
}

// ── Constants ──────────────────────────────────────────
const BRACKET_EVS = [-1.5, -0.75, 0, 0.75, 1.5]; // 5-bracket
const BRACKET_EVS_FAST = [-1, 0, 1]; // 3-bracket for speed

// ── Utility: Create canvas from image/video ────────────
export function createCanvasFromSource(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  width?: number,
  height?: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const sh = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  canvas.width = width ?? sw;
  canvas.height = height ?? sh;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// ── Simulate exposure bracket ──────────────────────────
// Applies a gamma curve to simulate under/over exposure
function applyExposureCurve(
  sourceCanvas: HTMLCanvasElement,
  ev: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(sourceCanvas, 0, 0);

  if (Math.abs(ev) < 0.01) return canvas; // No change for EV=0

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // EV to multiplier: 2^EV
  const multiplier = Math.pow(2, ev);
  
  // Apply with soft highlight/shadow rolloff for realism
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const val = data[i + c] / 255;
      // Apply exposure with soft knee
      let adjusted: number;
      if (ev > 0) {
        // Overexpose: lift shadows more than highlights
        adjusted = 1 - Math.pow(1 - val, 1 / multiplier);
      } else {
        // Underexpose: preserve highlights, crush shadows
        adjusted = Math.pow(val, 1 / multiplier);
      }
      data[i + c] = Math.max(0, Math.min(255, Math.round(adjusted * 255)));
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// ── Generate brackets from a single capture ────────────
export function generateBrackets(
  sourceCanvas: HTMLCanvasElement,
  quality: 'fast' | 'quality' = 'quality'
): BracketFrame[] {
  const evValues = quality === 'fast' ? BRACKET_EVS_FAST : BRACKET_EVS;
  
  return evValues.map(ev => ({
    canvas: applyExposureCurve(sourceCanvas, ev),
    exposureValue: ev,
    label: ev === 0 ? 'Normal' : ev > 0 ? `+${ev} EV` : `${ev} EV`,
  }));
}

// ── Exposure fusion (Mertens-like) ─────────────────────
// Weights each pixel from each bracket based on:
// 1. Contrast (Laplacian magnitude)
// 2. Saturation
// 3. Well-exposedness (Gaussian centered at 0.5)

function computeWeightMap(canvas: HTMLCanvasElement): Float32Array {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const numPixels = width * height;
  const weights = new Float32Array(numPixels);

  for (let i = 0; i < numPixels; i++) {
    const idx = i * 4;
    const r = data[idx] / 255;
    const g = data[idx + 1] / 255;
    const b = data[idx + 2] / 255;

    // 1. Well-exposedness: Gaussian around 0.5
    const sigma = 0.2;
    const wellR = Math.exp(-Math.pow(r - 0.5, 2) / (2 * sigma * sigma));
    const wellG = Math.exp(-Math.pow(g - 0.5, 2) / (2 * sigma * sigma));
    const wellB = Math.exp(-Math.pow(b - 0.5, 2) / (2 * sigma * sigma));
    const wellExposedness = wellR * wellG * wellB;

    // 2. Saturation
    const mean = (r + g + b) / 3;
    const saturation = Math.sqrt(
      (Math.pow(r - mean, 2) + Math.pow(g - mean, 2) + Math.pow(b - mean, 2)) / 3
    );

    // 3. Simple contrast (local luminance variance approximation)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Use luminance deviation from 0.5 as a simpler contrast proxy
    const contrast = Math.abs(lum - 0.5) * 2;

    // Combine weights
    weights[i] = Math.pow(wellExposedness, 1) *
                 Math.pow(saturation + 0.01, 1) *
                 Math.pow(contrast + 0.01, 0.5) + 1e-6;
  }

  return weights;
}

export function fuseHDR(brackets: BracketFrame[]): HTMLCanvasElement {
  if (brackets.length === 0) throw new Error('No brackets to fuse');
  if (brackets.length === 1) return brackets[0].canvas;

  const { width, height } = brackets[0].canvas;
  const numPixels = width * height;

  // Compute weight maps for each bracket
  const weightMaps = brackets.map(b => computeWeightMap(b.canvas));

  // Normalize weights across brackets for each pixel
  const normalizedWeights = weightMaps.map(() => new Float32Array(numPixels));
  for (let i = 0; i < numPixels; i++) {
    let sum = 0;
    for (let b = 0; b < brackets.length; b++) {
      sum += weightMaps[b][i];
    }
    for (let b = 0; b < brackets.length; b++) {
      normalizedWeights[b][i] = weightMaps[b][i] / sum;
    }
  }

  // Get image data from each bracket
  const bracketData = brackets.map(b => {
    const ctx = b.canvas.getContext('2d')!;
    return ctx.getImageData(0, 0, width, height).data;
  });

  // Fuse
  const result = document.createElement('canvas');
  result.width = width;
  result.height = height;
  const ctx = result.getContext('2d')!;
  const resultData = ctx.createImageData(width, height);
  const outData = resultData.data;

  for (let i = 0; i < numPixels; i++) {
    const idx = i * 4;
    let r = 0, g = 0, b = 0;
    
    for (let bi = 0; bi < brackets.length; bi++) {
      const w = normalizedWeights[bi][i];
      r += bracketData[bi][idx] * w;
      g += bracketData[bi][idx + 1] * w;
      b += bracketData[bi][idx + 2] * w;
    }

    outData[idx] = Math.max(0, Math.min(255, Math.round(r)));
    outData[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
    outData[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
    outData[idx + 3] = 255;
  }

  ctx.putImageData(resultData, 0, 0);
  return result;
}

// ── Local enhancement pass ─────────────────────────────
// Applies basic improvements: contrast, saturation, sharpening
export function localEnhance(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const result = document.createElement('canvas');
  result.width = canvas.width;
  result.height = canvas.height;
  const ctx = result.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0);

  const imageData = ctx.getImageData(0, 0, result.width, result.height);
  const data = imageData.data;

  // Auto white balance (gray world assumption)
  let sumR = 0, sumG = 0, sumB = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    sumR += data[i];
    sumG += data[i + 1];
    sumB += data[i + 2];
  }
  const avgR = sumR / n, avgG = sumG / n, avgB = sumB / n;
  const avgAll = (avgR + avgG + avgB) / 3;
  const scaleR = avgAll / (avgR || 1);
  const scaleG = avgAll / (avgG || 1);
  const scaleB = avgAll / (avgB || 1);

  // Apply white balance + mild contrast S-curve + saturation boost
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] * scaleR;
    let g = data[i + 1] * scaleG;
    let b = data[i + 2] * scaleB;

    // Mild S-curve contrast
    r = applySCurve(r / 255) * 255;
    g = applySCurve(g / 255) * 255;
    b = applySCurve(b / 255) * 255;

    // Saturation boost (+15%)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const satBoost = 1.15;
    r = lum + (r - lum) * satBoost;
    g = lum + (g - lum) * satBoost;
    b = lum + (b - lum) * satBoost;

    data[i] = Math.max(0, Math.min(255, Math.round(r)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }

  ctx.putImageData(imageData, 0, 0);
  return result;
}

function applySCurve(x: number): number {
  // Gentle S-curve: preserves shadows/highlights, adds midtone contrast
  return x < 0.5
    ? 2 * x * x
    : 1 - 2 * (1 - x) * (1 - x);
}

// ── Full pipeline: capture → bracket → fuse → enhance ──
export async function processHDR(
  sourceCanvas: HTMLCanvasElement,
  onProgress?: (p: CaptureProgress) => void,
  quality: 'fast' | 'quality' = 'quality'
): Promise<HDRResult> {
  const start = performance.now();

  onProgress?.({ stage: 'capturing', progress: 10, message: 'Création des expositions…' });
  await yieldFrame();

  const brackets = generateBrackets(sourceCanvas, quality);
  onProgress?.({ stage: 'fusing', progress: 40, message: 'Fusion HDR en cours…' });
  await yieldFrame();

  const fused = fuseHDR(brackets);
  onProgress?.({ stage: 'enhancing', progress: 70, message: 'Amélioration automatique…' });
  await yieldFrame();

  const enhanced = localEnhance(fused);
  onProgress?.({ stage: 'done', progress: 100, message: 'Photo HDR prête !' });

  const blob = await canvasToBlob(enhanced, 'image/jpeg', 0.95);
  const dataUrl = enhanced.toDataURL('image/jpeg', 0.95);

  return {
    canvas: enhanced,
    blob,
    dataUrl,
    bracketCount: brackets.length,
    processingTimeMs: performance.now() - start,
  };
}

// ── Helpers ────────────────────────────────────────────
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
      type,
      quality
    );
  });
}

function yieldFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

// ── Motion detection utility ───────────────────────────
export function detectMotion(
  prev: HTMLCanvasElement,
  curr: HTMLCanvasElement,
  threshold: number = 30
): { motionScore: number; isStable: boolean } {
  const w = Math.min(prev.width, curr.width, 320); // Downsample for speed
  const h = Math.min(prev.height, curr.height, 240);

  const prevSmall = document.createElement('canvas');
  prevSmall.width = w;
  prevSmall.height = h;
  prevSmall.getContext('2d')!.drawImage(prev, 0, 0, w, h);

  const currSmall = document.createElement('canvas');
  currSmall.width = w;
  currSmall.height = h;
  currSmall.getContext('2d')!.drawImage(curr, 0, 0, w, h);

  const prevData = prevSmall.getContext('2d')!.getImageData(0, 0, w, h).data;
  const currData = currSmall.getContext('2d')!.getImageData(0, 0, w, h).data;

  let diff = 0;
  const n = w * h;
  for (let i = 0; i < prevData.length; i += 4) {
    const dr = Math.abs(prevData[i] - currData[i]);
    const dg = Math.abs(prevData[i + 1] - currData[i + 1]);
    const db = Math.abs(prevData[i + 2] - currData[i + 2]);
    diff += (dr + dg + db) / 3;
  }

  const motionScore = diff / n;
  return { motionScore, isStable: motionScore < threshold };
}
