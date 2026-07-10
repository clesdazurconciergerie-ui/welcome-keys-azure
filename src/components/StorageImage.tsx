import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Renders an <img> whose src may point at a Supabase Storage object.
 * Handles both public URLs (returned as-is if the bucket is public) and
 * URLs whose bucket has been made private (auto-refreshes via signed URL).
 * Falls back gracefully to the original src for non-Storage URLs.
 */

const cache = new Map<string, { url: string; expires: number }>();

function parseStorageUrl(src: string): { bucket: string; path: string } | null {
  try {
    const m = src.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/);
    if (!m) return null;
    return { bucket: m[1], path: decodeURIComponent(m[2]) };
  } catch {
    return null;
  }
}

export async function resolveStorageUrl(src: string | null | undefined): Promise<string> {
  if (!src) return "";
  const parsed = parseStorageUrl(src);
  if (!parsed) return src;

  const cacheKey = `${parsed.bucket}/${parsed.path}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > now + 30_000) return cached.url;

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, 3600);
  if (error || !data?.signedUrl) return src;

  cache.set(cacheKey, { url: data.signedUrl, expires: now + 3600 * 1000 });
  return data.signedUrl;
}

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string | null | undefined;
  fallback?: string;
}

export function StorageImage({ src, fallback, ...rest }: Props) {
  const [resolved, setResolved] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url = await resolveStorageUrl(src);
      if (!cancelled) setResolved(url || fallback || "");
    })();
    return () => {
      cancelled = true;
    };
  }, [src, fallback]);

  if (!resolved) {
    return <div {...(rest as any)} aria-hidden="true" />;
  }
  return <img {...rest} src={resolved} />;
}
