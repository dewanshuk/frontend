import { useEffect, useState } from "react";
import { Image as ImageIcon, Video } from "lucide-react";
import BlobImage from "../shared/BlobImage";
import EventTruncatedText from "./EventTruncatedText";
import { cn } from "@/lib/utils";

const PLAY_CIRCLE_SRC = "/assets/icons/events/play-circle.svg";

/** Figma 2311:43403 / 2311:43406 — media background + type icon */
function MediaPlaceholder({ type = "image" }) {
  return (
    <span
      className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#f5f5f5] text-[#b3b3b3]"
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

export default function EventGalleryCard({ item, onClick, className = "" }) {
  const isVideo = item?.type === "video";
  const previewSrc = item?.thumbnailUrl || item?.url || "";
  const hasPreviewSrc = Boolean(previewSrc);
  const hasPlayableUrl = Boolean(item?.url || item?.thumbnailUrl);
  const caption = String(item?.caption || "").trim();
  const [isBroken, setIsBroken] = useState(false);

  useEffect(() => {
    setIsBroken(false);
  }, [previewSrc]);

  const showPlaceholder = !hasPreviewSrc || isBroken;
  // Videos can still open when the thumbnail is broken but the file URL exists.
  const canOpen = isVideo
    ? Boolean(item?.url)
    : hasPlayableUrl && !isBroken;

  const handleClick = () => {
    if (!canOpen) return;
    onClick?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!canOpen}
      aria-disabled={!canOpen}
      className={cn(
        "flex h-full w-full flex-col gap-2.5 rounded-2xl border border-[#d9d9d9] bg-white px-5 pb-5 pt-3.5 text-left transition",
        canOpen
          ? "hover:border-[#b3b3b3]"
          : "cursor-default opacity-100",
        className,
      )}
    >
      <span className="relative block aspect-video w-full overflow-hidden rounded-2xl bg-[#f5f5f5]">
        {showPlaceholder ? (
          <MediaPlaceholder type={isVideo ? "video" : "image"} />
        ) : (
          <BlobImage
            src={previewSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            onError={() => setIsBroken(true)}
          />
        )}

        {isVideo && canOpen && !showPlaceholder ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <img src={PLAY_CIRCLE_SRC} alt="" className="size-20" />
          </span>
        ) : null}
      </span>

      {caption ? (
        <EventTruncatedText
          text={caption}
          maxChars={30}
          className="block min-h-[1.4em] max-w-full truncate text-xl font-normal leading-[1.4] text-[#1e1e1e]"
        />
      ) : (
        <span className="block min-h-[1.4em] max-w-full truncate text-xl font-normal leading-[1.4] text-[#1e1e1e]">
          {"\u00A0"}
        </span>
      )}
    </button>
  );
}
