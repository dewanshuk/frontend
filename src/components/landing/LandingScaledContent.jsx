import { cn } from "@/lib/utils";
import DesktopScaleCanvas, {
  LANDING_DESKTOP_WIDTH,
} from "./DesktopScaleCanvas";
import { landingShellInnerClassName } from "./landingTheme";

/**
 * Desktop-scales page body via DesktopScaleCanvas.
 *
 * @param {boolean} fullBleed
 *   When true, scale host is full main width (no side gutters) so heroes /
 *   carousels can go edge-to-edge. Put shell gutters on text/body wrappers
 *   instead (landingPageContentClassName).
 *   When false (default), host uses the same gutters as the upper navbar.
 */
export default function LandingScaledContent({
  children,
  className = "",
  designWidth = LANDING_DESKTOP_WIDTH,
  fullBleed = false,
}) {
  const hostClassName = fullBleed
    ? cn("w-full max-w-full min-w-0", className)
    : landingShellInnerClassName(cn("w-full", className));

  return (
    <div className={hostClassName}>
      <DesktopScaleCanvas width={designWidth}>{children}</DesktopScaleCanvas>
    </div>
  );
}
