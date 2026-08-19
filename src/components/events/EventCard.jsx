import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import EventMediaGallery from "./EventMediaGallery";
import EventTruncatedText from "./EventTruncatedText";
import { markdownToDisplayHtml } from "@/lib/utils";

const DESCRIPTION_COLLAPSED_LINES = 3;
const TAGS_COLLAPSED_LIMIT = 6;

const getScrollParent = (node) => {
  let current = node?.parentElement || null;
  while (current) {
    const { overflowY } = window.getComputedStyle(current);
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
};

export default function EventCard({
  event,
  onOpenMedia,
  onViewAllMedia,
  onToggleLike,
  isLikeUpdating = false,
}) {
  const liked = Boolean(event?.isLiked);
  const likeCount = Number(event?.likes ?? 0);
  const remainingMediaCount = Number(event?.remainingMediaCount ?? 0);
  const tags = Array.isArray(event?.tags) ? event.tags : [];
  const canToggleTags = tags.length > TAGS_COLLAPSED_LIMIT;
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [canToggleDescription, setCanToggleDescription] = useState(false);
  const descriptionRef = useRef(null);
  const descriptionToggleRef = useRef(null);
  const tagsSectionRef = useRef(null);
  const tagsToggleRef = useRef(null);

  useEffect(() => {
    setIsDescriptionExpanded(false);
    setIsTagsExpanded(false);
  }, [event?.id, event?.description, event?.tags]);

  useEffect(() => {
    const node = descriptionRef.current;
    if (!node || !event?.description) {
      setCanToggleDescription(false);
      return undefined;
    }

    const measure = () => {
      if (isDescriptionExpanded) {
        // Keep toggle available once we know it overflows when collapsed.
        return;
      }
      setCanToggleDescription(node.scrollHeight > node.clientHeight + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [event?.description, isDescriptionExpanded]);

  const preserveScrollOnCollapse = (sectionNode, toggleNode, collapse) => {
    if (!sectionNode) {
      collapse();
      return;
    }

    const heightBefore = sectionNode.getBoundingClientRect().height;
    const scrollParent = getScrollParent(sectionNode);

    collapse();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const heightAfter = sectionNode.getBoundingClientRect().height;
        const shrink = Math.max(0, heightBefore - heightAfter);

        if (shrink > 0) {
          if (scrollParent) {
            scrollParent.scrollTop = Math.max(0, scrollParent.scrollTop - shrink);
          } else {
            window.scrollBy({ top: -shrink, left: 0, behavior: "auto" });
          }
        }

        toggleNode?.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
      });
    });
  };

  const handleToggleDescription = () => {
    if (!isDescriptionExpanded) {
      setIsDescriptionExpanded(true);
      return;
    }

    preserveScrollOnCollapse(
      descriptionRef.current,
      descriptionToggleRef.current,
      () => setIsDescriptionExpanded(false),
    );
  };

  const handleToggleTags = () => {
    if (!isTagsExpanded) {
      setIsTagsExpanded(true);
      return;
    }

    preserveScrollOnCollapse(tagsSectionRef.current, tagsToggleRef.current, () =>
      setIsTagsExpanded(false),
    );
  };

  const visibleTags =
    canToggleTags && !isTagsExpanded
      ? tags.slice(0, TAGS_COLLAPSED_LIMIT)
      : tags;

  return (
    <article className="w-full overflow-hidden rounded-2xl border border-[#d9d9d9] bg-white">
      <div className="flex flex-col gap-5 px-[54px] py-6">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex flex-1 flex-col gap-5">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <EventTruncatedText
                text={event.title}
                as="h2"
                className="min-w-0 text-xl font-medium leading-7 text-[#1e1e1e]"
              />
              {event.categoryLabel ? (
                <EventTruncatedText
                  text={event.categoryLabel}
                  className="inline-flex max-w-full rounded-md bg-[#8b5cf6]/15 px-2 py-1 text-base font-normal leading-5 text-[#8b5cf6]"
                />
              ) : null}
            </div>

            {tags.length > 0 ? (
              <div ref={tagsSectionRef} className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {visibleTags.map((tag) => (
                    <EventTruncatedText
                      key={tag}
                      text={tag}
                      className="inline-flex max-w-full items-center rounded-md bg-[#8b5cf6] px-2 py-1 text-base font-normal leading-5 text-white"
                    />
                  ))}
                </div>
                {canToggleTags ? (
                  <button
                    ref={tagsToggleRef}
                    type="button"
                    onClick={handleToggleTags}
                    className="w-fit text-base font-medium text-[#171c8f] transition hover:underline"
                  >
                    {isTagsExpanded ? "Show less" : "Show more"}
                  </button>
                ) : null}
              </div>
            ) : null}

            {event.description ? (
              <div className="min-w-0">
                <p
                  ref={descriptionRef}
                  className="text-lg font-normal leading-[1.4] text-[#1e1e1e]"
                  style={
                    isDescriptionExpanded
                      ? undefined
                      : {
                          display: "-webkit-box",
                          WebkitLineClamp: DESCRIPTION_COLLAPSED_LINES,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }
                  }
                  dangerouslySetInnerHTML={{ __html: markdownToDisplayHtml(event.description) }}
                />
                {canToggleDescription || isDescriptionExpanded ? (
                  <button
                    ref={descriptionToggleRef}
                    type="button"
                    onClick={handleToggleDescription}
                    className="mt-1 text-base font-medium text-[#171c8f] transition hover:underline"
                  >
                    {isDescriptionExpanded ? "Show less" : "Show more"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {event.date ? (
            <time className="shrink-0 pt-1 text-base font-semibold uppercase leading-none text-[#757575]/50">
              {event.date}
            </time>
          ) : null}
        </div>

        {event.media?.length > 0 ? (
          <EventMediaGallery
            media={event.media}
            remainingMediaCount={remainingMediaCount}
            onOpenMedia={(index) => onOpenMedia?.(event, index)}
            onViewAllMedia={() => onViewAllMedia?.(event)}
          />
        ) : null}

        <button
          type="button"
          onClick={() => onToggleLike?.(event)}
          disabled={isLikeUpdating}
          className="inline-flex w-fit items-center gap-2 text-lg font-normal text-[#1e1e1e] transition hover:text-[#8b5cf6]"
          aria-pressed={liked}
        >
          <Heart
            className={`size-6 ${liked ? "fill-[#8b5cf6] text-[#8b5cf6]" : "text-[#1e1e1e]"}`}
            strokeWidth={1.75}
          />
          <span>{likeCount}</span>
        </button>
      </div>
    </article>
  );
}
