import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getFaq } from "@/api/faqApi";
import { MARUTI_BLUE, landingShellInnerClassName } from "@/components/landing/landingTheme";
import { cn } from "@/lib/utils";

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

function FaqList({
  isLoading,
  error,
  filteredGroups,
  query = "",
  showGroupCard = true,
  /** denser “app” FAQ vs roomy landing `/v2/faq` scale */
  density = "default",
}) {
  const isLanding = density === "landing";

  const statusClass = cn(
    "py-8 text-center text-muted-foreground",
    isLanding
      ? "text-base md:text-lg lg:text-xl"
      : "text-sm md:text-base",
  );
  const groupTitleClass = cn(
    "font-semibold tracking-wide text-foreground",
    isLanding
      ? "text-base md:text-lg lg:text-xl"
      : "text-sm md:text-base lg:text-lg",
  );
  const questionClass = cn(
    "text-left font-medium bg-slate-100 data-[state=open]:bg-white hover:no-underline",
    isLanding
      ? "px-4 py-3.5 text-base leading-snug md:px-5 md:py-4 md:text-lg lg:text-xl lg:leading-snug [&_svg]:h-5 [&_svg]:w-5 md:[&_svg]:h-6 md:[&_svg]:w-6"
      : "px-4 py-3 text-sm md:text-base lg:text-lg [&_svg]:h-4 [&_svg]:w-4 md:[&_svg]:h-5 md:[&_svg]:w-5",
  );
  const answerClass = cn(
    "bg-white text-foreground leading-relaxed",
    isLanding
      ? "px-4 pb-4 pt-1 text-base md:px-5 md:pb-5 md:text-lg lg:text-xl lg:leading-relaxed"
      : "px-4 pb-3 text-sm md:text-base lg:text-lg",
  );

  if (isLoading) {
    return <div className={statusClass}>Loading FAQs...</div>;
  }

  if (error) {
    return (
      <div className={statusClass}>Failed to load FAQs. Please try again.</div>
    );
  }

  if (filteredGroups.length === 0) {
    return (
      <div className={statusClass}>
        No results found. Try a different keyword.
      </div>
    );
  }

  return filteredGroups.map((group) => {
    const itemIds = group.items.map((item) => `item-${group.id}-${item.id}`);

    return (
    <section key={group.id}>
      <div
        className={cn(
          isLanding ? "space-y-3 md:space-y-4" : "space-y-3",
          showGroupCard &&
            (isLanding
              ? "rounded-lg border border-gray-300 bg-white p-4 shadow-sm md:p-5 lg:p-6"
              : "rounded-lg border border-gray-300 bg-white p-4 shadow-sm md:p-5"),
        )}
      >
        <h2 className={groupTitleClass}>{group.title}</h2>
        {/* Remount per query so search results start expanded but stay collapsible. */}
        <Accordion
          key={`${group.id}-${query}`}
          type="multiple"
          defaultValue={query ? itemIds : []}
          className={cn("w-full", isLanding ? "space-y-3 md:space-y-4" : "space-y-3")}
        >
          {group.items.map((item) => (
            <AccordionItem
              key={item.id}
              value={`item-${group.id}-${item.id}`}
              className="overflow-hidden rounded-md border border-gray-300 bg-white shadow-sm focus-within:ring-1 focus-within:ring-indigo-200"
            >
              <AccordionTrigger className={questionClass}>
                {item.question}
              </AccordionTrigger>
              <AccordionContent className={answerClass}>
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
    );
  });
}

export default function FaqContent({ variant = "default" }) {
  const [query, setQuery] = useState("");
  const [faqGroups, setFaqGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
        variant === "landing" ? "max-w-xl md:max-w-2xl" : "max-w-md md:max-w-lg",
      )}
    >
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search FAQs..."
        aria-label="Search FAQs"
        className={
          variant === "landing"
            ? "h-11 rounded-xl border-[#d9d9d9] bg-white text-base md:h-12 md:text-lg lg:h-14 lg:text-xl focus-visible:ring-[#171c8f]/20"
            : "h-9 border-gray-300 bg-white text-sm md:h-10 md:text-base focus:border-gray-300 focus:outline-none focus:ring-0"
        }
      />
      <Search
        className={cn(
          "pointer-events-none absolute text-blue-500 right-3 top-1/2 -translate-y-1/2",
          variant === "landing"
            ? "h-5 w-5 md:h-6 md:w-6"
            : "h-4 w-4 md:h-5 md:w-5",
        )}
      />
    </div>
  );

  if (variant === "landing") {
    return (
      <div className={landingShellInnerClassName("pb-16 pt-8 md:pt-10")}>
        <div className="mb-8 md:mb-10">{searchField}</div>

        <div className="mx-auto space-y-5 md:space-y-6 lg:space-y-8">
          <FaqList
            isLoading={isLoading}
            error={error}
            filteredGroups={filteredGroups}
            query={query.trim()}
            density="landing"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] w-full max-w-full min-w-0 flex-col bg-[var(--sds-bg-subtle)]">
      <div className="shrink-0 bg-[var(--sds-bg-subtle)]">
        <div className="w-full max-w-full min-w-0 px-4 py-6 md:px-6 md:py-8">
          <div className="space-y-2 md:space-y-3">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl lg:text-3xl">
              Frequently Asked Questions (FAQs)
            </h1>
            {searchField}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--sds-bg-subtle)]">
        <div className="w-full max-w-full min-w-0 px-4 pb-8 md:px-6">
          <div className="rounded-2xl bg-purple-100 p-4 md:p-6 lg:p-8">
            <div className="space-y-5 md:space-y-6">
          <FaqList
            isLoading={isLoading}
            error={error}
            filteredGroups={filteredGroups}
            query={query.trim()}
            showGroupCard={false}
            density="default"
          />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
