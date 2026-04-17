/// <reference lib="webworker" />
import { processWelkomHDR } from "@/lib/welkom-hdr-pipeline";

export type WorkerInMessage = {
  id: string;
  blobs: Blob[];
  maxEdge?: number;
  quality?: number;
};

export type WorkerOutMessage =
  | { id: string; type: "progress"; step: string; percent: number }
  | { id: string; type: "done"; blob: Blob }
  | { id: string; type: "error"; error: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const { id, blobs, maxEdge, quality } = e.data;
  try {
    const result = await processWelkomHDR(blobs, {
      maxEdge,
      quality,
      onProgress: ({ step, percent }) => {
        const msg: WorkerOutMessage = { id, type: "progress", step, percent };
        ctx.postMessage(msg);
      },
    });
    const done: WorkerOutMessage = { id, type: "done", blob: result };
    ctx.postMessage(done);
  } catch (err) {
    const error: WorkerOutMessage = {
      id,
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    };
    ctx.postMessage(error);
  }
};
