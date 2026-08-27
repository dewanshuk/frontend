import { useEffect, useRef, useState } from "react";

// Returns true if `url` has a different origin than the current page.
// Cross-origin fetches require CORS headers; regular <img> tags do not.
const isCrossOrigin = (url) => {
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return false;
  }
};

/**
 * Renders an image from `src`. For same-origin URLs it first fetches the
 * resource as a blob and renders it via an object URL (avoids re-authentication
 * on redirect-protected endpoints). For cross-origin URLs (e.g. Azure Blob
 * SAS URLs) it skips the fetch entirely and uses a plain <img>, because the
 * fetch would trigger a CORS preflight that Azure Blob Storage typically
 * rejects — whereas a normal img load does not send an Origin header and
 * therefore loads without error.
 *
 * Props mirror a normal <img> element; `onError` is called only when the
 * image ultimately fails to load.
 */
export default function BlobImage({ src, alt, className, style, onError, ...props }) {
  const [objectUrl, setObjectUrl] = useState(null);
  // "loading" | "blob-ready" | "fallback" | "error"
  const [status, setStatus] = useState("loading");
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!src) {
      setStatus("error");
      return;
    }

    // Cross-origin URLs (Azure Blob, CDN, etc.) must not be fetched because
    // the preflight will fail with CORS errors. A plain <img> bypasses CORS.
    if (isCrossOrigin(src)) {
      setStatus("fallback");
      return;
    }

    let cancelled = false;
    let createdUrl = null;

    setStatus("loading");
    setObjectUrl(null);

    const fetchBlob = async () => {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
        setStatus("blob-ready");
      } catch {
        if (!cancelled) setStatus("fallback");
      }
    };

    fetchBlob();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src]);

  useEffect(() => {
    if (status === "error") onErrorRef.current?.();
  }, [status]);

  if (status === "loading") {
    return (
      <div className={className ?? ""} style={style} aria-busy="true">
        <div className="absolute inset-0 animate-pulse bg-slate-200" />
      </div>
    );
  }

  if (status === "error") return null;

  // Both blob-ready and fallback render an <img>; source differs
  return (
    <img
      src={status === "blob-ready" ? objectUrl : src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setStatus("error")}
      {...props}
    />
  );
}
