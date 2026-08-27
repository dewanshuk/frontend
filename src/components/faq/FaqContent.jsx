import { useEffect, useMemo, useState } from "react";
import { ChevronDown, HelpCircle, Layers, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getFaq } from "@/api/faqApi";
import { landingShellInnerClassName } from "@/components/landing/landingTheme";
import { cn } from "@/lib/utils";
import FaqHeroArt from "./FaqHeroArt";

/** Page backdrop used by both variants (matches gallery page). */
const PAGE_BACKGROUND =
  "linear-gradient(160deg, #eff6ff 0%, #e0f2fe 25%, #cffafe 50%, #ccfbf1 75%, #ecfdf5 100%)";

/** Rotating accent palette for category cards. */
const CATEGORY_THEMES = [
  {
    badge: "linear-gradient(140deg, #3b82f6 0%, #1d4ed8 100%)",
    ring: "#c7d8ff",
    header: "linear-gradient(120deg, #f4f8ff 0%, #ffffff 60%)",
    open: "linear-gradient(135deg, #eef4ff 0%, #f7faff 45%, #ffffff 100%)",
    soft: "#eff4ff",
    icon: "#2563eb",
    toggle: "#dbe7ff",
  },
  {
    badge: "linear-gradient(140deg, #34d399 0%, #059669 100%)",
    ring: "#bdf0d6",
    header: "linear-gradient(120deg, #f2fdf7 0%, #ffffff 60%)",
    open: "linear-gradient(135deg, #e9fbf1 0%, #f5fdf9 45%, #ffffff 100%)",
    soft: "#effaf3",
    icon: "#059669",
    toggle: "#d3f5e2",
  },
  {
    badge: "linear-gradient(140deg, #a855f7 0%, #6d28d9 100%)",
    ring: "#ddd0fb",
    header: "linear-gradient(120deg, #f8f5ff 0%, #ffffff 60%)",
    open: "linear-gradient(135deg, #f3edff 0%, #faf7ff 45%, #ffffff 100%)",
    soft: "#f5f1ff",
    icon: "#7c3aed",
    toggle: "#e6dcfd",
  },
  {
    badge: "linear-gradient(140deg, #fb7185 0%, #db2777 100%)",
    ring: "#fbd0e0",
    header: "linear-gradient(120deg, #fff5f9 0%, #ffffff 60%)",
    open: "linear-gradient(135deg, #ffedf4 0%, #fff7fa 45%, #ffffff 100%)",
    soft: "#fef1f6",
    icon: "#db2777",
    toggle: "#fbd9e7",
  },
  {
    badge: "linear-gradient(140deg, #fbbf24 0%, #d97706 100%)",
    ring: "#fbe2b0",
    header: "linear-gradient(120deg, #fffaf0 0%, #ffffff 60%)",
    open: "linear-gradient(135deg, #fff6e6 0%, #fffbf2 45%, #ffffff 100%)",
    soft: "#fff7ea",
    icon: "#d97706",
    toggle: "#fce9c4",
  },
];

/**
 * Content-agnostic icons. FAQ categories and questions are fully driven by
 * admin-managed content, so topic-specific icons would inevitably mismatch.
 * A single generic icon per level stays correct for any content.
 */
const CategoryIcon = Layers;
const QuestionIcon = HelpCircle;

const themeForIndex = (idx) => CATEGORY_THEMES[idx % CATEGORY_THEMES.length];

function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-3 rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gray-200" />
        <div className="h-4 w-1/3 rounded bg-gray-200" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-11 rounded-xl bg-gray-100" />
      ))}
    </div>
  );
}

function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-200 px-0.5 text-yellow-900">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function transformFaqApiResponse(apiResponse) {
  const raw = apiResponse?.data ?? apiResponse ?? {};

  return Object.entries(raw).map(([categoryTitle, qaMap], groupIdx) => ({
    id: slugify(categoryTitle) || `group-${groupIdx}`,
    title: categoryTitle,
    items: Object.entries(qaMap ?? {}).map(([question, answer], itemIdx) => ({
      id: `item-${groupIdx}-${itemIdx}`,
      question: String(question ?? ""),
      answer: String(answer ?? ""),
    })),
  }));
}

function FaqAccordionItem({
  item,
  groupId,
  theme,
  query,
  questionClass,
  answerClass,
  iconSizeClass,
}) {
  return (
    <AccordionItem
      value={`item-${groupId}-${item.id}`}
      className="overflow-hidden rounded-xl border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-all duration-200 hover:shadow-[0_6px_18px_rgba(16,24,40,0.08)] data-[state=open]:bg-[image:var(--faq-open-bg)] data-[state=open]:shadow-[0_8px_24px_rgba(16,24,40,0.1)]"
      style={{ borderColor: theme.ring, "--faq-open-bg": theme.open }}
    >
      <AccordionTrigger className={questionClass} aria-label={item.question}>
        <span className="flex min-w-0 items-center gap-3 text-left">
          <span
            aria-hidden="true"
            className={cn(
              "grid shrink-0 place-items-center rounded-lg",
              iconSizeClass,
            )}
            style={{ backgroundColor: theme.soft, color: theme.icon }}
          >
            <QuestionIcon className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="min-w-0">{highlight(item.question, query)}</span>
        </span>
      </AccordionTrigger>
      <AccordionContent className={answerClass}>
        <div className="pl-11">{item.answer}</div>
      </AccordionContent>
    </AccordionItem>
  );
}

function FaqCategoryCard({ group, groupIndex, query, isLanding }) {
  const [open, setOpen] = useState(true);
  const theme = themeForIndex(groupIndex);
  const itemIds = group.items.map((item) => `item-${group.id}-${item.id}`);
  const contentId = `faq-category-${group.id}`;

  const questionClass = cn(
    "w-full font-medium text-[#1f2430] transition-colors duration-200 hover:no-underline hover:bg-black/[0.015] data-[state=open]:text-[#111827]",
    isLanding
      ? "gap-3 px-4 py-4 text-base md:text-lg [&>svg]:h-5 [&>svg]:w-5"
      : "gap-3 px-3.5 py-3 text-sm md:text-[15px] [&>svg]:h-4 [&>svg]:w-4 md:[&>svg]:h-5 md:[&>svg]:w-5",
  );
  const answerClass = cn(
    "text-[#4b5563] leading-relaxed",
    isLanding
      ? "px-4 pb-4 pt-0 text-base md:text-lg"
      : "px-3.5 pb-3.5 pt-0 text-sm md:text-[15px]",
  );
  const iconSizeClass = isLanding ? "h-9 w-9" : "h-8 w-8";

  return (
    <section
      style={{ animationDelay: `${groupIndex * 80}ms` }}
      className="opacity-0 animate-[fadeSlideUp_0.4s_ease_forwards]"
    >
      <div
        className="overflow-hidden rounded-[18px] bg-white shadow-[0_2px_10px_rgba(16,24,40,0.06)] transition-shadow duration-200 hover:shadow-[0_10px_28px_rgba(16,24,40,0.1)]"
        style={{ border: `1.5px solid ${theme.ring}` }}
      >
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-200 md:px-5"
          style={{ backgroundImage: theme.header }}
        >
          <span
            aria-hidden="true"
            className={cn(
              "grid shrink-0 place-items-center rounded-full text-white shadow-sm",
              isLanding ? "h-11 w-11" : "h-9 w-9",
            )}
            style={{ backgroundImage: theme.badge }}
          >
            <CategoryIcon className={isLanding ? "h-5 w-5" : "h-[18px] w-[18px]"} strokeWidth={2.2} />
          </span>

          <h2
            className={cn(
              "min-w-0 flex-1 font-semibold tracking-tight text-[#1c2230]",
              isLanding ? "text-lg md:text-xl" : "text-[15px] md:text-base",
            )}
          >
            {group.title}
          </h2>

          <span
            aria-hidden="true"
            className={cn(
              "grid shrink-0 place-items-center rounded-full transition-transform duration-300",
              isLanding ? "h-9 w-9" : "h-8 w-8",
              open ? "rotate-180" : "rotate-0",
            )}
            style={{ backgroundColor: theme.toggle, color: theme.icon }}
          >
            <ChevronDown className="h-4 w-4" strokeWidth={2.4} />
          </span>
        </button>

        {open ? (
          <div
            id={contentId}
            className={cn("px-3 pb-4 pt-1 md:px-4", isLanding && "md:px-5 md:pb-5")}
          >
            <Accordion
              key={`${group.id}-${query}`}
              type="multiple"
              defaultValue={query ? itemIds : []}
              className={cn("w-full", isLanding ? "space-y-3" : "space-y-2.5")}
            >
              {group.items.map((item) => (
                <FaqAccordionItem
                  key={item.id}
                  item={item}
                  groupId={group.id}
                  theme={theme}
                  query={query}
                  questionClass={questionClass}
                  answerClass={answerClass}
                  iconSizeClass={iconSizeClass}
                />
              ))}
            </Accordion>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FaqList({
  isLoading,
  error,
  filteredGroups,
  query = "",
  /** denser “app” FAQ vs roomy landing `/v2/faq` scale */
  density = "default",
}) {
  const isLanding = density === "landing";

  const statusClass = cn(
    "rounded-2xl border border-white bg-white/70 py-10 text-center text-muted-foreground shadow-sm backdrop-blur",
    isLanding ? "text-base md:text-lg" : "text-sm md:text-base",
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <span className="sr-only">Loading FAQs...</span>
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className={statusClass}>Failed to load FAQs. Please try again.</div>;
  }

  if (filteredGroups.length === 0) {
    return <div className={statusClass}>No results found. Try a different keyword.</div>;
  }

  return filteredGroups.map((group, groupIdx) => (
    <FaqCategoryCard
      key={group.id}
      group={group}
      groupIndex={groupIdx}
      query={query}
      isLanding={isLanding}
    />
  ));
}

export default function FaqContent({ variant = "default" }) {
  const [query, setQuery] = useState("");
  const [faqGroups, setFaqGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const isLanding = variant === "landing";

  useEffect(() => {
    let isMounted = true;

    const loadFaq = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await getFaq();
        if (!isMounted) return;
        setFaqGroups(transformFaqApiResponse(res));
      } catch (err) {
        if (!isMounted) return;
        setError(err);
        setFaqGroups([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadFaq();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqGroups;

    return faqGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.question.toLowerCase().includes(q) ||
            item.answer.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [query, faqGroups]);

  const searchField = (
    <div
      className={cn(
        "relative w-full",
        isLanding ? "max-w-xl md:max-w-2xl" : "max-w-md md:max-w-lg",
      )}
    >
      <Search
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7fa8]",
          isLanding ? "h-5 w-5" : "h-[18px] w-[18px]",
        )}
      />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search FAQs..."
        aria-label="Search FAQs"
        className={cn(
          "w-full rounded-full border-transparent bg-white pl-12 text-[#1f2430] shadow-[0_2px_12px_rgba(16,24,40,0.08)] ring-1 ring-[#dfe6f5] transition-shadow duration-200 placeholder:text-[#93a1bd] focus-visible:ring-2 focus-visible:ring-[#2563eb]/40",
          isLanding ? "h-14 pr-16 text-base md:text-lg" : "h-12 pr-14 text-sm md:text-base",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute right-1.5 top-1/2 grid -translate-y-1/2 place-items-center rounded-full text-white shadow-sm",
          isLanding ? "h-11 w-11" : "h-9 w-9",
        )}
        style={{ backgroundImage: "linear-gradient(140deg, #6366f1 0%, #7c3aed 100%)" }}
      >
        <Search className={isLanding ? "h-5 w-5" : "h-[18px] w-[18px]"} strokeWidth={2.2} />
      </span>
    </div>
  );

  const hero = (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-2 z-0 hidden select-none md:block lg:-right-4"
      >
        <FaqHeroArt className="h-[200px] w-auto opacity-90" />
      </div>

      <div className="relative z-[1] max-w-2xl">
        <h1
          className={cn(
            "font-bold tracking-tight text-[#1a1f36]",
            isLanding ? "text-3xl md:text-4xl lg:text-[42px]" : "text-2xl md:text-3xl lg:text-[34px]",
          )}
        >
          Frequently Asked{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(95deg, #4f46e5 0%, #7c3aed 100%)" }}
          >
            Questions
          </span>
        </h1>

        <div aria-hidden="true" className="mt-3 flex items-center gap-1.5">
          <span
            className="h-1 w-16 rounded-full"
            style={{ backgroundImage: "linear-gradient(90deg, #4f46e5 0%, #a855f7 100%)" }}
          />
          <span className="h-1.5 w-1.5 rounded-full bg-[#a855f7]" />
        </div>

        <div className={isLanding ? "mt-7" : "mt-5"}>{searchField}</div>
      </div>
    </div>
  );

  if (isLanding) {
    return (
      <div style={{ background: PAGE_BACKGROUND }}>
        <div className={landingShellInnerClassName("pb-16 pt-8 md:pt-10")}>
          {hero}
          <div className="mt-9 space-y-5 md:mt-10 md:space-y-6">
            <FaqList
              isLoading={isLoading}
              error={error}
              filteredGroups={filteredGroups}
              query={query.trim()}
              density="landing"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-[calc(100dvh-4rem)] w-full min-w-0 max-w-full flex-col"
      style={{ background: PAGE_BACKGROUND }}
    >
      <div className="shrink-0">
        <div className="w-full min-w-0 max-w-full px-4 pb-2 pt-6 md:px-6 md:pt-8">{hero}</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="w-full min-w-0 max-w-full px-4 pb-8 pt-4 md:px-6">
          <div className="space-y-5 md:space-y-6">
            <FaqList
              isLoading={isLoading}
              error={error}
              filteredGroups={filteredGroups}
              query={query.trim()}
              density="default"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
