/**
 * Wrapper qui lance le pipeline HDR dans un Web Worker dédié.
 * Le Worker utilise OffscreenCanvas + Float32Array pour ne jamais bloquer le main thread.
 *
 * Fallback : si Worker indisponible (vieux navigateur), on exécute la pipeline
 * dans le main thread (sera plus lent mais fonctionnera).
 */
import {
  processWelkomHDR,
  makeThumbnail,
  type ProgressCallback,
} from "./welkom-hdr-pipeline";
import type { WorkerInMessage, WorkerOutMessage } from "@/workers/welkom-hdr.worker";

export interface RunnerOptions {
  maxEdge?: number;
  quality?: number;
  onProgress?: ProgressCallback;
}

export interface HDRRunResult {
  fullBlob: Blob;
  thumbBlob: Blob;
  processingTimeMs: number;
}

function createWorker(): Worker | null {
  try {
    return new Worker(new URL("@/workers/welkom-hdr.worker.ts", import.meta.url), {
      type: "module",
    });
  } catch {
    return null;
  }
}

export async function runWelkomHDR(
  blobs: Blob[],
  options: RunnerOptions = {}
): Promise<HDRRunResult> {
  const start = performance.now();
  const fullBlob = await runHDRWithWorker(blobs, options);
  const thumbBlob = await makeThumbnail(fullBlob, 400, 0.78);
  return {
    fullBlob,
    thumbBlob,
    processingTimeMs: Math.round(performance.now() - start),
  };
}

function runHDRWithWorker(blobs: Blob[], options: RunnerOptions): Promise<Blob> {
  const worker = createWorker();
  if (!worker) {
    // Fallback main thread
    return processWelkomHDR(blobs, {
      maxEdge: options.maxEdge,
      quality: options.quality,
      onProgress: options.onProgress,
    });
  }

  return new Promise<Blob>((resolve, reject) => {
    const id = crypto.randomUUID();
    const handle = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;
      if (msg.id !== id) return;
      if (msg.type === "progress") {
        options.onProgress?.({ step: msg.step, percent: msg.percent });
      } else if (msg.type === "done") {
        worker.removeEventListener("message", handle);
        worker.terminate();
        resolve(msg.blob);
      } else {
        worker.removeEventListener("message", handle);
        worker.terminate();
        reject(new Error(msg.error));
      }
    };
    worker.addEventListener("message", handle);
    worker.addEventListener("error", (e) => {
      worker.terminate();
      reject(new Error(e.message || "Worker HDR : erreur inconnue"));
    });
    const message: WorkerInMessage = {
      id,
      blobs,
      maxEdge: options.maxEdge,
      quality: options.quality,
    };
    worker.postMessage(message);
  });
}
