import { useEffect, useRef, useState } from "react";
import {
  Heart,
  GalleryHorizontal,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Smile,
} from "lucide-react";
import EventMediaGallery from "./EventMediaGallery";
import EventTruncatedText from "./EventTruncatedText";
import { AVATAR_GRADIENTS, TAG_CHIPS } from "./galleryTheme";
import { markdownToDisplayHtml } from "@/lib/utils";

const DESCRIPTION_COLLAPSED_LINES = 3;
const TAGS_COLLAPSED_LIMIT = 6;

/** Chip colour comes from the shared brand ramp; the icon varies per slot. */
const TAG_ICONS = [CalendarDays, Smile, Gamepad2, CalendarDays, Gamepad2, CalendarDays];

const getScrollParent = (node) => {
  let current = node?.parentElement || null;
  while (current) {
    const { overflowY } = window.getComputedStyle(current);
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      current.scrollHeight > current.clientHeight
    ) return current;
    current = current.parentElement;
  }
  return null;
};

function EventAvatar({ title }) {
  const letter = String(title || "E")[0].toUpperCase();
  const gradient = AVATAR_GRADIENTS[letter.charCodeAt(0) % AVATAR_GRADIENTS.length];
  return (
    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-xl font-bold text-white shadow-md`}>
      {letter}
    </span>
  );
}

export default function EventCard({
  event,
  onOpenMedia,
  onViewAllMedia,
  onToggleLike,
  isLikeUpdating = false,
  animationDelay = 0,
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
    if (!node || !event?.description) { setCanToggleDescription(false); return undefined; }
    const measure = () => { if (isDescriptionExpanded) return; setCanToggleDescription(node.scrollHeight > node.clientHeight + 1); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [event?.description, isDescriptionExpanded]);

  const preserveScrollOnCollapse = (sectionNode, toggleNode, collapse) => {
    if (!sectionNode) { collapse(); return; }
    const heightBefore = sectionNode.getBoundingClientRect().height;
    const scrollParent = getScrollParent(sectionNode);
    collapse();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const heightAfter = sectionNode.getBoundingClientRect().height;
        const shrink = Math.max(0, heightBefore - heightAfter);
        if (shrink > 0) {
          if (scrollParent) scrollParent.scrollTop = Math.max(0, scrollParent.scrollTop - shrink);
          else window.scrollBy({ top: -shrink, left: 0, behavior: "auto" });
        }
        toggleNode?.scrollIntoView({ block: "nearest", inline: "nearest" });
      });
    });
  };

  const handleToggleDescription = () => {
    if (!isDescriptionExpanded) { setIsDescriptionExpanded(true); return; }
    preserveScrollOnCollapse(descriptionRef.current, descriptionToggleRef.current, () => setIsDescriptionExpanded(false));
  };

  const handleToggleTags = () => {
    if (!isTagsExpanded) { setIsTagsExpanded(true); return; }
    preserveScrollOnCollapse(tagsSectionRef.current, tagsToggleRef.current, () => setIsTagsExpanded(false));
  };

  const visibleTags = canToggleTags && !isTagsExpanded ? tags.slice(0, TAGS_COLLAPSED_LIMIT) : tags;

  return (
    <article
      style={{ animationDelay: `${animationDelay}ms` }}
      className="group/card relative w-full overflow-hidden rounded-[28px] border border-[#cfe3f0] bg-white shadow-[0_8px_26px_rgba(15,47,87,0.1)] transition-all duration-300 hover:-translate-y-1 hover:border-[#a7ece5] hover:shadow-[0_16px_40px_rgba(15,47,87,0.16)] opacity-0 animate-[fadeSlideUp_0.5s_ease_forwards]"
    >

      <div
        className="h-[5px] w-full animate-gallery-sheen bg-[linear-gradient(100deg,#171c8f,#2563eb,#22d3ee,#2dd4bf,#22d3ee,#2563eb,#171c8f)] bg-[length:200%_100%] motion-reduce:animate-none"
        aria-hidden
      />

     
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-8 h-56 w-56 rounded-full bg-[#22d3ee]/[0.07] blur-3xl"
      />

      {/* Header */}
      <div className="relative px-10 pt-8">
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <EventTruncatedText
            text={event.title}
            as="h2"
            className="min-w-0 text-[44px] font-bold leading-tight tracking-[-0.5px] text-[#0f2f57]"
          />
          {event.categoryLabel ? (
            <EventTruncatedText
              text={event.categoryLabel}
              className="inline-flex max-w-full items-center rounded-full bg-[#e8eaff] px-4 py-1.5 text-[18px] font-semibold text-[#252a9c] ring-1 ring-[#c7cbf4]"
            />
          ) : null}
        </div>
        {event.date ? (
          <div className="mt-2 flex items-center gap-2">
            <CalendarDays className="size-4 text-[#5b9aa3]" />
            <time className="text-[17px] font-medium text-[#5b9aa3]">{event.date}</time>
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="relative flex flex-col gap-4 px-10 pb-6 pt-5">

        {/* Tags */}
        {tags.length > 0 ? (
          <div ref={tagsSectionRef} className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2.5">
              {visibleTags.map((tag, tagIndex) => {
                const chip = TAG_CHIPS[tagIndex % TAG_CHIPS.length];
                const Icon = TAG_ICONS[tagIndex % TAG_ICONS.length];
                return (
                  <span
                    key={tag}
                    className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-4 py-1.5 ring-1 ${chip}`}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={2} />
                    <EventTruncatedText
                      text={tag}
                      className="min-w-0 text-[17px] font-semibold"
                    />
                  </span>
                );
              })}
            </div>
            {canToggleTags ? (
              <button ref={tagsToggleRef} type="button" onClick={handleToggleTags}
                className="inline-flex w-fit items-center gap-1 text-[17px] font-medium text-[#0d9488] transition hover:text-[#0f766e] hover:underline">
                {isTagsExpanded ? "Show less" : "Show more"}
                {isTagsExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Description */}
        {event.description ? (
          <div className="min-w-0">
            <p
              ref={descriptionRef}
              className="text-[26px] font-medium leading-[1.6] text-[#20505c] text-justify"
              style={isDescriptionExpanded ? undefined : {
                display: "-webkit-box",
                WebkitLineClamp: DESCRIPTION_COLLAPSED_LINES,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
              dangerouslySetInnerHTML={{ __html: markdownToDisplayHtml(event.description) }}
            />
            {canToggleDescription || isDescriptionExpanded ? (
              <button ref={descriptionToggleRef} type="button" onClick={handleToggleDescription}
                className="mt-2 inline-flex items-center gap-1 text-[17px] font-medium text-[#0d9488] transition hover:text-[#0f766e] hover:underline">
                {isDescriptionExpanded ? "Show less" : "Read more"}
                {isDescriptionExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Media */}
        {event.media?.length > 0 ? (
          <EventMediaGallery
            media={event.media}
            remainingMediaCount={remainingMediaCount}
            onOpenMedia={(index) => onOpenMedia?.(event, index)}
            onViewAllMedia={() => onViewAllMedia?.(event)}
          />
        ) : null}
      </div>

      {/* Footer */}
      <div className="relative flex items-center justify-between border-t border-[#e6f7f5] bg-gradient-to-r from-[#f7fbfd] to-[#f2fbfa] px-6 py-3">
        <button
          type="button"
          onClick={() => onToggleLike?.(event)}
          disabled={isLikeUpdating}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 active:scale-90 ${liked ? "bg-[#ccfbf1] text-[#0f766e]" : "text-[#4a7f87] hover:bg-[#f0fdfa] hover:text-[#0d9488]"}`}
          aria-pressed={liked}
        >
          <Heart className={`size-5 transition-all duration-200 ${liked ? "fill-[#14b8a6] text-[#14b8a6] scale-110" : ""}`} strokeWidth={1.75} />
          <span>{likeCount}</span>
        </button>

        {event.media?.length > 0 ? (
          <button
            type="button"
            onClick={() => onViewAllMedia?.(event)}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#2563eb] to-[#14b8a6] px-4 py-1.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(20,184,166,0.45)] hover:brightness-110 active:scale-95"
          >
            <GalleryHorizontal className="size-4" />
            View All
          </button>
        ) : null}
      </div>
    </article>
  );
}
