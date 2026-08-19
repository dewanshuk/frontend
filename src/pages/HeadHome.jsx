import { useEffect, useMemo, useState } from "react";
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
import KpiTeamChart from "@/components/landing/KpiTeamChart";
import QuickActionIllustration from "@/components/landing/QuickActionIllustration";
import LandingScaledContent from "@/components/landing/LandingScaledContent";
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
  getDueForMeData,
  getHeadKpiData,
  getRecentActivity,
  // getWhatsNew,
} from "@/api/homeApi";
import { buildComplianceActivityPath } from "@/utils/recentActivityUtils";
import { getDueItemTarget } from "@/utils/dueForMeUtils";
import { buildKpiCategories } from "@/utils/headKpiUtils";
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

export default function HeadHome({ user, withChrome = true }) {
  const { navigateToApp, user: authUser } = useAuthNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [overdueOpen, setOverdueOpen] = useState(true);
  const [dueSoonOpen, setDueSoonOpen] = useState(true);
  // ---- HIDDEN (homepage duplicate): What's New ----
  // const [newlyAdded, setNewlyAdded] = useState([]);
  const [overdueItems, setOverdueItems] = useState([]);
  const [dueItems, setDueItems] = useState([]);
  const [overdueTotalCount, setOverdueTotalCount] = useState(0);
  const [dueTotalCount, setDueTotalCount] = useState(0);
  const [kpiSections, setKpiSections] = useState({});
  const [trainingSubcategories, setTrainingSubcategories] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  const greeting = getGreeting();
  const displayName = useDisplayName(user || authUser);
  const kpiCategories = useMemo(
    () => buildKpiCategories(kpiSections, { trainingSubcategories }),
    [kpiSections, trainingSubcategories],
  );
  const inProgressCount = recentActivities.filter((activity) =>
    String(activity?.status || "").toLowerCase().includes("progress"),
  ).length;

  const navigateToLanding = (path) => {
    navigateToApp(toLandingPath(path) || path);
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

  // ---- HIDDEN (homepage duplicate): Knowledge Hub tiles ----
  // const openKnowledgeHub = (typeLabel) => {
  //   const type = KNOWLEDGE_HUB_ITEM_TYPES[typeLabel];
  //   const hubPath = type
  //     ? `${LANDING_V2_BASE}/knowledge-hub?type=${encodeURIComponent(type)}`
  //     : toLandingPath("/knowledgeHub");
  //   navigateToApp(hubPath);
  // };

  useEffect(() => {
    let cancelled = false;

    const loadHomeData = async () => {
      try {
        // ---- HIDDEN (homepage duplicate): also load whats-new ----
        // const [whatsNewResponse, dueForMeData, headKpiData, recentActivity] =
        //   await Promise.all([...]);
        const [dueForMeData, headKpiData, recentActivity] = await Promise.all([
          getDueForMeData().catch(() => ({
            overdueItems: [],
            dueItems: [],
            overdueCount: 0,
            dueCount: 0,
          })),
          getHeadKpiData().catch(() => ({
            sections: {},
            trainingSubcategories: [],
          })),
          getRecentActivity().catch(() => []),
        ]);

        if (cancelled) return;

        // const items = Array.isArray(whatsNewResponse?.data) ? whatsNewResponse.data : [];
        // setNewlyAdded(mapWhatsNewToNewlyAdded(items));

        setOverdueItems(dueForMeData?.overdueItems ?? []);
        setDueItems(dueForMeData?.dueItems ?? []);
        setOverdueTotalCount(
          dueForMeData?.overdueCount ?? dueForMeData?.overdueItems?.length ?? 0,
        );
        setDueTotalCount(dueForMeData?.dueCount ?? dueForMeData?.dueItems?.length ?? 0);

        setKpiSections(headKpiData?.sections ?? {});
        setTrainingSubcategories(headKpiData?.trainingSubcategories ?? []);

        setRecentActivities(extractRecentActivityItems(recentActivity).slice(0, 3));
      } catch {
        if (cancelled) return;
        // setNewlyAdded([]);
        setOverdueItems([]);
        setDueItems([]);
        setOverdueTotalCount(0);
        setDueTotalCount(0);
        setKpiSections({});
        setTrainingSubcategories([]);
        setRecentActivities([]);
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

    return (
      <button
        key={key}
        type="button"
        className={className}
        style={style}
        onClick={() => action.to && navigateToApp(toLandingPath(action.to) || action.to)}
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
                <div className="min-w-0">
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

                <div className="min-w-0">
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

        {/* Bottom: Quick Actions + Recent Activities, then KPI */}
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

          <section className="mt-8 min-w-0">
            <LandingSectionPanel className="flex min-h-0 flex-col p-6 lg:p-8">
              <KpiTeamChart categories={kpiCategories} />
            </LandingSectionPanel>
          </section>
        </div>

        {/*
          ---- HIDDEN (repeated on marketing Homepage) ----
          Knowledge Hub + Newly Added (and former third-row KPI placement).
          Also restores prior layout: Quick Actions + Recent, then KPI | KH | Newly Added.

        {false && (
          <>
            <div className={homePageShellClassName("w-full py-[90px]")}>
              <section className="grid min-w-0 grid-cols-2 items-stretch gap-8">
                <LandingSectionPanel className="flex h-full min-h-0 flex-col p-8">
                  Quick Actions grid (QUICK_ACTIONS.map renderQuickAction)
                </LandingSectionPanel>
                <LandingSectionPanel className="flex h-full min-h-0 flex-col p-8">
                  My Recent Activities (same as bottom-right above)
                </LandingSectionPanel>
              </section>
            </div>

            <div className={homePageShellClassName()}>
              <div
                className="h-px w-full bg-gradient-to-r from-[#171c8f] via-[#8b5cf6] to-[#00b6fd] opacity-15"
                aria-hidden="true"
              />
            </div>

            <div className="w-full bg-white">
              <div className={homePageShellClassName("flex min-w-0 flex-col gap-8 py-[87px]")}>
                <div className="grid min-w-0 grid-cols-[1.2fr_0.8fr_0.8fr] items-stretch gap-8">
                  <LandingSectionPanel className="flex h-full min-h-0 flex-col p-6">
                    <KpiTeamChart categories={kpiCategories} />
                  </LandingSectionPanel>

                  <LandingSectionPanel className="flex h-full min-h-0 flex-col p-6">
                    Knowledge Hub tiles (KNOWLEDGE_HUB_ORDER + openKnowledgeHub)
                  </LandingSectionPanel>

                  <LandingSectionPanel className="flex h-full min-h-0 flex-col p-6">
                    Newly Added list (newlyAdded + getNewlyAddedItemPath)
                  </LandingSectionPanel>
                </div>
              </div>
            </div>
          </>
        )}
        */}
      </div>
    </LandingScaledContent>
  );

  if (!withChrome) return content;

  return (
    <LandingPageLayout landingRoutes insetContent={false}>
      {content}
    </LandingPageLayout>
  );
}
