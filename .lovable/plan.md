

## Plan: Rebuild Photo Optimizer with Nodalview-style approach

### The real problem

The current local HDR pipeline (Canvas pixel manipulation) is fundamentally flawed. No amount of Laplacian pyramids or tone mapping curves on a **single source photo** will produce Nodalview-quality results. Nodalview uses **server-side AI** and real multi-exposure hardware capture — not browser-based pixel math.

The local processing is actually **degrading** images before sending them to OpenAI. Dark, noisy, over-processed results are the direct consequence of trying to simulate HDR from one photo using canvas math.

### The fix: trust the AI, ditch the fake HDR

Nodalview's secret is simple: capture a good photo, send it to powerful server-side AI, get back a pro result. That's exactly what our OpenAI pipeline already does — but the local HDR step is corrupting the input.

### What changes

**1. Rewrite `src/lib/hdr-processor.ts` — strip to essentials**
- Remove all Laplacian pyramid, exposure bracketing simulation, and fake HDR fusion
- Keep only: canvas capture from camera/file, minimal normalization (auto-levels), motion detection
- The `processHDR` function becomes `preparePhoto` — a lightweight prep that ensures good input for the AI
- No more "5 brackets from 1 photo" — that's the root cause of noise and artifacts

**2. Rewrite `supabase/functions/photo-optimizer-generate/index.ts` — Nodalview-grade prompt**
- Completely rewrite the AI prompt to focus on Nodalview's actual output characteristics:
  - Bright, airy interiors (windows visible, no blown highlights)
  - Clean whites, natural colors, zero noise
  - Vertical line correction, wide-angle distortion fix
  - "Magazine listing" warmth without orange cast
- Remove overly complex style/intensity matrix — replace with a single "Nodalview Pro" mode as default
- Keep style options but simplify them (Standard / Luxe / Exterieur)

**3. Update `src/components/photo-optimizer/SmartCaptureModal.tsx`**
- Remove fake "bracketing" progress steps ("Smart Fusion pyramides")
- Simplify to: Capture → "Optimisation IA en cours..." → Done
- Keep stability detection and countdown (good UX)
- Camera capture sends raw photo directly to AI — no local degradation

**4. Update `src/pages/dashboard/PhotoOptimizerPage.tsx`**
- One-click flow: take/upload photo → AI processes → beautiful result
- Remove references to "HDR", "brackets", "fusion" in UI text
- Label it "Smart Photo" or "Photo Pro" (like Nodalview)
- Keep Before/After slider (that's great UX)

### Why this will work
- OpenAI's GPT-image-1 is vastly superior to any canvas pixel manipulation
- Sending a clean, unprocessed source photo gives the AI the best input
- The current pipeline: photo → degrade with fake HDR → send degraded image to AI = bad
- New pipeline: photo → send clean image to AI = good

### Files to modify
1. `src/lib/hdr-processor.ts` — gutted and simplified
2. `supabase/functions/photo-optimizer-generate/index.ts` — new Nodalview-inspired prompt
3. `src/components/photo-optimizer/SmartCaptureModal.tsx` — simplified flow
4. `src/pages/dashboard/PhotoOptimizerPage.tsx` — updated labels and flow

