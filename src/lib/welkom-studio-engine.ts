/**
 * Welkom Studio — Pipeline HDR client-side (Canvas 2D)
 *
 * Pipeline réaliste exécuté entièrement dans le navigateur :
 *   1. Décodage des fichiers en ImageData
 *   2. Détection automatique d'exposition (luminance moyenne)
 *   3. Fusion Mertens simplifiée (poids contraste + saturation + bonne expo)
 *   4. Tone mapping de Reinhard sur la luminance
 *   5. Smart filters : auto white balance (gray world clamped),
 *      micro-contraste (unsharp mask léger), clarté/dehaze léger,
 *      saturation +10%
 *   6. Export JPEG full + miniature
 *
 * Conçu pour rester rapide (~1-3s pour 3 images 12 MP downscalées à 2048px)
 * et fonctionner sans WebGL ni dépendance externe.
 */

export type Exposure = "under" | "normal" | "over";

export interface ExposureInfo {
  index: number;
  meanLuminance: number;
  label: Exposure;
}

export interface ProcessOptions {
  maxDimension?: number;        // taille max côté long (px) — défaut 2048
  jpegQuality?: number;         // 0–1 — défaut 0.92
  thumbMaxDimension?: number;   // miniature côté long — défaut 400
  thumbQuality?: number;        // 0–1 — défaut 0.78
  applySmartFilters?: boolean;  // défaut true
  onProgress?: (pct: number, label: string) => void;
}

export interface ProcessResult {
  fullBlob: Blob;
  thumbBlob: Blob;
  width: number;
  height: number;
  processingTimeMs: number;
  exposures: ExposureInfo[];
  filtersApplied: string[];
}

const DEFAULTS: Required<Omit<ProcessOptions, "onProgress">> = {
  maxDimension: 2048,
  jpegQuality: 0.92,
  thumbMaxDimension: 400,
  thumbQuality: 0.78,
  applySmartFilters: true,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fileToImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function imageToCanvas(img: HTMLImageElement, maxDim: number): HTMLCanvasElement {
  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function getImageData(canvas: HTMLCanvasElement): ImageData {
  return canvas.getContext("2d", { willReadFrequently: true })!.getImageData(
    0, 0, canvas.width, canvas.height
  );
}

function putImageData(data: ImageData): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = data.width;
  c.height = data.height;
  c.getContext("2d")!.putImageData(data, 0, 0);
  return c;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      type,
      quality
    );
  });
}

function meanLuminance(d: ImageData): number {
  const data = d.data;
  let sum = 0;
  const step = 16; // sample every 4 pixels (×4 RGBA)
  let count = 0;
  for (let i = 0; i < data.length; i += step) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    count++;
  }
  return sum / count;
}

function classifyExposure(mean: number): Exposure {
  if (mean < 80) return "under";
  if (mean > 175) return "over";
  return "normal";
}

// ---------------------------------------------------------------------------
// Public: classify a single file (used by uploader badges)
// ---------------------------------------------------------------------------

export async function analyzeExposure(file: File): Promise<ExposureInfo> {
  const img = await fileToImage(file);
  const c = imageToCanvas(img, 256);
  const data = getImageData(c);
  const m = meanLuminance(data);
  return { index: 0, meanLuminance: m, label: classifyExposure(m) };
}

// ---------------------------------------------------------------------------
// Mertens-style fusion (simplified, single resolution)
// ---------------------------------------------------------------------------

/**
 * Compute per-pixel weights = contrast × saturation × wellExposedness
 * Returns Float32Array of length w*h normalized so weights sum to 1 across images.
 */
function computeWeights(images: ImageData[]): Float32Array[] {
  const w = images[0].width;
  const h = images[0].height;
  const N = images.length;
  const out: Float32Array[] = images.map(() => new Float32Array(w * h));

  // Compute weights per image
  for (let n = 0; n < N; n++) {
    const d = images[n].data;
    const W = out[n];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = d[i] / 255;
        const g = d[i + 1] / 255;
        const b = d[i + 2] / 255;

        // Luminance (normalized 0..1)
        const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        // Contrast: simple |laplacian| on luminance via 4-neighbours
        let contrast = 0;
        if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
          const i1 = (y * w + (x - 1)) * 4;
          const i2 = (y * w + (x + 1)) * 4;
          const i3 = ((y - 1) * w + x) * 4;
          const i4 = ((y + 1) * w + x) * 4;
          const L1 = (0.2126 * d[i1] + 0.7152 * d[i1 + 1] + 0.0722 * d[i1 + 2]) / 255;
          const L2 = (0.2126 * d[i2] + 0.7152 * d[i2 + 1] + 0.0722 * d[i2 + 2]) / 255;
          const L3 = (0.2126 * d[i3] + 0.7152 * d[i3 + 1] + 0.0722 * d[i3 + 2]) / 255;
          const L4 = (0.2126 * d[i4] + 0.7152 * d[i4 + 1] + 0.0722 * d[i4 + 2]) / 255;
          contrast = Math.abs(L1 + L2 + L3 + L4 - 4 * L);
        }
        contrast = Math.max(contrast, 1e-3);

        // Saturation: stddev of RGB
        const mean = (r + g + b) / 3;
        const sat = Math.sqrt(((r - mean) ** 2 + (g - mean) ** 2 + (b - mean) ** 2) / 3);

        // Well-exposedness: gaussian centered on 0.5 per channel
        const sigma = 0.2;
        const wr = Math.exp(-((r - 0.5) ** 2) / (2 * sigma * sigma));
        const wg = Math.exp(-((g - 0.5) ** 2) / (2 * sigma * sigma));
        const wb = Math.exp(-((b - 0.5) ** 2) / (2 * sigma * sigma));
        const wexp = wr * wg * wb;

        // Combined weight (with exponents acting like soft priorities)
        const wpx =
          Math.pow(contrast + 1e-3, 0.4) *
          Math.pow(sat + 1e-3, 0.3) *
          Math.pow(wexp + 1e-3, 0.3);

        W[y * w + x] = wpx;
      }
    }
  }

  // Normalize across images
  for (let p = 0; p < w * h; p++) {
    let sum = 1e-9;
    for (let n = 0; n < N; n++) sum += out[n][p];
    for (let n = 0; n < N; n++) out[n][p] /= sum;
  }

  return out;
}

/**
 * Single-resolution weighted blend.
 * (We skip Laplacian pyramids to keep the engine lightweight in the browser ;
 * the smoothing of the weight map is achieved via a tiny box blur below.)
 */
function blendWithWeights(images: ImageData[], weights: Float32Array[]): ImageData {
  const w = images[0].width;
  const h = images[0].height;
  const out = new ImageData(w, h);
  const dst = out.data;

  // Light smoothing on weights (3×3 box blur) — reduces seams
  const smoothed = weights.map((W) => boxBlur1D(W, w, h, 1));

  for (let p = 0; p < w * h; p++) {
    let r = 0, g = 0, b = 0;
    const i = p * 4;
    for (let n = 0; n < images.length; n++) {
      const wp = smoothed[n][p];
      const sd = images[n].data;
      r += sd[i] * wp;
      g += sd[i + 1] * wp;
      b += sd[i + 2] * wp;
    }
    dst[i] = clamp255(r);
    dst[i + 1] = clamp255(g);
    dst[i + 2] = clamp255(b);
    dst[i + 3] = 255;
  }
  return out;
}

function boxBlur1D(arr: Float32Array, w: number, h: number, radius: number): Float32Array {
  if (radius <= 0) return arr;
  const tmp = new Float32Array(arr.length);
  const out = new Float32Array(arr.length);
  const k = radius * 2 + 1;
  // Horizontal
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -radius; x <= radius; x++) sum += arr[y * w + Math.max(0, Math.min(w - 1, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / k;
      const xAdd = Math.min(w - 1, x + radius + 1);
      const xRem = Math.max(0, x - radius);
      sum += arr[y * w + xAdd] - arr[y * w + xRem];
    }
  }
  // Vertical
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) sum += tmp[Math.max(0, Math.min(h - 1, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / k;
      const yAdd = Math.min(h - 1, y + radius + 1);
      const yRem = Math.max(0, y - radius);
      sum += tmp[yAdd * w + x] - tmp[yRem * w + x];
    }
  }
  return out;
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

// ---------------------------------------------------------------------------
// Tone mapping (Reinhard, on luminance only — preserves hue)
// ---------------------------------------------------------------------------

function toneMapReinhard(d: ImageData): ImageData {
  const data = d.data;
  // Estimate L_white = 99th percentile of luminance
  const lum = new Float32Array(data.length / 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    lum[p] = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  }
  const sorted = Float32Array.from(lum).sort();
  const Lwhite = Math.max(0.5, sorted[Math.floor(sorted.length * 0.99)]);
  const Lw2 = Lwhite * Lwhite;

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const L = lum[p];
    if (L < 1e-4) continue;
    const Lout = (L * (1 + L / Lw2)) / (1 + L);
    const ratio = Lout / L;
    data[i] = clamp255(data[i] * ratio);
    data[i + 1] = clamp255(data[i + 1] * ratio);
    data[i + 2] = clamp255(data[i + 2] * ratio);
  }
  return d;
}

// ---------------------------------------------------------------------------
// Smart filters
// ---------------------------------------------------------------------------

/** Auto white balance — Gray World clamped (avoids blue cast on warm rooms). */
function autoWhiteBalance(d: ImageData): ImageData {
  const data = d.data;
  let rs = 0, gs = 0, bs = 0, c = 0;
  // Skip extremes (top/bottom 5%)
  const lum = new Float32Array(data.length / 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    lum[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  const sorted = Float32Array.from(lum).sort();
  const lo = sorted[Math.floor(sorted.length * 0.05)];
  const hi = sorted[Math.floor(sorted.length * 0.95)];
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    if (lum[p] < lo || lum[p] > hi) continue;
    rs += data[i]; gs += data[i + 1]; bs += data[i + 2]; c++;
  }
  if (c === 0) return d;
  const rAvg = rs / c, gAvg = gs / c, bAvg = bs / c;
  const gray = (rAvg + gAvg + bAvg) / 3;
  // Clamp gains (max 1.6× / min 0.7×) to stay perceptually natural
  const gr = Math.min(1.6, Math.max(0.7, gray / Math.max(rAvg, 1)));
  const gg = Math.min(1.6, Math.max(0.7, gray / Math.max(gAvg, 1)));
  const gb = Math.min(1.6, Math.max(0.7, gray / Math.max(bAvg, 1)));
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp255(data[i] * gr);
    data[i + 1] = clamp255(data[i + 1] * gg);
    data[i + 2] = clamp255(data[i + 2] * gb);
  }
  return d;
}

/** Light unsharp mask (clarity boost) using 3×3 box blur as low-pass. */
function unsharpMask(d: ImageData, amount = 0.35): ImageData {
  const w = d.width, h = d.height;
  const src = d.data;
  const blur = new Uint8ClampedArray(src.length);
  // 3x3 box blur per channel (skip alpha)
  const idx = (x: number, y: number) => (y * w + x) * 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = Math.max(0, Math.min(h - 1, y + dy));
        for (let dx = -1; dx <= 1; dx++) {
          const xx = Math.max(0, Math.min(w - 1, x + dx));
          const i2 = idx(xx, yy);
          r += src[i2]; g += src[i2 + 1]; b += src[i2 + 2]; c++;
        }
      }
      const i = idx(x, y);
      blur[i] = r / c; blur[i + 1] = g / c; blur[i + 2] = b / c; blur[i + 3] = 255;
    }
  }
  for (let i = 0; i < src.length; i += 4) {
    src[i]     = clamp255(src[i]     + amount * (src[i]     - blur[i]));
    src[i + 1] = clamp255(src[i + 1] + amount * (src[i + 1] - blur[i + 1]));
    src[i + 2] = clamp255(src[i + 2] + amount * (src[i + 2] - blur[i + 2]));
  }
  return d;
}

/** Saturation boost in HSL with vibrance-style curve (less boost on already saturated). */
function vibrance(d: ImageData, amount = 0.12): ImageData {
  const data = d.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = (max - min) / (max + 1e-3); // 0..1
    const boost = amount * (1 - sat);
    const avg = (r + g + b) / 3;
    data[i]     = clamp255(r + (r - avg) * boost);
    data[i + 1] = clamp255(g + (g - avg) * boost);
    data[i + 2] = clamp255(b + (b - avg) * boost);
  }
  return d;
}

/** Mild dehaze using a global "dark channel" estimate. */
function mildDehaze(d: ImageData, strength = 0.25): ImageData {
  const data = d.data;
  // Estimate haze level = average of dark channel over the whole image
  let haze = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 16) {
    const m = Math.min(data[i], data[i + 1], data[i + 2]);
    haze += m; count++;
  }
  haze = haze / count; // 0..255
  const A = haze * (1 - strength) + 5; // atmospheric light estimate
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = clamp255((data[i]     - A * strength) / (1 - strength));
    data[i + 1] = clamp255((data[i + 1] - A * strength) / (1 - strength));
    data[i + 2] = clamp255((data[i + 2] - A * strength) / (1 - strength));
  }
  return d;
}

// ---------------------------------------------------------------------------
// Public: full processing pipeline
// ---------------------------------------------------------------------------

export async function processImages(
  files: File[],
  opts: ProcessOptions = {}
): Promise<ProcessResult> {
  const o = { ...DEFAULTS, ...opts };
  const t0 = performance.now();
  const progress = (pct: number, label: string) => opts.onProgress?.(pct, label);

  if (files.length === 0) throw new Error("No files to process");

  progress(5, "Décodage des images…");
  const imgs = await Promise.all(files.map((f) => fileToImage(f)));

  // Resize all to a common canvas (use first image dimensions, downscaled)
  const baseW = imgs[0].width;
  const baseH = imgs[0].height;
  const ratio = Math.min(1, o.maxDimension / Math.max(baseW, baseH));
  const W = Math.round(baseW * ratio);
  const H = Math.round(baseH * ratio);

  progress(15, "Analyse des expositions…");
  const datas: ImageData[] = imgs.map((img) => {
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    c.getContext("2d", { willReadFrequently: true })!.drawImage(img, 0, 0, W, H);
    return c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, W, H);
  });

  const exposures: ExposureInfo[] = datas.map((d, idx) => {
    const m = meanLuminance(d);
    return { index: idx, meanLuminance: m, label: classifyExposure(m) };
  });

  let merged: ImageData;
  const filtersApplied: string[] = [];

  if (datas.length === 1) {
    progress(40, "Optimisation de l'exposition…");
    merged = datas[0];
  } else {
    progress(30, "Fusion HDR multi-couches…");
    const weights = computeWeights(datas);
    progress(50, "Mélange pondéré…");
    merged = blendWithWeights(datas, weights);
    filtersApplied.push("mertens_fusion");
  }

  if (o.applySmartFilters) {
    progress(65, "Tone mapping Reinhard…");
    merged = toneMapReinhard(merged);
    filtersApplied.push("tone_map_reinhard");

    progress(75, "Balance des blancs…");
    merged = autoWhiteBalance(merged);
    filtersApplied.push("auto_white_balance");

    progress(82, "Clarté & contraste…");
    merged = mildDehaze(merged, 0.18);
    filtersApplied.push("mild_dehaze");

    progress(88, "Microcontraste…");
    merged = unsharpMask(merged, 0.30);
    filtersApplied.push("unsharp_mask");

    progress(92, "Saturation perceptuelle…");
    merged = vibrance(merged, 0.12);
    filtersApplied.push("vibrance");
  }

  progress(95, "Encodage JPEG…");
  const fullCanvas = putImageData(merged);
  const fullBlob = await canvasToBlob(fullCanvas, "image/jpeg", o.jpegQuality);

  // Thumbnail
  const tRatio = Math.min(1, o.thumbMaxDimension / Math.max(W, H));
  const tw = Math.max(1, Math.round(W * tRatio));
  const th = Math.max(1, Math.round(H * tRatio));
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = tw;
  thumbCanvas.height = th;
  thumbCanvas.getContext("2d")!.drawImage(fullCanvas, 0, 0, tw, th);
  const thumbBlob = await canvasToBlob(thumbCanvas, "image/jpeg", o.thumbQuality);

  progress(100, "Finalisation Welkom Studio…");

  return {
    fullBlob,
    thumbBlob,
    width: W,
    height: H,
    processingTimeMs: Math.round(performance.now() - t0),
    exposures,
    filtersApplied,
  };
}

// ---------------------------------------------------------------------------
// Re-edit pipeline (manual sliders, used by WelkomStudioEditor)
// ---------------------------------------------------------------------------

export interface ManualFilters {
  brightness: number;     // -100 .. +100
  contrast: number;       // -100 .. +100
  saturation: number;     // -100 .. +100
  sharpness: number;      // 0 .. 100
  warmth: number;         // -100 .. +100  (negative = cooler, positive = warmer)
}

export function applyManualFilters(src: ImageData, f: ManualFilters): ImageData {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const data = out.data;

  const brightness = f.brightness * 1.5;          // -150..+150
  const contrastFactor = (f.contrast + 100) / 100; // 0..2
  const satFactor = (f.saturation + 100) / 100;
  const warmthR = f.warmth * 0.5;                  // shift R
  const warmthB = -f.warmth * 0.5;                 // shift B

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];

    // Brightness
    r += brightness; g += brightness; b += brightness;

    // Warmth
    r += warmthR; b += warmthB;

    // Contrast around 128
    r = (r - 128) * contrastFactor + 128;
    g = (g - 128) * contrastFactor + 128;
    b = (b - 128) * contrastFactor + 128;

    // Saturation around per-pixel mean
    const m = (r + g + b) / 3;
    r = m + (r - m) * satFactor;
    g = m + (g - m) * satFactor;
    b = m + (b - m) * satFactor;

    data[i]     = clamp255(r);
    data[i + 1] = clamp255(g);
    data[i + 2] = clamp255(b);
  }

  // Sharpness as final unsharp mask amount
  if (f.sharpness > 0) {
    return unsharpMask(out, f.sharpness / 100 * 0.7);
  }
  return out;
}

export async function reEditPhoto(
  sourceUrl: string,
  filters: ManualFilters,
  jpegQuality = 0.92
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = sourceUrl;
  });
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const edited = applyManualFilters(data, filters);
  ctx.putImageData(edited, 0, 0);
  return canvasToBlob(c, "image/jpeg", jpegQuality);
}
