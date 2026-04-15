/**
 * Photo Engine — Professional Real Estate Image Processing
 * 
 * Computational photography pipeline inspired by Apple Deep Fusion / Pixel HDR+.
 * Uses Float32 arrays throughout, Laplacian pyramids, exposure fusion,
 * and a real estate–tuned post-processing chain.
 * 
 * All processing happens client-side via Canvas API.
 */

// ── Types ──────────────────────────────────────────────
export interface ProcessingProgress {
  stage: 'capturing' | 'aligning' | 'denoising' | 'fusing' | 'postprocessing' | 'validating' | 'done';
  progress: number; // 0-100
  message: string;
}

export interface ProcessedResult {
  canvas: HTMLCanvasElement;
  blob: Blob;
  dataUrl: string;
  processingTimeMs: number;
  frameCount: number;
  validationPassed: boolean;
}

// ── Float32 Image ──────────────────────────────────────
// All intermediate processing uses Float32 [0..1] to avoid banding
class F32Image {
  data: Float32Array;
  width: number;
  height: number;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Float32Array(width * height * 4);
  }

  static fromCanvas(canvas: HTMLCanvasElement): F32Image {
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const img = new F32Image(canvas.width, canvas.height);
    for (let i = 0; i < imgData.data.length; i++) {
      img.data[i] = imgData.data[i] / 255;
    }
    return img;
  }

  toCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.width;
    c.height = this.height;
    const ctx = c.getContext('2d')!;
    const imgData = ctx.createImageData(this.width, this.height);
    for (let i = 0; i < this.data.length; i++) {
      imgData.data[i] = i % 4 === 3 
        ? Math.round(this.data[i] * 255)
        : Math.round(Math.max(0, Math.min(1, this.data[i])) * 255);
    }
    ctx.putImageData(imgData, 0, 0);
    return c;
  }

  clone(): F32Image {
    const img = new F32Image(this.width, this.height);
    img.data.set(this.data);
    return img;
  }

  getLuminance(idx: number): number {
    const base = idx * 4;
    return 0.299 * this.data[base] + 0.587 * this.data[base + 1] + 0.114 * this.data[base + 2];
  }
}

// ── Gaussian Blur (separable, for pyramid) ─────────────
function gaussianKernel(sigma: number): Float32Array {
  const size = Math.ceil(sigma * 3) * 2 + 1;
  const kernel = new Float32Array(size);
  const center = (size - 1) / 2;
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - center;
    kernel[i] = Math.exp(-0.5 * (x * x) / (sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;
  return kernel;
}

function blurHorizontal(src: F32Image, kernel: Float32Array): F32Image {
  const dst = new F32Image(src.width, src.height);
  const half = (kernel.length - 1) / 2;
  const w = src.width, h = src.height;
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < kernel.length; k++) {
        const sx = Math.min(w - 1, Math.max(0, x + k - half));
        const idx = (y * w + sx) * 4;
        const weight = kernel[k];
        r += src.data[idx] * weight;
        g += src.data[idx + 1] * weight;
        b += src.data[idx + 2] * weight;
        a += src.data[idx + 3] * weight;
      }
      const di = (y * w + x) * 4;
      dst.data[di] = r;
      dst.data[di + 1] = g;
      dst.data[di + 2] = b;
      dst.data[di + 3] = a;
    }
  }
  return dst;
}

function blurVertical(src: F32Image, kernel: Float32Array): F32Image {
  const dst = new F32Image(src.width, src.height);
  const half = (kernel.length - 1) / 2;
  const w = src.width, h = src.height;
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < kernel.length; k++) {
        const sy = Math.min(h - 1, Math.max(0, y + k - half));
        const idx = (sy * w + x) * 4;
        const weight = kernel[k];
        r += src.data[idx] * weight;
        g += src.data[idx + 1] * weight;
        b += src.data[idx + 2] * weight;
        a += src.data[idx + 3] * weight;
      }
      const di = (y * w + x) * 4;
      dst.data[di] = r;
      dst.data[di + 1] = g;
      dst.data[di + 2] = b;
      dst.data[di + 3] = a;
    }
  }
  return dst;
}

function gaussianBlur(src: F32Image, sigma: number): F32Image {
  const kernel = gaussianKernel(sigma);
  return blurVertical(blurHorizontal(src, kernel), kernel);
}

// ── Exposure Simulation (from single image) ────────────
function simulateExposure(base: F32Image, evStop: number): F32Image {
  const result = base.clone();
  const factor = Math.pow(2, evStop);
  const len = result.data.length;
  for (let i = 0; i < len; i++) {
    if (i % 4 === 3) continue; // skip alpha
    result.data[i] = result.data[i] * factor;
  }
  return result;
}

// ── Bilateral Filter (for pre-fusion denoising) ────────
function bilateralFilter(src: F32Image, radius: number, sigmaSpace: number, sigmaColor: number): F32Image {
  const dst = src.clone();
  const w = src.width, h = src.height;
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ci = (y * w + x) * 4;
      let sumR = 0, sumG = 0, sumB = 0, sumW = 0;
      const cr = src.data[ci], cg = src.data[ci + 1], cb = src.data[ci + 2];
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.min(h - 1, Math.max(0, y + dy));
          const nx = Math.min(w - 1, Math.max(0, x + dx));
          const ni = (ny * w + nx) * 4;
          
          const spatialDist = (dx * dx + dy * dy) / (2 * sigmaSpace * sigmaSpace);
          const colorDist = (
            (src.data[ni] - cr) ** 2 + 
            (src.data[ni + 1] - cg) ** 2 + 
            (src.data[ni + 2] - cb) ** 2
          ) / (2 * sigmaColor * sigmaColor);
          
          const weight = Math.exp(-spatialDist - colorDist);
          sumR += src.data[ni] * weight;
          sumG += src.data[ni + 1] * weight;
          sumB += src.data[ni + 2] * weight;
          sumW += weight;
        }
      }
      
      dst.data[ci] = sumR / sumW;
      dst.data[ci + 1] = sumG / sumW;
      dst.data[ci + 2] = sumB / sumW;
    }
  }
  return dst;
}

// ── Laplacian Pyramid ──────────────────────────────────
function downsample(src: F32Image): F32Image {
  const nw = Math.floor(src.width / 2);
  const nh = Math.floor(src.height / 2);
  const dst = new F32Image(nw, nh);
  
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sx = x * 2, sy = y * 2;
      const di = (y * nw + x) * 4;
      for (let c = 0; c < 4; c++) {
        dst.data[di + c] = (
          src.data[(sy * src.width + sx) * 4 + c] +
          src.data[(sy * src.width + Math.min(sx + 1, src.width - 1)) * 4 + c] +
          src.data[(Math.min(sy + 1, src.height - 1) * src.width + sx) * 4 + c] +
          src.data[(Math.min(sy + 1, src.height - 1) * src.width + Math.min(sx + 1, src.width - 1)) * 4 + c]
        ) / 4;
      }
    }
  }
  return dst;
}

function upsample(src: F32Image, targetW: number, targetH: number): F32Image {
  const dst = new F32Image(targetW, targetH);
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const sx = (x / targetW) * src.width;
      const sy = (y / targetH) * src.height;
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = Math.min(x0 + 1, src.width - 1);
      const y1 = Math.min(y0 + 1, src.height - 1);
      const fx = sx - x0, fy = sy - y0;
      
      const di = (y * targetW + x) * 4;
      for (let c = 0; c < 4; c++) {
        const v00 = src.data[(y0 * src.width + x0) * 4 + c];
        const v10 = src.data[(y0 * src.width + x1) * 4 + c];
        const v01 = src.data[(y1 * src.width + x0) * 4 + c];
        const v11 = src.data[(y1 * src.width + x1) * 4 + c];
        dst.data[di + c] = (v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy;
      }
    }
  }
  return dst;
}

function buildGaussianPyramid(img: F32Image, levels: number): F32Image[] {
  const pyramid: F32Image[] = [img];
  for (let i = 1; i < levels; i++) {
    pyramid.push(downsample(pyramid[i - 1]));
  }
  return pyramid;
}

function buildLaplacianPyramid(gaussPyr: F32Image[]): F32Image[] {
  const lap: F32Image[] = [];
  for (let i = 0; i < gaussPyr.length - 1; i++) {
    const upsampled = upsample(gaussPyr[i + 1], gaussPyr[i].width, gaussPyr[i].height);
    const diff = new F32Image(gaussPyr[i].width, gaussPyr[i].height);
    for (let j = 0; j < diff.data.length; j++) {
      diff.data[j] = gaussPyr[i].data[j] - upsampled.data[j];
    }
    lap.push(diff);
  }
  lap.push(gaussPyr[gaussPyr.length - 1]); // residual
  return lap;
}

function collapseLaplacianPyramid(lapPyr: F32Image[]): F32Image {
  let current = lapPyr[lapPyr.length - 1].clone();
  for (let i = lapPyr.length - 2; i >= 0; i--) {
    const upsampled = upsample(current, lapPyr[i].width, lapPyr[i].height);
    current = new F32Image(lapPyr[i].width, lapPyr[i].height);
    for (let j = 0; j < current.data.length; j++) {
      current.data[j] = upsampled.data[j] + lapPyr[i].data[j];
    }
  }
  return current;
}

// ── Exposure Fusion (Mertens, real estate tuned) ───────
function computeWeightMap(img: F32Image): F32Image {
  const w = img.width, h = img.height;
  const weights = new F32Image(w, h);
  const pixels = w * h;
  
  for (let i = 0; i < pixels; i++) {
    const base = i * 4;
    const r = img.data[base], g = img.data[base + 1], b = img.data[base + 2];
    
    const cr = Math.max(0, Math.min(1, r));
    const cg = Math.max(0, Math.min(1, g));
    const cb = Math.max(0, Math.min(1, b));
    
    const lum = 0.299 * cr + 0.587 * cg + 0.114 * cb;
    
    const px = i % w, py = Math.floor(i / w);
    let contrast = 0;
    if (px > 0 && px < w - 1 && py > 0 && py < h - 1) {
      const lumUp = 0.299 * Math.max(0, Math.min(1, img.data[((py - 1) * w + px) * 4])) + 
                    0.587 * Math.max(0, Math.min(1, img.data[((py - 1) * w + px) * 4 + 1])) + 
                    0.114 * Math.max(0, Math.min(1, img.data[((py - 1) * w + px) * 4 + 2]));
      const lumDown = 0.299 * Math.max(0, Math.min(1, img.data[((py + 1) * w + px) * 4])) + 
                      0.587 * Math.max(0, Math.min(1, img.data[((py + 1) * w + px) * 4 + 1])) + 
                      0.114 * Math.max(0, Math.min(1, img.data[((py + 1) * w + px) * 4 + 2]));
      const lumLeft = 0.299 * Math.max(0, Math.min(1, img.data[(py * w + px - 1) * 4])) + 
                      0.587 * Math.max(0, Math.min(1, img.data[(py * w + px - 1) * 4 + 1])) + 
                      0.114 * Math.max(0, Math.min(1, img.data[(py * w + px - 1) * 4 + 2]));
      const lumRight = 0.299 * Math.max(0, Math.min(1, img.data[(py * w + px + 1) * 4])) + 
                       0.587 * Math.max(0, Math.min(1, img.data[(py * w + px + 1) * 4 + 1])) + 
                       0.114 * Math.max(0, Math.min(1, img.data[(py * w + px + 1) * 4 + 2]));
      contrast = Math.abs(4 * lum - lumUp - lumDown - lumLeft - lumRight);
    }
    
    const mean = (cr + cg + cb) / 3;
    const saturation = Math.sqrt(((cr - mean) ** 2 + (cg - mean) ** 2 + (cb - mean) ** 2) / 3);
    
    const sigma = 0.2;
    const exposedness = Math.exp(-0.5 * ((lum - 0.5) / sigma) ** 2);
    
    const brightnessBonus = (lum >= 0.45 && lum <= 0.75) ? 1.5 : 1.0;
    
    const weight = Math.pow(contrast + 0.001, 0.8) * 
                   Math.pow(saturation + 0.001, 0.6) * 
                   Math.pow(exposedness + 0.001, 1.2) *
                   Math.pow(brightnessBonus, 1.5);
    
    weights.data[base] = weight;
    weights.data[base + 1] = weight;
    weights.data[base + 2] = weight;
    weights.data[base + 3] = 1;
  }
  
  return weights;
}

function exposureFusion(frames: F32Image[], numLevels: number): F32Image {
  const weightMaps = frames.map(f => computeWeightMap(f));
  
  const pixels = frames[0].width * frames[0].height;
  for (let i = 0; i < pixels; i++) {
    const base = i * 4;
    let sumW = 0;
    for (const wm of weightMaps) sumW += wm.data[base];
    if (sumW < 0.0001) sumW = 1;
    for (const wm of weightMaps) {
      const nw = wm.data[base] / sumW;
      wm.data[base] = nw;
      wm.data[base + 1] = nw;
      wm.data[base + 2] = nw;
    }
  }
  
  const frameLapPyramids = frames.map(f => buildLaplacianPyramid(buildGaussianPyramid(f, numLevels)));
  const weightGaussPyramids = weightMaps.map(w => buildGaussianPyramid(w, numLevels));
  
  const blendedPyr: F32Image[] = [];
  for (let level = 0; level < numLevels; level++) {
    const blended = new F32Image(frameLapPyramids[0][level].width, frameLapPyramids[0][level].height);
    const len = blended.data.length;
    
    for (let i = 0; i < len; i++) {
      let sum = 0;
      for (let f = 0; f < frames.length; f++) {
        sum += frameLapPyramids[f][level].data[i] * weightGaussPyramids[f][level].data[i];
      }
      blended.data[i] = sum;
    }
    blendedPyr.push(blended);
  }
  
  return collapseLaplacianPyramid(blendedPyr);
}

// ── Post-Processing Chain ──────────────────────────────

function adjustShadows(img: F32Image, amount: number): void {
  const factor = amount / 100;
  const len = img.data.length;
  for (let i = 0; i < len; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = img.data[i + c];
      if (v < 0.3) {
        const shadowStrength = 1 - (v / 0.3);
        img.data[i + c] = v + factor * shadowStrength * 0.4;
      }
    }
  }
}

function adjustMidtones(img: F32Image, amount: number): void {
  const gamma = 1 - (amount / 200);
  const len = img.data.length;
  for (let i = 0; i < len; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = Math.max(0, Math.min(1, img.data[i + c]));
      img.data[i + c] = Math.pow(v, gamma);
    }
  }
}

function adjustHighlights(img: F32Image, amount: number): void {
  const factor = amount / 100;
  const len = img.data.length;
  for (let i = 0; i < len; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = img.data[i + c];
      if (v > 0.7) {
        const highlightStrength = (v - 0.7) / 0.3;
        img.data[i + c] = v + factor * highlightStrength * 0.3;
      }
    }
  }
}

function autoWhiteBalance(img: F32Image): void {
  const len = img.data.length;
  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  
  for (let i = 0; i < len; i += 4) {
    const lum = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
    if (lum > 0.2 && lum < 0.8) {
      sumR += img.data[i];
      sumG += img.data[i + 1];
      sumB += img.data[i + 2];
      count++;
    }
  }
  
  if (count < 100) return;
  
  const avgR = sumR / count;
  const avgG = sumG / count;
  const avgB = sumB / count;
  const avg = (avgR + avgG + avgB) / 3;
  
  const scaleR = (avg / avgR) * 0.98;
  const scaleG = avg / avgG;
  const scaleB = (avg / avgB) * 1.02;
  
  const clampScale = (s: number) => Math.max(0.85, Math.min(1.15, s));
  const cR = clampScale(scaleR);
  const cG = clampScale(scaleG);
  const cB = clampScale(scaleB);
  
  for (let i = 0; i < len; i += 4) {
    img.data[i] *= cR;
    img.data[i + 1] *= cG;
    img.data[i + 2] *= cB;
  }
}

function applyClarity(img: F32Image, amount: number): void {
  const blurred = gaussianBlur(img, 3);
  const factor = amount / 100;
  const len = img.data.length;
  
  for (let i = 0; i < len; i += 4) {
    for (let c = 0; c < 3; c++) {
      const detail = img.data[i + c] - blurred.data[i + c];
      img.data[i + c] = img.data[i + c] + detail * factor;
    }
  }
}

function applyDehaze(img: F32Image, amount: number): void {
  const factor = amount / 100;
  const len = img.data.length;
  
  const pixels = img.width * img.height;
  const darkChannel = new Float32Array(pixels);
  for (let i = 0; i < pixels; i++) {
    const base = i * 4;
    darkChannel[i] = Math.min(img.data[base], img.data[base + 1], img.data[base + 2]);
  }
  
  for (let i = 0; i < len; i += 4) {
    const dc = darkChannel[i / 4];
    const transmission = 1 - factor * dc;
    for (let c = 0; c < 3; c++) {
      img.data[i + c] = (img.data[i + c] - dc * factor * 0.3) / Math.max(0.3, transmission);
    }
  }
}

function applyVibrance(img: F32Image, amount: number): void {
  const factor = amount / 100;
  const len = img.data.length;
  
  for (let i = 0; i < len; i += 4) {
    const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
    
    const boost = factor * (1 - sat) * 0.5;
    const avg = (r + g + b) / 3;
    
    img.data[i] = r + (r - avg) * boost;
    img.data[i + 1] = g + (g - avg) * boost;
    img.data[i + 2] = b + (b - avg) * boost;
  }
}

function applySaturation(img: F32Image, amount: number): void {
  const factor = 1 + Math.min(amount, 30) / 100;
  const len = img.data.length;
  
  for (let i = 0; i < len; i += 4) {
    const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    img.data[i] = gray + (r - gray) * factor;
    img.data[i + 1] = gray + (g - gray) * factor;
    img.data[i + 2] = gray + (b - gray) * factor;
  }
}

function applySelectiveSharpening(img: F32Image): void {
  const blurred = gaussianBlur(img, 1.2);
  const len = img.data.length;
  const amount = 0.8;
  const threshold = 3 / 255;
  
  for (let i = 0; i < len; i += 4) {
    for (let c = 0; c < 3; c++) {
      const diff = img.data[i + c] - blurred.data[i + c];
      if (Math.abs(diff) > threshold) {
        img.data[i + c] = img.data[i + c] + diff * amount;
      }
    }
  }
}

function applyVignette(img: F32Image, strength: number): void {
  const w = img.width, h = img.height;
  const cx = w / 2, cy = h / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  const factor = strength / 100;
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / cx;
      const dy = (y - cy) / cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const vignette = 1 - factor * dist * dist * 0.5;
      const idx = (y * w + x) * 4;
      img.data[idx] *= vignette;
      img.data[idx + 1] *= vignette;
      img.data[idx + 2] *= vignette;
    }
  }
}

// ── Histogram Normalization ────────────────────────────
function robustNormalize(img: F32Image): void {
  const pixels = img.width * img.height;
  const luminances = new Float32Array(pixels);
  
  for (let i = 0; i < pixels; i++) {
    const base = i * 4;
    luminances[i] = 0.299 * img.data[base] + 0.587 * img.data[base + 1] + 0.114 * img.data[base + 2];
  }
  
  const sorted = Array.from(luminances).sort((a, b) => a - b);
  const lo = sorted[Math.floor(pixels * 0.001)];
  const hi = sorted[Math.floor(pixels * 0.999)];
  
  if (hi - lo < 0.01) return;
  
  const range = hi - lo;
  const len = img.data.length;
  for (let i = 0; i < len; i += 4) {
    for (let c = 0; c < 3; c++) {
      img.data[i + c] = (img.data[i + c] - lo) / range;
    }
  }
}

// ── Quality Validation ─────────────────────────────────
interface ValidationResult {
  passed: boolean;
  corrections: string[];
}

function validateAndCorrect(img: F32Image): ValidationResult {
  const pixels = img.width * img.height;
  const corrections: string[] = [];
  
  let sumLum = 0;
  let overexposed = 0;
  let underexposed = 0;
  let sumSat = 0;
  
  for (let i = 0; i < pixels; i++) {
    const base = i * 4;
    const r = Math.max(0, Math.min(1, img.data[base]));
    const g = Math.max(0, Math.min(1, img.data[base + 1]));
    const b = Math.max(0, Math.min(1, img.data[base + 2]));
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    sumLum += lum;
    
    if (lum > 0.98) overexposed++;
    if (lum < 0.03) underexposed++;
    
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    if (maxC > 0) sumSat += (maxC - minC) / maxC;
  }
  
  const meanLum = sumLum / pixels;
  const overPct = overexposed / pixels;
  const underPct = underexposed / pixels;
  const meanSat = sumSat / pixels;
  
  if (meanLum < 0.5) {
    adjustMidtones(img, 15);
    corrections.push('Brightness boost applied');
  } else if (meanLum > 0.72) {
    adjustHighlights(img, -10);
    corrections.push('Highlights recovery applied');
  }
  
  if (overPct > 0.02) {
    adjustHighlights(img, -10);
    corrections.push('Highlight clipping corrected');
  }
  
  if (underPct > 0.05) {
    adjustShadows(img, 10);
    corrections.push('Shadow recovery applied');
  }
  
  if (meanSat > 0.65) {
    applySaturation(img, -10);
    corrections.push('Oversaturation corrected');
  }
  
  return { passed: corrections.length === 0, corrections };
}

// ── Main Pipeline ──────────────────────────────────────
export async function processPhoto(
  sourceCanvas: HTMLCanvasElement,
  onProgress?: (p: ProcessingProgress) => void,
): Promise<ProcessedResult> {
  const start = performance.now();
  
  const maxDim = 1600;
  let processCanvas = sourceCanvas;
  if (sourceCanvas.width > maxDim || sourceCanvas.height > maxDim) {
    const scale = maxDim / Math.max(sourceCanvas.width, sourceCanvas.height);
    const c = document.createElement('canvas');
    c.width = Math.round(sourceCanvas.width * scale);
    c.height = Math.round(sourceCanvas.height * scale);
    c.getContext('2d')!.drawImage(sourceCanvas, 0, 0, c.width, c.height);
    processCanvas = c;
  }
  
  onProgress?.({ stage: 'capturing', progress: 5, message: 'Préparation…' });
  
  const base = F32Image.fromCanvas(processCanvas);
  
  onProgress?.({ stage: 'capturing', progress: 10, message: 'Bracketing virtuel…' });
  
  const frames = [
    simulateExposure(base, -1.5),
    simulateExposure(base, -0.5),
    base.clone(),
    simulateExposure(base, 1.0),
    simulateExposure(base, 2.0),
  ];
  
  onProgress?.({ stage: 'denoising', progress: 20, message: 'Réduction du bruit…' });
  
  frames[3] = bilateralFilter(frames[3], 2, 1.2, 0.1);
  frames[4] = bilateralFilter(frames[4], 2, 1.2, 0.1);
  
  onProgress?.({ stage: 'fusing', progress: 40, message: 'Fusion d\'exposition…' });
  
  const numLevels = Math.min(5, Math.floor(Math.log2(Math.min(base.width, base.height))) - 1);
  const fused = exposureFusion(frames, Math.max(3, numLevels));
  
  robustNormalize(fused);
  
  onProgress?.({ stage: 'postprocessing', progress: 60, message: 'Optimisation immobilière…' });
  
  adjustShadows(fused, 40);
  adjustMidtones(fused, 25);
  adjustHighlights(fused, -20);
  autoWhiteBalance(fused);
  applyClarity(fused, 20);
  applyDehaze(fused, 10);
  applyVibrance(fused, 20);
  applySaturation(fused, 15);
  applySelectiveSharpening(fused);
  applyVignette(fused, 6);
  
  onProgress?.({ stage: 'validating', progress: 85, message: 'Validation qualité…' });
  
  const validation = validateAndCorrect(fused);
  
  for (let i = 0; i < fused.data.length; i++) {
    if (i % 4 < 3) {
      fused.data[i] = Math.max(0, Math.min(1, fused.data[i]));
    }
  }
  
  const resultCanvas = fused.toCanvas();
  
  let finalCanvas = resultCanvas;
  if (processCanvas !== sourceCanvas) {
    finalCanvas = document.createElement('canvas');
    finalCanvas.width = sourceCanvas.width;
    finalCanvas.height = sourceCanvas.height;
    finalCanvas.getContext('2d')!.drawImage(resultCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
  }
  
  onProgress?.({ stage: 'done', progress: 100, message: 'Photo prête !' });
  
  const blob = await new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob(
      b => b ? resolve(b) : reject(new Error('blob failed')),
      'image/jpeg',
      0.92,
    );
  });
  
  const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.92);
  
  return {
    canvas: finalCanvas,
    blob,
    dataUrl,
    processingTimeMs: performance.now() - start,
    frameCount: frames.length,
    validationPassed: validation.passed,
  };
}

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

export async function processSingleImage(
  file: File,
  onProgress?: (p: ProcessingProgress) => void,
): Promise<ProcessedResult> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
  
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d')!.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  
  return processPhoto(canvas, onProgress);
}
