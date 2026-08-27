import { useLayoutEffect, useRef, useState } from "react";

export const LANDING_DESKTOP_WIDTH = 1920;

/**
 * Renders children at a fixed design width and scales to the host width
 * so the layout always spans the host left→right (including under browser zoom).
 *
 * Uses getBoundingClientRect for host width so CSS zoom / browser zoom
 * report the same width used for painted layout.
 */
export default function DesktopScaleCanvas({
  children,
  width = LANDING_DESKTOP_WIDTH,
  maxScale = Number.POSITIVE_INFINITY,
  minScale = 0,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useLayoutEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    const readHostWidth = () => {
      // clientWidth ignores ancestors with CSS zoom inconsistently across browsers;
      // layout width for flex children is more reliable via offsetWidth.
      const w = host.offsetWidth || host.clientWidth || 0;
      return w;
    };

    const updateMetrics = () => {
      const hostWidth = readHostWidth();
      let next = hostWidth > 0 && width > 0 ? hostWidth / width : 1;
      if (!Number.isFinite(next) || next <= 0) next = 1;
      if (minScale > 0) next = Math.max(minScale, next);
      if (Number.isFinite(maxScale)) next = Math.min(maxScale, next);
      setScale(next);
      setNaturalHeight(canvas.offsetHeight);
    };

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(host);
    observer.observe(canvas);
    updateMetrics();
    window.addEventListener("resize", updateMetrics);
    // Browser zoom changes layout without always firing ResizeObserver reliably.
    window.addEventListener("orientationchange", updateMetrics);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateMetrics);
      window.removeEventListener("orientationchange", updateMetrics);
    };
  }, [width, maxScale, minScale]);

  return (
    <div
      ref={hostRef}
      className="relative w-full max-w-full min-w-0 overflow-hidden"
      style={{
        height: naturalHeight > 0 ? Math.ceil(naturalHeight * scale) : undefined,
      }}
    >
      <div
        ref={canvasRef}
        className="absolute left-0 top-0 origin-top-left will-change-transform"
        style={{
          width,
          transform: `scale(${scale})`,
          // Fill host exactly (avoids sub-pixel shortfall leaving a gap on the right)
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
