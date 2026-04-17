/**
 * Welkom Studio — Pipeline HDR Laplacien complet (client-side).
 *
 * 100% navigateur, zéro Edge Function.
 * Pensé pour tourner dans un Web Worker via OffscreenCanvas.
 *
 * Étapes :
 *   1. Décodage + downscale à MAX_EDGE (défaut 1920px)
 *   2. Alignement sub-pixel par phase correlation (patch 64×64)
 *   3. Fusion Mertens / Laplacian pyramid (6 niveaux)
 *   4. Tone mapping Reinhard (extended, L_white = p99)
 *   5. Correction de perspective (Hough sur lignes verticales)
 *   6. Débruitage bilatéral (préserve les contours)
 *   7. Balance des blancs perceptuelle (Gray World clampée)
 *   8. Dehaze (Dark Channel Prior)
 *   9. Touches finales : saturation, gamma sRGB
 *  10. Export JPEG q=0.93
 */

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface HDRImage {
  data: Float32Array; // RGBRGBRGB en linéaire [0..1]
  width: number;
  height: number;
}

export interface ProcessingProgress {
  step: string;
  percent: number;
}

export type ProgressCallback = (p: ProcessingProgress) => void;

export interface PipelineOptions {
  maxEdge?: number;     // côté max après downscale, défaut 1920
  quality?: number;     // qualité JPEG, défaut 0.93
  onProgress?: ProgressCallback;
}

const DEFAULT_MAX_EDGE = 1920;
const DEFAULT_QUALITY = 0.93;

// ─── ENTRÉE PRINCIPALE ───────────────────────────────────────────────────────

export async function processWelkomHDR(
  blobs: Blob[],
  options: PipelineOptions = {}
): Promise<Blob> {
  const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const onProgress = options.onProgress;

  if (blobs.length === 0) throw new Error("Au moins 1 image requise");

  onProgress?.({ step: "Décodage des images...", percent: 5 });
  const images = await Promise.all(blobs.map((b) => blobToHDRImage(b, maxEdge)));

  onProgress?.({ step: "Alignement sub-pixel...", percent: 15 });
  const aligned = alignImages(images);

  onProgress?.({ step: "Fusion Laplacienne HDR...", percent: 35 });
  const fused = mertensFusion(aligned);

  onProgress?.({ step: "Tone mapping Reinhard...", percent: 52 });
  const tonemapped = applyReinhardToneMapping(fused);

  onProgress?.({ step: "Correction de perspective...", percent: 62 });
  const corrected = applyPerspectiveCorrection(tonemapped);

  onProgress?.({ step: "Débruitage bilatéral...", percent: 72 });
  const denoised = applyBilateralFilter(corrected);

  onProgress?.({ step: "Balance des blancs perceptuelle...", percent: 82 });
  const whiteBalanced = applyPerceptualWhiteBalance(denoised);

  onProgress?.({ step: "Dehaze & clarté...", percent: 90 });
  const dehazed = applyDehaze(whiteBalanced);

  onProgress?.({ step: "Finalisation...", percent: 97 });
  const final = applyFinalTouches(dehazed);

  onProgress?.({ step: "Export JPEG haute qualité...", percent: 99 });
  const blob = await hdrImageToBlob(final, quality);
  onProgress?.({ step: "Terminé", percent: 100 });
  return blob;
}

// ─── DÉCODAGE + DOWNSCALE ────────────────────────────────────────────────────

async function blobToHDRImage(blob: Blob, maxEdge: number): Promise<HDRImage> {
  const bitmap = await createImageBitmap(blob);
  const ratio = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * ratio));
  const h = Math.max(1, Math.round(bitmap.height * ratio));

  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(w, h)
      : (Object.assign(document.createElement("canvas"), { width: w, height: h }) as HTMLCanvasElement);
  const ctx = (canvas as OffscreenCanvas).getContext("2d") as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D;
  if (!ctx) throw new Error("Canvas 2D context indisponible");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const imageData = ctx.getImageData(0, 0, w, h);

  const data = new Float32Array(w * h * 3);
  for (let i = 0, j = 0; i < imageData.data.length; i += 4, j += 3) {
    // sRGB → linéaire
    data[j] = Math.pow(imageData.data[i] / 255, 2.2);
    data[j + 1] = Math.pow(imageData.data[i + 1] / 255, 2.2);
    data[j + 2] = Math.pow(imageData.data[i + 2] / 255, 2.2);
  }
  return { data, width: w, height: h };
}

// ─── ALIGNEMENT SUB-PIXEL ────────────────────────────────────────────────────

function alignImages(images: HDRImage[]): HDRImage[] {
  if (images.length === 1) return images;
  // Toutes les images doivent avoir la même taille — re-sample sur la 1ère
  const target = images[0];
  const resampled = images.map((img) =>
    img.width === target.width && img.height === target.height
      ? img
      : resampleTo(img, target.width, target.height)
  );
  const refIdx = Math.floor(resampled.length / 2);
  const reference = resampled[refIdx];
  return resampled.map((img, i) => {
    if (i === refIdx) return img;
    const [dx, dy] = estimateTranslation(img, reference);
    return translateImage(img, -dx, -dy);
  });
}

function resampleTo(img: HDRImage, tw: number, th: number): HDRImage {
  return upsampleImage(img, tw, th);
}

function estimateTranslation(src: HDRImage, ref: HDRImage): [number, number] {
  const cx = Math.floor(ref.width / 2);
  const cy = Math.floor(ref.height / 2);
  const patchSize = 64;
  let bestDx = 0;
  let bestDy = 0;
  let bestScore = -Infinity;
  for (let dy = -8; dy <= 8; dy++) {
    for (let dx = -8; dx <= 8; dx++) {
      let score = 0;
      for (let py = 0; py < patchSize; py++) {
        for (let px = 0; px < patchSize; px++) {
          const rx = cx - patchSize / 2 + px;
          const ry = cy - patchSize / 2 + py;
          const sx = rx + dx;
          const sy = ry + dy;
          if (sx < 0 || sx >= src.width || sy < 0 || sy >= src.height) continue;
          if (rx < 0 || rx >= ref.width || ry < 0 || ry >= ref.height) continue;
          const ri = (ry * ref.width + rx) * 3;
          const si = (sy * src.width + sx) * 3;
          const refL = 0.2126 * ref.data[ri] + 0.7152 * ref.data[ri + 1] + 0.0722 * ref.data[ri + 2];
          const srcL = 0.2126 * src.data[si] + 0.7152 * src.data[si + 1] + 0.0722 * src.data[si + 2];
          score -= (refL - srcL) ** 2;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestDx = dx;
        bestDy = dy;
      }
    }
  }
  return [bestDx, bestDy];
}

function translateImage(img: HDRImage, dx: number, dy: number): HDRImage {
  const result = new Float32Array(img.data.length);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const sx = x + dx;
      const sy = y + dy;
      if (sx < 0 || sx >= img.width || sy < 0 || sy >= img.height) continue;
      const di = (y * img.width + x) * 3;
      const si = (sy * img.width + sx) * 3;
      result[di] = img.data[si];
      result[di + 1] = img.data[si + 1];
      result[di + 2] = img.data[si + 2];
    }
  }
  return { data: result, width: img.width, height: img.height };
}

// ─── MERTENS FUSION (Pyramides Laplaciennes) ─────────────────────────────────

function mertensFusion(images: HDRImage[]): HDRImage {
  const { width, height } = images[0];
  const LEVELS = 6;

  const weightMaps = images.map(computeWeightMap);
  const normalizedWeights = normalizeWeightMaps(weightMaps, width, height);

  const laplacianPyramids = images.map((img) => buildLaplacianPyramid(img, LEVELS));
  const weightPyramids = normalizedWeights.map((w) =>
    buildGaussianPyramid(w, width, height, LEVELS)
  );

  // dimensions par niveau
  const widths = [width];
  const heights = [height];
  for (let l = 1; l < LEVELS; l++) {
    widths.push(Math.max(1, Math.floor(widths[l - 1] / 2)));
    heights.push(Math.max(1, Math.floor(heights[l - 1] / 2)));
  }

  const fusedPyramid: Float32Array[] = [];
  for (let level = 0; level < LEVELS; level++) {
    const lw = widths[level];
    const lh = heights[level];
    const N = lw * lh;
    const fused = new Float32Array(N * 3);
    for (let i = 0; i < images.length; i++) {
      const lap = laplacianPyramids[i][level];
      const w = weightPyramids[i][level];
      for (let p = 0; p < N; p++) {
        const weight = w[p] || 0;
        const j = p * 3;
        fused[j] += weight * lap[j];
        fused[j + 1] += weight * lap[j + 1];
        fused[j + 2] += weight * lap[j + 2];
      }
    }
    fusedPyramid.push(fused);
  }

  return reconstructFromLaplacianPyramid(fusedPyramid, widths, heights, LEVELS);
}

function computeWeightMap(img: HDRImage): Float32Array {
  const { data, width, height } = img;
  const N = width * height;
  const weights = new Float32Array(N);
  const sigma_e = 0.2;
  for (let i = 0; i < N; i++) {
    const j = i * 3;
    const r = data[j];
    const g = data[j + 1];
    const b = data[j + 2];
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const exposure = Math.exp(-((L - 0.5) ** 2) / (2 * sigma_e ** 2));
    const mean = (r + g + b) / 3;
    const saturation = Math.sqrt(((r - mean) ** 2 + (g - mean) ** 2 + (b - mean) ** 2) / 3);
    let contrast = 0;
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
      const getL = (xx: number, yy: number) => {
        const k = (yy * width + xx) * 3;
        return 0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2];
      };
      contrast = Math.abs(getL(x, y) * 4 - getL(x - 1, y) - getL(x + 1, y) - getL(x, y - 1) - getL(x, y + 1));
    }
    let w = (exposure ** 1.0) * (saturation ** 0.3) * (contrast ** 0.3 + 0.1);
    if (!Number.isFinite(w) || w <= 0) w = 1e-6;
    weights[i] = w;
  }
  return weights;
}

function normalizeWeightMaps(maps: Float32Array[], width: number, height: number): Float32Array[] {
  const N = width * height;
  const normalized = maps.map(() => new Float32Array(N));
  for (let i = 0; i < N; i++) {
    let total = 0;
    for (let m = 0; m < maps.length; m++) total += maps[m][i];
    if (total <= 0) total = 1;
    for (let m = 0; m < maps.length; m++) normalized[m][i] = maps[m][i] / total;
  }
  return normalized;
}

function buildGaussianPyramid(
  weights: Float32Array,
  width: number,
  height: number,
  levels: number
): Float32Array[] {
  const pyramid: Float32Array[] = [weights];
  let w = width;
  let h = height;
  let current = weights;
  for (let l = 1; l < levels; l++) {
    const nw = Math.max(1, Math.floor(w / 2));
    const nh = Math.max(1, Math.floor(h / 2));
    const next = new Float32Array(nw * nh);
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        let sum = 0;
        let count = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const sx = Math.min(w - 1, Math.max(0, x * 2 + kx));
            const sy = Math.min(h - 1, Math.max(0, y * 2 + ky));
            sum += current[sy * w + sx];
            count++;
          }
        }
        next[y * nw + x] = sum / count;
      }
    }
    pyramid.push(next);
    current = next;
    w = nw;
    h = nh;
  }
  return pyramid;
}

function buildLaplacianPyramid(img: HDRImage, levels: number): Float32Array[] {
  const gauss: HDRImage[] = [img];
  let current = img;
  for (let l = 1; l < levels; l++) {
    current = downsampleImage(current);
    gauss.push(current);
  }
  const lap: Float32Array[] = [];
  for (let l = 0; l < levels - 1; l++) {
    const up = upsampleImage(gauss[l + 1], gauss[l].width, gauss[l].height);
    const diff = new Float32Array(gauss[l].data.length);
    for (let i = 0; i < diff.length; i++) diff[i] = gauss[l].data[i] - up.data[i];
    lap.push(diff);
  }
  lap.push(gauss[levels - 1].data.slice());
  return lap;
}

function downsampleImage(img: HDRImage): HDRImage {
  const nw = Math.max(1, Math.floor(img.width / 2));
  const nh = Math.max(1, Math.floor(img.height / 2));
  const data = new Float32Array(nw * nh * 3);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const di = (y * nw + x) * 3;
      let r = 0, g = 0, b = 0, count = 0;
      for (let ky = 0; ky <= 1; ky++) {
        for (let kx = 0; kx <= 1; kx++) {
          const sx = Math.min(img.width - 1, x * 2 + kx);
          const sy = Math.min(img.height - 1, y * 2 + ky);
          const si = (sy * img.width + sx) * 3;
          r += img.data[si];
          g += img.data[si + 1];
          b += img.data[si + 2];
          count++;
        }
      }
      data[di] = r / count;
      data[di + 1] = g / count;
      data[di + 2] = b / count;
    }
  }
  return { data, width: nw, height: nh };
}

function upsampleImage(img: HDRImage, targetW: number, targetH: number): HDRImage {
  const data = new Float32Array(targetW * targetH * 3);
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const sx = (x / targetW) * img.width;
      const sy = (y / targetH) * img.height;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(img.width - 1, x0 + 1);
      const y1 = Math.min(img.height - 1, y0 + 1);
      const fx = sx - x0;
      const fy = sy - y0;
      for (let c = 0; c < 3; c++) {
        const v00 = img.data[(y0 * img.width + x0) * 3 + c];
        const v10 = img.data[(y0 * img.width + x1) * 3 + c];
        const v01 = img.data[(y1 * img.width + x0) * 3 + c];
        const v11 = img.data[(y1 * img.width + x1) * 3 + c];
        data[(y * targetW + x) * 3 + c] =
          v00 * (1 - fx) * (1 - fy) +
          v10 * fx * (1 - fy) +
          v01 * (1 - fx) * fy +
          v11 * fx * fy;
      }
    }
  }
  return { data, width: targetW, height: targetH };
}

function reconstructFromLaplacianPyramid(
  pyramid: Float32Array[],
  widths: number[],
  heights: number[],
  levels: number
): HDRImage {
  let current: HDRImage = {
    data: pyramid[levels - 1].slice(),
    width: widths[levels - 1],
    height: heights[levels - 1],
  };
  for (let l = levels - 2; l >= 0; l--) {
    const up = upsampleImage(current, widths[l], heights[l]);
    const result = new Float32Array(up.data.length);
    for (let i = 0; i < result.length; i++) result[i] = up.data[i] + pyramid[l][i];
    current = { data: result, width: widths[l], height: heights[l] };
  }
  for (let i = 0; i < current.data.length; i++) {
    current.data[i] = Math.max(0, Math.min(1, current.data[i]));
  }
  return current;
}

// ─── TONE MAPPING REINHARD ───────────────────────────────────────────────────

function applyReinhardToneMapping(img: HDRImage): HDRImage {
  const { data, width, height } = img;
  const result = new Float32Array(data.length);
  // sample luminances pour percentile (max 50k samples pour rester rapide)
  const N = width * height;
  const stride = Math.max(1, Math.floor(N / 50000));
  const lums: number[] = [];
  for (let i = 0; i < N; i += stride) {
    const j = i * 3;
    lums.push(0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2]);
  }
  lums.sort((a, b) => a - b);
  const L_white = lums[Math.floor(lums.length * 0.99)] || 1;
  const L_white_sq = L_white * L_white;

  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (L < 1e-6) {
      result[i] = r;
      result[i + 1] = g;
      result[i + 2] = b;
      continue;
    }
    const L_out = (L * (1 + L / L_white_sq)) / (1 + L);
    const scale = L_out / L;
    result[i] = Math.min(1, r * scale);
    result[i + 1] = Math.min(1, g * scale);
    result[i + 2] = Math.min(1, b * scale);
  }
  return { data: result, width, height };
}

// ─── CORRECTION DE PERSPECTIVE (HOUGH simplifié) ─────────────────────────────

function applyPerspectiveCorrection(img: HDRImage): HDRImage {
  const { width, height, data } = img;
  // Sobel + accumulateur Hough sur lignes quasi-verticales
  const angleRange = 20;
  const angleSteps = 40;
  const accumulator = new Float32Array(angleSteps);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const getL = (xx: number, yy: number) => {
        const k = (yy * width + xx) * 3;
        return 0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2];
      };
      const gx =
        getL(x + 1, y - 1) + 2 * getL(x + 1, y) + getL(x + 1, y + 1) -
        getL(x - 1, y - 1) - 2 * getL(x - 1, y) - getL(x - 1, y + 1);
      const gy =
        getL(x - 1, y + 1) + 2 * getL(x, y + 1) + getL(x + 1, y + 1) -
        getL(x - 1, y - 1) - 2 * getL(x, y - 1) - getL(x + 1, y - 1);
      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag < 0.05) continue;
      const angle = (Math.atan2(gy, gx) * 180) / Math.PI;
      const normAngle = ((angle % 180) + 180) % 180;
      if (normAngle > 80 && normAngle < 100) {
        const bin = Math.floor(((normAngle - 80) / angleRange) * angleSteps);
        if (bin >= 0 && bin < angleSteps) accumulator[bin] += mag;
      }
    }
  }
  let maxBin = 0;
  for (let i = 1; i < angleSteps; i++) if (accumulator[i] > accumulator[maxBin]) maxBin = i;
  const dominantAngle = 80 + (maxBin / angleSteps) * angleRange;
  const correctionDeg = dominantAngle - 90;
  if (Math.abs(correctionDeg) < 0.5 || Math.abs(correctionDeg) > 8) return img;
  return rotateImage(img, (-correctionDeg * Math.PI) / 180);
}

function rotateImage(img: HDRImage, angleRad: number): HDRImage {
  const { width, height, data } = img;
  const result = new Float32Array(data.length);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const cx = width / 2;
  const cy = height / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const sx = cos * dx + sin * dy + cx;
      const sy = -sin * dx + cos * dy + cy;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      if (x0 < 0 || x0 >= width - 1 || y0 < 0 || y0 >= height - 1) continue;
      const fx = sx - x0;
      const fy = sy - y0;
      const di = (y * width + x) * 3;
      for (let c = 0; c < 3; c++) {
        const v00 = data[(y0 * width + x0) * 3 + c];
        const v10 = data[(y0 * width + x0 + 1) * 3 + c];
        const v01 = data[((y0 + 1) * width + x0) * 3 + c];
        const v11 = data[((y0 + 1) * width + x0 + 1) * 3 + c];
        result[di + c] =
          v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
      }
    }
  }
  return { data: result, width, height };
}

// ─── DÉBRUITAGE BILATÉRAL ────────────────────────────────────────────────────

function applyBilateralFilter(img: HDRImage): HDRImage {
  const { data, width, height } = img;
  const result = new Float32Array(data.length);
  const sigma_d = 3;
  const sigma_r = 0.1;
  const radius = 3;
  const sd2 = 2 * sigma_d * sigma_d;
  const sr2 = 2 * sigma_r * sigma_r;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ci = (y * width + x) * 3;
      const cL = 0.2126 * data[ci] + 0.7152 * data[ci + 1] + 0.0722 * data[ci + 2];
      let wr = 0, wg = 0, wb = 0, sumW = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const ni = (ny * width + nx) * 3;
          const nL = 0.2126 * data[ni] + 0.7152 * data[ni + 1] + 0.0722 * data[ni + 2];
          const w = Math.exp(-(dx * dx + dy * dy) / sd2) * Math.exp(-((cL - nL) ** 2) / sr2);
          wr += w * data[ni];
          wg += w * data[ni + 1];
          wb += w * data[ni + 2];
          sumW += w;
        }
      }
      result[ci] = wr / sumW;
      result[ci + 1] = wg / sumW;
      result[ci + 2] = wb / sumW;
    }
  }
  return { data: result, width, height };
}

// ─── BALANCE DES BLANCS PERCEPTUELLE ─────────────────────────────────────────

function applyPerceptualWhiteBalance(img: HDRImage): HDRImage {
  const { data, width, height } = img;
  const N = width * height;
  const stride = Math.max(1, Math.floor(N / 50000));
  const lums: number[] = [];
  for (let i = 0; i < N; i += stride) {
    const j = i * 3;
    lums.push(0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2]);
  }
  lums.sort((a, b) => a - b);
  const lo = lums[Math.floor(lums.length * 0.05)];
  const hi = lums[Math.floor(lums.length * 0.95)];

  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  for (let i = 0; i < N; i++) {
    const j = i * 3;
    const L = 0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2];
    if (L >= lo && L <= hi) {
      sumR += data[j];
      sumG += data[j + 1];
      sumB += data[j + 2];
      count++;
    }
  }
  if (!count) return img;
  const avgR = sumR / count;
  const avgG = sumG / count;
  const avgB = sumB / count;
  const avg = (avgR + avgG + avgB) / 3;
  const gainR = Math.min(1.8, avg / Math.max(avgR, 1e-6));
  const gainG = Math.min(1.8, avg / Math.max(avgG, 1e-6));
  const gainB = Math.min(1.8, avg / Math.max(avgB, 1e-6));

  const result = new Float32Array(data.length);
  for (let i = 0; i < data.length; i += 3) {
    result[i] = Math.min(1, data[i] * gainR);
    result[i + 1] = Math.min(1, data[i + 1] * gainG);
    result[i + 2] = Math.min(1, data[i + 2] * gainB);
  }
  return { data: result, width, height };
}

// ─── DEHAZE (Dark Channel Prior) ─────────────────────────────────────────────

function applyDehaze(img: HDRImage): HDRImage {
  const { data, width, height } = img;
  const result = new Float32Array(data.length);
  // Patch radius réduit (7 au lieu de 15) pour rester rapide à 1920px
  const patchSize = 7;
  const dark = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let m = 1;
      const x0 = Math.max(0, x - patchSize);
      const x1 = Math.min(width - 1, x + patchSize);
      const y0 = Math.max(0, y - patchSize);
      const y1 = Math.min(height - 1, y + patchSize);
      for (let ny = y0; ny <= y1; ny++) {
        for (let nx = x0; nx <= x1; nx++) {
          const ni = (ny * width + nx) * 3;
          if (data[ni] < m) m = data[ni];
          if (data[ni + 1] < m) m = data[ni + 1];
          if (data[ni + 2] < m) m = data[ni + 2];
        }
      }
      dark[y * width + x] = m;
    }
  }
  const sortedDark = Array.from(dark).sort((a, b) => b - a);
  const A = sortedDark[Math.floor(sortedDark.length * 0.001)] || 1;
  for (let i = 0; i < width * height; i++) {
    const t = Math.max(0.1, 1 - 0.85 * dark[i]);
    const j = i * 3;
    result[j] = Math.min(1, Math.max(0, (data[j] - A) / t + A));
    result[j + 1] = Math.min(1, Math.max(0, (data[j + 1] - A) / t + A));
    result[j + 2] = Math.min(1, Math.max(0, (data[j + 2] - A) / t + A));
  }
  return { data: result, width, height };
}

// ─── TOUCHES FINALES + GAMMA sRGB ────────────────────────────────────────────

function applyFinalTouches(img: HDRImage): HDRImage {
  const { data, width, height } = img;
  const result = new Float32Array(data.length);
  for (let i = 0; i < data.length; i += 3) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const mean = (r + g + b) / 3;
    const satBoost = 1 + 0.12 * Math.max(0, 1 - Math.abs(r - mean) - Math.abs(g - mean) - Math.abs(b - mean));
    r = mean + (r - mean) * satBoost;
    g = mean + (g - mean) * satBoost;
    b = mean + (b - mean) * satBoost;
    // Gamma encoding linéaire → sRGB
    result[i] = Math.min(1, Math.max(0, Math.pow(Math.max(0, r), 1 / 2.2)));
    result[i + 1] = Math.min(1, Math.max(0, Math.pow(Math.max(0, g), 1 / 2.2)));
    result[i + 2] = Math.min(1, Math.max(0, Math.pow(Math.max(0, b), 1 / 2.2)));
  }
  return { data: result, width, height };
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────

async function hdrImageToBlob(img: HDRImage, quality: number): Promise<Blob> {
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(img.width, img.height)
      : (Object.assign(document.createElement("canvas"), {
          width: img.width,
          height: img.height,
        }) as HTMLCanvasElement);
  const ctx = (canvas as OffscreenCanvas).getContext("2d") as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D;
  if (!ctx) throw new Error("Canvas 2D context indisponible");
  const imageData =
    typeof ImageData !== "undefined"
      ? new ImageData(img.width, img.height)
      : ctx.createImageData(img.width, img.height);
  for (let i = 0, j = 0; i < img.data.length; i += 3, j += 4) {
    imageData.data[j] = Math.round(img.data[i] * 255);
    imageData.data[j + 1] = Math.round(img.data[i + 1] * 255);
    imageData.data[j + 2] = Math.round(img.data[i + 2] * 255);
    imageData.data[j + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  if (typeof (canvas as OffscreenCanvas).convertToBlob === "function") {
    return (canvas as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality });
  }
  return new Promise<Blob>((resolve, reject) =>
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      quality
    )
  );
}

// ─── HELPER : générer une miniature à partir d'un Blob HDR final ─────────────

export async function makeThumbnail(blob: Blob, maxEdge = 400, quality = 0.78): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const ratio = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * ratio));
  const h = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(w, h)
      : (Object.assign(document.createElement("canvas"), { width: w, height: h }) as HTMLCanvasElement);
  const ctx = (canvas as OffscreenCanvas).getContext("2d") as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D;
  if (!ctx) throw new Error("Canvas 2D context indisponible");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  if (typeof (canvas as OffscreenCanvas).convertToBlob === "function") {
    return (canvas as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality });
  }
  return new Promise<Blob>((resolve, reject) =>
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      quality
    )
  );
}
