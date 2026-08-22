import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  // BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Search,
  // Sparkles,
  Zap,
} from "lucide-react";
import LandingPageLayout from "@/components/landing/LandingPageLayout";
import LandingSectionPanel from "@/components/landing/LandingSectionPanel";
// import LatestNewsCarousel from "@/components/landing/LatestNewsCarousel";
import QuickActionIllustration from "@/components/landing/QuickActionIllustration";
import LandingScaledContent from "@/components/landing/LandingScaledContent";
// import EventMediaModal from "@/components/events/EventMediaModal";
import { ELECTRIC_BLUE, MARUTI_BLUE, homePageShellClassName } from "@/components/landing/landingTheme";
import {
  // KNOWLEDGE_HUB_ITEMS,
  // KNOWLEDGE_HUB_ITEM_TYPES,
  // KNOWLEDGE_HUB_ORDER,
  // KNOWLEDGE_HUB_PRESENTATION,
  QUICK_ACTIONS,
  // getNewlyAddedItemPath,
  // mapWhatsNewToNewlyAdded,
} from "@/data/headHomeData";
import {
  extractRecentActivityItems,
  // getDocumentGallery,
  getDueForMeData,
  getRecentActivity,
  getUserDeclarationStatus,
  // getWhatsNew,
} from "@/api/homeApi";
// import { mapDocumentGalleryToNewsSlides } from "@/utils/latestNewsUtils";
import { buildComplianceActivityPath } from "@/utils/recentActivityUtils";
import { getDueItemTarget } from "@/utils/dueForMeUtils";
import { resolveAnnualDeclarationFromStatus } from "@/utils/annualDeclarationUtils";
import CenterToast from "@/components/shared/CenterToast";
import { useAuthNavigation } from "@/context/AuthNavigationContext";
import { useDisplayName } from "@/lib/UserContext";
import {
  toLandingPath,
  // LANDING_V2_BASE,
} from "@/lib/appNavigation";
import { cn } from "@/lib/utils";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

function DueTaskList({ items, tone, onSelect }) {
  if (!items?.length) {
    return (
      <p className="rounded-2xl border border-dashed border-[#d9d9d9] bg-white/70 px-4 py-6 text-center text-sm text-black/50">
        No {tone === "overdue" ? "overdue" : "upcoming"} items
      </p>
    );
  }

  return (
    <div className="space-y-3 pr-2">
      {items.map((item, index) => {
        const title = item?.name || item?.title || "Untitled";
        const status = item?.status || item?.dueText || "Pending";
        const isActionable = Boolean(getDueItemTarget(item));
        const Wrapper = isActionable ? "button" : "div";

        return (
          <Wrapper
            key={item?.id || `${title}-${index}`}
            type={isActionable ? "button" : undefined}
            onClick={isActionable ? () => onSelect?.(item) : undefined}
            className={cn(
              "block w-full rounded-2xl border border-[#d9d9d9]/50 bg-white px-4 py-3 text-left shadow-sm",
              isActionable &&
                "transition hover:border-[#2563eb]/40 hover:shadow-md",
            )}
          >
            <p className="text-base font-semibold text-[#171c4d]">{title}</p>
            <p
              className={cn(
                "mt-1 text-sm font-medium",
                tone === "overdue" ? "text-red-600" : "text-amber-600",
              )}
            >
              {status}
            </p>
          </Wrapper>
        );
      })}
    </div>
  );
}

export default function EmployeeHome({ user, withChrome = true }) {
  const { navigateToApp, user: authUser } = useAuthNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [overdueOpen, setOverdueOpen] = useState(true);
  const [dueSoonOpen, setDueSoonOpen] = useState(true);
  const [annualActionLoading, setAnnualActionLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, variant: "success", message: "" });
  // ---- HIDDEN (homepage duplicate): Latest News / What's New state ----
  // const [newlyAdded, setNewlyAdded] = useState([]);
  // const [latestNewsSlides, setLatestNewsSlides] = useState([]);
  // const [newsViewerIndex, setNewsViewerIndex] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [overdueItems, setOverdueItems] = useState([]);
  const [dueItems, setDueItems] = useState([]);
  const [overdueTotalCount, setOverdueTotalCount] = useState(0);
  const [dueTotalCount, setDueTotalCount] = useState(0);

  const greeting = getGreeting();
  const displayName = useDisplayName(user || authUser);
  const inProgressCount = recentActivities.filter((activity) =>
    String(activity?.status || "").toLowerCase().includes("progress"),
  ).length;
  // const newsSlides = latestNewsSlides;
  // const newsViewerSlide =
  //   newsViewerIndex !== null ? newsSlides[newsViewerIndex] : null;
  // const newsViewerMedia = newsSlides.map((slide) => ({
  //   id: slide.id,
  //   type: "image",
  //   url: slide.image,
  //   thumbnailUrl: slide.image,
  // }));

  const navigateToLanding = (path) => {
    navigateToApp(toLandingPath(path) || path);
  };

  const openAnnualDeclaration = async () => {
    if (annualActionLoading) return;
    setAnnualActionLoading(true);
    try {
      const status = await getUserDeclarationStatus();
      const result = resolveAnnualDeclarationFromStatus(status);
      if (!result.ok) {
        setToast({
          open: true,
          variant: "warning",
          message: result.message,
        });
        return;
      }
      navigateToLanding(result.path);
    } catch (error) {
      setToast({
        open: true,
        variant: "error",
        message:
          error?.message || "Unable to load annual declaration status. Please try again.",
      });
    } finally {
      setAnnualActionLoading(false);
    }
  };

  const openDueItem = (item) => {
    const target = getDueItemTarget(item);
    if (!target) return;
    if (target.kind === "external") {
      window.open(target.href, "_blank", "noopener,noreferrer");
      return;
    }
    navigateToLanding(target.path);
  };

  const goToKnowledgeHubSearch = (term = searchQuery) => {
    const params = new URLSearchParams({ view: "detailed" });
    const q = String(term ?? "").trim();
    if (q) params.set("search", q);
    navigateToLanding(`/knowledgeHub?${params.toString()}`);
  };

  // ---- HIDDEN (homepage duplicate): Knowledge Hub tile click + news viewer ----
  // const openKnowledgeHub = (typeLabel) => {
  //   const type = KNOWLEDGE_HUB_ITEM_TYPES[typeLabel];
  //   const hubPath = type
  //     ? `${LANDING_V2_BASE}/knowledge-hub?type=${encodeURIComponent(type)}`
  //     : toLandingPath("/knowledgeHub");
  //   navigateToApp(hubPath);
  // };
  //
  // const openLatestNewsItem = (slide) => {
  //   const index = newsSlides.findIndex(
  //     (item) => item === slide || (item?.id && item.id === slide?.id),
  //   );
  //   setNewsViewerIndex(index >= 0 ? index : 0);
  // };

  useEffect(() => {
    let cancelled = false;

    const loadHomeData = async () => {
      try {
        // ---- HIDDEN (homepage duplicate): also load whats-new + gallery ----
        // const [whatsNewResponse, galleryResponse, recentActivity, dueForMeData] =
        //   await Promise.all([
        //     getWhatsNew({ page: 1, page_size: 6 }),
        //     getDocumentGallery({
        //       document_type: "Latest News and Announcements",
        //       page: 1,
        //       page_size: 10,
        //     }),
        //     getRecentActivity(),
        //     getDueForMeData(),
        //   ]);
        // Keep both panels independent: a failing "Due for me" service must not
        // discard recent activities, and vice versa.
        const [recentActivity, dueForMeData] = await Promise.all([
          getRecentActivity().catch(() => []),
          getDueForMeData().catch(() => ({
            overdueItems: [],
            dueItems: [],
            overdueCount: 0,
            dueCount: 0,
          })),
        ]);

        if (cancelled) return;

        // const items = Array.isArray(whatsNewResponse?.data) ? whatsNewResponse.data : [];
        // setNewlyAdded(mapWhatsNewToNewlyAdded(items));
        // const galleryItems = Array.isArray(galleryResponse?.data) ? galleryResponse.data : [];
        // setLatestNewsSlides(mapDocumentGalleryToNewsSlides(galleryItems));

        setRecentActivities(extractRecentActivityItems(recentActivity).slice(0, 3));
        setOverdueItems(dueForMeData?.overdueItems ?? []);
        setDueItems(dueForMeData?.dueItems ?? []);
        setOverdueTotalCount(
          dueForMeData?.overdueCount ?? dueForMeData?.overdueItems?.length ?? 0,
        );
        setDueTotalCount(dueForMeData?.dueCount ?? dueForMeData?.dueItems?.length ?? 0);
      } catch {
        if (cancelled) return;
        // setNewlyAdded([]);
        // setLatestNewsSlides([]);
        setRecentActivities([]);
        setOverdueItems([]);
        setDueItems([]);
        setOverdueTotalCount(0);
        setDueTotalCount(0);
      }
    };

    loadHomeData();
    return () => {
      cancelled = true;
    };
  }, []);

  const renderQuickAction = (action) => {
    const className = cn(
      "relative flex h-[118px] items-center overflow-hidden rounded-3xl pl-8 pr-0 text-left transition hover:opacity-95",
      action.span || "",
    );
    const content = (
      <>
        <span className="relative z-10 min-w-0 flex-1 text-xl font-bold leading-[1.5] text-[#171c8f]">
          {action.title}
        </span>
        <QuickActionIllustration type={action.illustration} image={action.image} />
      </>
    );
    const style = { backgroundImage: action.background };
    const key =
      typeof action.title === "string" ? action.title : action.illustration;

    if (action.href) {
      return (
        <a
          key={key}
          href={action.href}
          target="_blank"
          rel="noreferrer"
          className={className}
          style={style}
        >
          {content}
        </a>
      );
    }

    const handleClick = () => {
      if (action.action === "annual") {
        openAnnualDeclaration();
        return;
      }
      if (action.to) navigateToApp(toLandingPath(action.to) || action.to);
    };

    return (
      <button
        key={key}
        type="button"
        className={className}
        style={style}
        disabled={action.action === "annual" && annualActionLoading}
        onClick={handleClick}
      >
        {content}
      </button>
    );
  };

  const content = (
    <LandingScaledContent fullBleed>
      <div className="flex w-full min-w-0 max-w-none flex-col">
        {/* Top: Greetings + Due for me */}
        <section className="relative w-full min-w-0 overflow-hidden bg-[#2563eb]">
          <img
            src="/assets/landing/hero-bg.png"
            alt=""
            className="absolute inset-0 size-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-[#171c8f]/55" />

          <div
            className={homePageShellClassName(
              "relative grid w-full grid-cols-[1.1fr_0.9fr] gap-8 py-10 lg:py-12",
            )}
          >
            <div className="min-w-0 text-white">
              <h1 className="max-w-full break-words text-[28px] font-bold leading-snug tracking-tight sm:text-[32px] lg:text-[36px]">
                {greeting}
                {displayName ? `, ${displayName} san` : ""}!
                <span className="block">Welcome to MSIL Compliance Connect</span>
              </h1>

              <div className="relative mt-6 max-w-2xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-white/70" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      goToKnowledgeHubSearch();
                    }
                  }}
                  placeholder="Search Knowledge Hub..."
                  className="h-14 w-full rounded-full border border-white/20 bg-white/10 pl-12 pr-4 text-base text-white placeholder:text-white/60 backdrop-blur-sm focus:border-white/40 focus:outline-none"
                  aria-label="Search Knowledge Hub"
                />
              </div>
            </div>

            <LandingSectionPanel className="min-w-0 p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ClipboardList className="size-6" style={{ color: MARUTI_BLUE }} />
                  <h2
                    className="text-[32px] font-extrabold leading-none lg:text-[36px]"
                    style={{ color: MARUTI_BLUE }}
                  >
                    Due for me
                  </h2>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-5">
                <div className="min-w-0 border-r border-[#d9d9d9]/60 pr-5">
                  <button
                    type="button"
                    onClick={() => setOverdueOpen((current) => !current)}
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-red-600">
                      <AlertCircle className="size-4" />
                      Overdue ({overdueTotalCount})
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 text-gray-500 transition",
                        overdueOpen ? "rotate-180" : "",
                      )}
                    />
                  </button>
                  {overdueOpen ? (
                    <div className="mt-3 max-h-[180px] overflow-y-auto">
                      <DueTaskList
                        items={overdueItems}
                        tone="overdue"
                        onSelect={openDueItem}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0 pl-1">
                  <button
                    type="button"
                    onClick={() => setDueSoonOpen((current) => !current)}
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-600">
                      <Clock className="size-4" />
                      Due Soon ({dueTotalCount})
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 text-gray-500 transition",
                        dueSoonOpen ? "rotate-180" : "",
                      )}
                    />
                  </button>
                  {dueSoonOpen ? (
                    <div className="mt-3 max-h-[180px] overflow-y-auto">
                      <DueTaskList
                        items={dueItems}
                        tone="soon"
                        onSelect={openDueItem}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </LandingSectionPanel>
          </div>
        </section>

        {/* Bottom: Quick Actions + Recent Activities */}
        <div className={homePageShellClassName("w-full py-10 lg:py-12")}>
          <section className="grid min-w-0 grid-cols-2 items-stretch gap-8">
            <LandingSectionPanel className="flex h-full min-h-0 flex-col p-6 lg:p-8">
              <div className="flex min-h-10 shrink-0 items-center gap-3">
                <Zap className="size-7" style={{ color: MARUTI_BLUE }} />
                <h2
                  className="text-[32px] font-extrabold leading-none lg:text-[36px]"
                  style={{ color: MARUTI_BLUE }}
                >
                  Quick Actions
                </h2>
              </div>
              <div className="mt-6 grid flex-1 grid-cols-2 content-start gap-4 lg:gap-5">
                {QUICK_ACTIONS.map((action) => renderQuickAction(action))}
              </div>
            </LandingSectionPanel>

            <LandingSectionPanel className="flex h-full min-h-0 flex-col p-6 lg:p-8">
              <div className="flex min-h-10 shrink-0 items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <Activity className="size-7 shrink-0" style={{ color: MARUTI_BLUE }} />
                  <h2
                    className="text-[32px] font-extrabold leading-none lg:text-[36px]"
                    style={{ color: MARUTI_BLUE }}
                  >
                    My Recent Activities
                  </h2>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                    {inProgressCount} in Progress
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigateToLanding("/compliance")}
                  className="shrink-0 text-base font-semibold transition hover:underline"
                  style={{ color: ELECTRIC_BLUE }}
                >
                  View All
                </button>
              </div>

              <div className="mt-6 grid min-h-0 flex-1 grid-rows-3 gap-3 lg:gap-4">
                {recentActivities.length === 0 ? (
                  <p className="row-span-3 flex items-center justify-center rounded-3xl border border-dashed border-[#d9d9d9] bg-white/70 px-5 py-8 text-center text-sm text-black/50">
                    No recent activities
                  </p>
                ) : (
                  recentActivities.map((activity, index) => {
                    const title = activity?.name || activity?.title || "Untitled";
                    const status = activity?.status || "In Progress";
                    const submittedOn = activity?.created_on
                      ? new Date(activity.created_on).toLocaleDateString()
                      : activity?.submittedOn || "-";
                    const pendingAt = activity?.pending_at || activity?.pendingAt || "-";

                    return (
                      <button
                        key={activity?.id || `${title}-${index}`}
                        type="button"
                        onClick={() =>
                          navigateToLanding(buildComplianceActivityPath(activity))
                        }
                        className="flex min-h-0 w-full items-center justify-between gap-4 rounded-3xl border border-[#d9d9d9]/50 bg-white px-5 py-4 text-left shadow-sm transition hover:border-[#2563eb]/30 hover:shadow-md"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-lg font-semibold text-[#171c4d]">{title}</p>
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                              {status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-black/60">
                            Submitted on: {submittedOn}
                          </p>
                          <p className="text-sm text-black/60">Pending at: {pendingAt}</p>
                        </div>
                        <ChevronRight className="size-5 shrink-0 text-[#171c8f]" />
                      </button>
                    );
                  })
                )}
              </div>
            </LandingSectionPanel>
          </section>
        </div>

        {/*
          ---- HIDDEN (repeated on marketing Homepage) ----
          Uncomment imports/state/API above and set SHOW_HOME_DUPLICATE_SECTIONS = true to restore.

        {false && (
          <>
            <div className={homePageShellClassName()}>
              <div
                className="h-px w-full bg-gradient-to-r from-[#171c8f] via-[#8b5cf6] to-[#00b6fd] opacity-15"
                aria-hidden="true"
              />
            </div>

            <div className="w-full bg-white">
              <div
                className={homePageShellClassName(
                  "grid min-w-0 grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] items-stretch gap-8 py-[87px]",
                )}
              >
                <LandingSectionPanel className="flex h-full min-h-0 flex-col overflow-hidden p-0">
                  <LatestNewsCarousel
                    slides={newsSlides}
                    variant="detailed"
                    onExplore={(slide) => openLatestNewsItem(slide)}
                  />
                </LandingSectionPanel>

                <LandingSectionPanel className="flex h-full min-h-0 flex-col p-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <BookOpen className="size-7 shrink-0" style={{ color: MARUTI_BLUE }} />
                    <h2
                      className="whitespace-nowrap text-[40px] font-extrabold leading-none"
                      style={{ color: MARUTI_BLUE }}
                    >
                      Knowledge Hub
                    </h2>
                  </div>
                  <div className="mt-5 flex flex-1 flex-col justify-between gap-3">
                    {KNOWLEDGE_HUB_ORDER.map((sourceLabel) => {
                      const item = KNOWLEDGE_HUB_ITEMS.find((entry) => entry.label === sourceLabel);
                      const presentation = KNOWLEDGE_HUB_PRESENTATION[sourceLabel];
                      if (!item || !presentation) return null;
                      return (
                        <button
                          key={sourceLabel}
                          type="button"
                          onClick={() => openKnowledgeHub(sourceLabel)}
                          className="flex w-full items-center gap-4 rounded-2xl border border-[#d9d9d9]/40 bg-white p-2 text-left transition hover:border-[#2563eb]/30 hover:shadow-sm"
                        >
                          <span className={`flex size-16 shrink-0 items-center justify-center rounded-2xl ${presentation.tint}`}>
                            <img src={item.icon} alt="" className="size-8 object-contain" />
                          </span>
                          <span className="text-xl font-bold text-[#171c4d]">{presentation.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </LandingSectionPanel>

                <LandingSectionPanel className="flex h-full min-h-0 flex-col p-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <Sparkles className="size-7 shrink-0" style={{ color: MARUTI_BLUE }} />
                    <h2
                      className="whitespace-nowrap text-[40px] font-extrabold leading-none"
                      style={{ color: MARUTI_BLUE }}
                    >
                      Newly Added
                    </h2>
                    <button
                      type="button"
                      onClick={() => navigateToLanding("/knowledgeHub")}
                      className="ml-auto shrink-0 whitespace-nowrap text-sm font-semibold transition hover:underline"
                      style={{ color: ELECTRIC_BLUE }}
                    >
                      View All
                    </button>
                  </div>
                  <div className="mt-5 flex flex-1 flex-col justify-between gap-3">
                    {newlyAdded.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-[#d9d9d9] bg-white/70 px-5 py-8 text-center text-sm text-black/50">
                        No newly added documents
                      </p>
                    ) : (
                      newlyAdded.map((item) => (
                        <button
                          key={item.key || item.id || item.title}
                          type="button"
                          onClick={() => navigateToApp(getNewlyAddedItemPath(item))}
                          className="relative flex h-16 w-full items-center overflow-hidden rounded-2xl bg-white text-left shadow-sm transition hover:bg-slate-50"
                        >
                          <span className={cn("absolute left-0 top-0 h-full w-1.5", item.bar)} aria-hidden />
                          <div className="flex w-full items-center justify-between gap-3 px-5">
                            <span className="truncate text-xl font-normal text-[#171c4d]">
                              {item.title}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2.5 py-1 text-lg font-bold tracking-[2px]",
                                item.tagClass,
                              )}
                            >
                              {item.tag}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </LandingSectionPanel>
              </div>
            </div>
          </>
        )}
        */}
      </div>
    </LandingScaledContent>
  );

  // ---- HIDDEN: news media modal for Latest News viewer ----
  // const newsMediaModal = (
  //   <EventMediaModal
  //     open={newsViewerIndex !== null}
  //     title={newsViewerSlide?.title || "Latest News & Announcements"}
  //     description={newsViewerSlide?.description}
  //     media={newsViewerMedia}
  //     currentIndex={newsViewerIndex || 0}
  //     initialExpanded
  //     disableCollapse
  //     onIndexChange={setNewsViewerIndex}
  //     onClose={() => setNewsViewerIndex(null)}
  //   />
  // );

  if (!withChrome) {
    return (
      <>
        {content}
        <CenterToast
          open={toast.open}
          variant={toast.variant}
          message={toast.message}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        />
      </>
    );
  }

  return (
    <LandingPageLayout landingRoutes insetContent={false}>
      {content}
      {/* {newsMediaModal} */}
      <CenterToast
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </LandingPageLayout>
  );
}
