import { Image as ImageIcon, Video } from "lucide-react";
import BlobImage from "../shared/BlobImage";
import { cn } from "@/lib/utils";

const PLAY_CIRCLE_SRC = "/assets/icons/events/play-circle.svg";
const PRIMARY_VISIBLE = 3;
const SECONDARY_VISIBLE = 3;

function PlaceholderTile({ type = "image", className = "" }) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-2xl bg-[#f5f5f5] text-[#b3b3b3]",
        className,
      )}
    >
      {type === "video" ? (
        <Video className="size-8" strokeWidth={1.5} />
      ) : (
        <ImageIcon className="size-8" strokeWidth={1.5} />
      )}
    </div>
  );
}

function MediaTile({ item, className = "", onClick, showLargePlay = false }) {
  const isVideo = item?.type === "video";
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group relative m-0 block h-full w-full overflow-hidden rounded-2xl border-0 bg-[#f5f5f5] p-0",
        className,
      )}
    >
      <BlobImage
        src={item.thumbnailUrl || item.url}
        alt=""
        className="absolute inset-0 h-full w-full object-contain"
      />
      {isVideo ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <img
            src={PLAY_CIRCLE_SRC}
            alt=""
            className={showLargePlay ? "size-20" : "size-12"}
          />
        </span>
      ) : null}
    </Wrapper>
  );
}

function OverflowTile({ count, previewItem, onClick, className = "" }) {
  const previewUrl = previewItem?.thumbnailUrl || previewItem?.url;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative m-0 h-full w-full overflow-hidden rounded-2xl border-0 bg-zinc-700 p-0",
        className,
      )}
      aria-label={`View full gallery, ${count} more`}
    >
      {previewUrl ? (
        <BlobImage
          src={previewUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <span className="absolute inset-0 bg-[#f5f5f5]" />
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.65)] text-[40px] font-normal leading-none tracking-[-0.8px] text-white">
        +{count}
      </span>
    </button>
  );
}

export default function EventMediaGallery({
  media = [],
  remainingMediaCount = 0,
  onOpenMedia,
  onViewAllMedia,
  className = "",
}) {
  const items = (Array.isArray(media) ? media : []).filter(
    (item) => item?.url || item?.thumbnailUrl,
  );

  if (items.length === 0) return null;

  const primaryItems = items.slice(0, PRIMARY_VISIBLE);
  const remainingAfterPrimary = items.slice(PRIMARY_VISIBLE);
  const secondaryFromMedia = remainingAfterPrimary.slice(0, SECONDARY_VISIBLE);

  const leftoverInFeed = Math.max(
    0,
    remainingAfterPrimary.length - SECONDARY_VISIBLE,
  );
  const overflowCount = Math.max(
    Number(remainingMediaCount) || 0,
    leftoverInFeed,
  );
  const showSecondaryGrid =
    secondaryFromMedia.length > 0 || overflowCount > 0;

  const secondarySlots = [
    secondaryFromMedia[0] || { id: "slot-0", type: "image", placeholder: true },
    secondaryFromMedia[1] || { id: "slot-1", type: "image", placeholder: true },
    secondaryFromMedia[2] || { id: "slot-2", type: "video", placeholder: true },
  ];

  const overflowPreviewItem =
    remainingAfterPrimary[SECONDARY_VISIBLE] || secondaryFromMedia[0] || null;

  return (
    <div className={cn("mx-auto w-[1346px] max-w-full", className)}>
      <div className="flex items-end gap-5">
        <div className="flex shrink-0 gap-5">
          {primaryItems.map((item, index) => (
            <div
              key={item?.id || `primary-${index}`}
              className="relative aspect-video w-[320px] shrink-0"
            >
              <MediaTile
                item={item}
                showLargePlay
                className="absolute inset-0"
                onClick={() => onOpenMedia?.(index)}
              />
            </div>
          ))}
        </div>

        {showSecondaryGrid ? (
          <div className="relative h-[180px] w-[326px] shrink-0">
            <div className="absolute inset-0 grid grid-cols-[154px_154px] grid-rows-[83px_83px] gap-x-[18px] gap-y-[14px]">
              {secondarySlots.map((item, index) => (
                <div
                  key={item.id || `secondary-${index}`}
                  className="relative min-h-0 min-w-0"
                >
                  {item.placeholder ? (
                    <PlaceholderTile
                      type={item.type}
                      className="absolute inset-0"
                    />
                  ) : (
                    <MediaTile
                      item={item}
                      className="absolute inset-0"
                      onClick={() => onOpenMedia?.(PRIMARY_VISIBLE + index)}
                    />
                  )}
                </div>
              ))}

              <div className="relative min-h-0 min-w-0">
                {overflowCount > 0 ? (
                  <OverflowTile
                    count={overflowCount}
                    previewItem={overflowPreviewItem}
                    className="absolute inset-0"
                    onClick={() => onViewAllMedia?.()}
                  />
                ) : (
                  <PlaceholderTile type="image" className="absolute inset-0" />
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
