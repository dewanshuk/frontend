import { useEffect, useState } from "react";
import { Image as ImageIcon, Play, Video } from "lucide-react";
import BlobImage from "../shared/BlobImage";
import EventTruncatedText from "./EventTruncatedText";
import { cn } from "@/lib/utils";

function MediaPlaceholder({ type = "image" }) {
  return (
    <span
      className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#e0f2fe] to-[#e6fffa] text-[#8fc4c8]"
      aria-hidden
    >
      {type === "video" ? (
        <Video className="size-10" strokeWidth={1.5} />
      ) : (
        <ImageIcon className="size-10" strokeWidth={1.5} />
      )}
    </span>
  );
}

export default function EventGalleryCard({ item, onClick, className = "", animationDelay = 0, large = false }) {
  const isVideo = item?.type === "video";
  const previewSrc = item?.thumbnailUrl || item?.url || "";
  const hasPreviewSrc = Boolean(previewSrc);
  const hasPlayableUrl = Boolean(item?.url || item?.thumbnailUrl);
  const caption = String(item?.caption || "").trim();
  const [isBroken, setIsBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setIsBroken(false);
    setLoaded(false);
  }, [previewSrc]);

  const showPlaceholder = !hasPreviewSrc || isBroken;
  const canOpen = isVideo ? Boolean(item?.url) : hasPlayableUrl && !isBroken;

  return (
    <button
      type="button"
      onClick={() => { if (canOpen) onClick?.(); }}
      disabled={!canOpen}
      aria-disabled={!canOpen}
      style={{ animationDelay: `${animationDelay}ms` }}
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[#cfe3f0] bg-white text-left",
        "shadow-[0_6px_20px_rgba(15,47,87,0.1)] transition-all duration-300",
        "opacity-0 animate-[fadeSlideUp_0.45s_ease_forwards]",
        canOpen
          ? "cursor-pointer hover:-translate-y-1.5 hover:shadow-[0_16px_38px_rgba(15,47,87,0.18)] hover:ring-2 hover:ring-[#5eead4]/60"
          : "cursor-default",
        className,
      )}
    >
      <span className="relative block w-full overflow-hidden bg-[#e6f7f8]" style={{ aspectRatio: large ? "16/8" : "16/10" }}>
        {showPlaceholder ? (
          <MediaPlaceholder type={isVideo ? "video" : "image"} />
        ) : (
          <BlobImage
            src={previewSrc}
            alt=""
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-transform duration-500",
              canOpen && "group-hover:scale-105",
              loaded ? "opacity-100" : "opacity-0",
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setIsBroken(true)}
          />
        )}

        {!showPlaceholder && (
          <>
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#08122c]/75 via-[#08122c]/25 to-transparent" />
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d9488]/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </>
        )}

        {isVideo && canOpen && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className={cn(
              "flex items-center justify-center rounded-full bg-white/95 shadow-[0_8px_24px_rgba(4,14,38,0.45)] ring-1 ring-white/60 transition-transform duration-300 group-hover:scale-110",
              large ? "h-11 w-11" : "h-10 w-10",
            )}>
              <Play className={cn("fill-[#171c8f] text-[#171c8f]", large ? "ml-0.5 h-5 w-5" : "ml-0.5 h-4 w-4")} />
            </span>
          </span>
        )}

        {caption && (
          <span className={cn("absolute inset-x-0 bottom-0", large ? "px-2.5 pb-2" : "px-3 pb-2.5")}>
            <EventTruncatedText
              text={caption}
              maxChars={large ? 50 : 40}
              className={cn(
                "block truncate font-semibold leading-snug text-white drop-shadow",
                large ? "text-base" : "text-sm",
              )}
            />
          </span>
        )}
      </span>

      <span className={cn("flex items-center gap-1.5 bg-gradient-to-r from-[#f7fbfd] to-[#f2fbfa]", large ? "px-2.5 py-1.5" : "px-3 py-2")}>
        <span className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide",
          large ? "text-xs" : "text-xs",
          isVideo
            ? "bg-[#e8eaff] text-[#252a9c] ring-1 ring-[#c7cbf4]"
            : "bg-[#ccfbf1] text-[#0f766e] ring-1 ring-[#99f6e4]",
        )}>
          {isVideo ? <Video className={large ? "size-3" : "size-3"} /> : <ImageIcon className={large ? "size-3" : "size-3"} />}
          {isVideo ? "Video" : "Photo"}
        </span>
      </span>
    </button>
  );
}
