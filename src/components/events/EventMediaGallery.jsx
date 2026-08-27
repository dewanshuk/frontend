import { Play, Video, Image as ImageIcon } from "lucide-react";
import BlobImage from "../shared/BlobImage";
import { cn } from "@/lib/utils";

function PlaceholderTile({ type = "image", className = "" }) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-[#e6f7f8] text-[#a5d5da]", className)}>
      {type === "video" ? <Video className="size-8" strokeWidth={1.5} /> : <ImageIcon className="size-8" strokeWidth={1.5} />}
    </div>
  );
}

function MediaTile({ item, onClick, showLargePlay = false, className = "" }) {
  const isVideo = item?.type === "video";
  const src = item?.thumbnailUrl || item?.url;
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn("group relative m-0 block h-full w-full overflow-hidden border-0 bg-[#e6f7f8] p-0", onClick && "cursor-pointer", className)}
    >
      {src ? (
        <BlobImage
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <PlaceholderTile type={isVideo ? "video" : "image"} className="absolute inset-0" />
      )}
      {src && <span className="pointer-events-none absolute inset-0 bg-[#08122c]/0 transition-colors duration-300 group-hover:bg-[#08122c]/25" />}
      {isVideo && src && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className={cn(
            "flex items-center justify-center rounded-full bg-white/95 shadow-[0_6px_20px_rgba(4,14,38,0.45)] ring-1 ring-white/60 transition-transform duration-300 group-hover:scale-110",
            showLargePlay ? "h-14 w-14" : "h-9 w-9",
          )}>
            <Play className={cn("fill-[#171c8f] text-[#171c8f]", showLargePlay ? "ml-1 h-6 w-6" : "ml-0.5 h-3.5 w-3.5")} />
          </span>
        </span>
      )}
    </Wrapper>
  );
}

function OverflowTile({ count, previewItem, onClick, className = "" }) {
  const src = previewItem?.thumbnailUrl || previewItem?.url;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("group relative m-0 h-full w-full overflow-hidden border-0 bg-[#0b1230] p-0", className)}
      aria-label={`View full gallery, ${count} more`}
    >
      {src && <BlobImage src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#171c8f]/80 to-[#0d4453]/85 transition-colors duration-300 group-hover:from-[#2563eb]/80 group-hover:to-[#0f766e]/85">
        <span className="text-3xl font-bold text-white drop-shadow-[0_2px_10px_rgba(4,14,38,0.6)]">+{count}</span>
      </span>
    </button>
  );
}

export default function EventMediaGallery({ media = [], remainingMediaCount = 0, onOpenMedia, onViewAllMedia, className = "" }) {
  const items = (Array.isArray(media) ? media : []).filter((item) => item?.url || item?.thumbnailUrl);
  if (items.length === 0) return null;

  const extra = Math.max(Number(remainingMediaCount) || 0, Math.max(0, items.length - 7));
  // 3 large + up to 4 small; 7th slot in small grid becomes overflow
  const largeItems = items.slice(0, 3);
  const smallItems = items.slice(3, extra > 0 ? 6 : 7);
  const showOverflow = extra > 0;
  const overflowPreview = items[6] || items[5] || null;

  return (
    <div className={cn("flex min-w-0 items-stretch gap-5 overflow-hidden", className)}>

      {largeItems.map((item, i) => (
        <div key={item?.id || `l-${i}`} className="relative h-[330px] min-w-0 flex-1 overflow-hidden rounded-2xl bg-[#e6f7f8] ring-1 ring-[#cdeceb] shadow-[0_4px_14px_rgba(15,47,87,0.1)]">
          <MediaTile item={item} onClick={() => onOpenMedia?.(i)} showLargePlay={item?.type === "video"} className="absolute inset-0 rounded-2xl" />
        </div>
      ))}


      {smallItems.length > 0 && (
        <div className="grid shrink-0 grid-cols-2 grid-rows-2 gap-3">
          {smallItems.map((item, i) => (
            <div key={item?.id || `s-${i}`} className="relative h-[159px] w-[159px] overflow-hidden rounded-2xl ring-1 ring-[#cdeceb] shadow-[0_4px_14px_rgba(15,47,87,0.1)]">
              <MediaTile item={item} onClick={() => onOpenMedia?.(3 + i)} showLargePlay={item?.type === "video"} className="absolute inset-0 rounded-2xl" />
            </div>
          ))}
          {showOverflow && (
            <div className="relative h-[159px] w-[159px] overflow-hidden rounded-2xl ring-1 ring-[#cdeceb] shadow-[0_4px_14px_rgba(15,47,87,0.1)]">
              <OverflowTile count={extra} previewItem={overflowPreview} onClick={() => onViewAllMedia?.()} className="absolute inset-0 rounded-2xl" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
