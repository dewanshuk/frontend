import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FileText,
  Gift,
  GraduationCap,
  Grid3X3,
  Heart,
  Lock,
  Megaphone,
  MessageCircle,
  Newspaper,
  Phone,
  Play,
  Scale,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toLandingPath } from "@/lib/appNavigation";
import { useAuthNavigation } from "@/context/AuthNavigationContext";
import MyComplianceSpaceMenu from "@/components/landing/MyComplianceSpaceMenu";

const NAV_LINKS = [
  { label: "Knowledge Hub", to: "/knowledgeHub" },
  { label: "Gallery", to: "/gallery" },
  { label: "Compliance Helpdesk", to: "/compliance" },
  { label: "Audits", to: "#" },
  { label: "FAQs", to: "/faq" },
  { label: "CompliAI", to: "/compliai" },
];

const LEADERSHIP_SLIDES = [
  {
    name: "Mr. R.C. Bhargava",
    role: "Chairman",
    quote:
      "Over four decades, Maruti Suzuki has grown by earning the trust of millions of Indians. That trust is built on one foundation: doing business the right way. Compliance is not optional — it is our promise to India and to every stakeholder who believes in us.",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Mr. Hisashi Takeuchi",
    role: "Managing Director & CEO",
    quote:
      "Compliance culture is built every day through the choices we make. At MSIL, ethical conduct is not separate from business success — it is the foundation of sustainable growth and stakeholder confidence.",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
  },
];

const COMPLIANCE_CULTURE = [
  {
    icon: Phone,
    tag: "ANONYMOUS & CONFIDENTIAL",
    tagColor: "text-pink-600",
    title: "Ethios Hotline",
    description:
      "Report concerns anonymously through our secure ethics hotline. Every report is handled with confidentiality and care.",
    gradient: "from-pink-100 via-purple-50 to-white",
    iconBg: "bg-gradient-to-br from-pink-200 to-purple-200 text-pink-700",
  },
  {
    icon: Megaphone,
    tag: "ZERO RETALIATION POLICY",
    tagColor: "text-blue-600",
    title: "Speak Up Culture",
    description:
      "We encourage open dialogue and protect employees who raise compliance concerns in good faith.",
    gradient: "from-blue-100 via-sky-50 to-white",
    iconBg: "bg-gradient-to-br from-blue-200 to-sky-200 text-blue-700",
  },
  {
    icon: BookOpen,
    tag: "10,000+ TRAINED ANNUALLY",
    tagColor: "text-emerald-600",
    title: "Code of Conduct Training",
    description:
      "Annual mandatory training ensures every employee understands our values and compliance expectations.",
    gradient: "from-emerald-100 via-teal-50 to-white",
    iconBg: "bg-gradient-to-br from-emerald-200 to-teal-200 text-emerald-700",
  },
];

const QUICK_ACTIONS = [
  {
    title: "Declare Gifts",
    gradient: "from-[#e9ddff] via-[#f3ebff] to-[#faf5ff]",
    accent: "text-purple-600",
    illustration: "gift",
    href: null,
    to: "/compliance",
  },
  {
    title: "Access Comply Shield",
    gradient: "from-[#dbeafe] via-[#eff6ff] to-[#f8fbff]",
    accent: "text-blue-600",
    illustration: "shield",
    href: "https://prod.legatrixnxt.in/MarutiSuzuki/#/login",
  },
  {
    title: "Raise a Complaint",
    gradient: "from-[#fef3c7] via-[#fffbeb] to-[#fffdf5]",
    accent: "text-amber-600",
    illustration: "complaint",
    to: "/compliance",
  },
  {
    title: "Self Declaration",
    gradient: "from-[#dbeafe] via-[#e0f2fe] to-[#f0f9ff]",
    accent: "text-sky-600",
    illustration: "declaration",
    to: "/compliance",
  },
  {
    title: "Raise a Query",
    gradient: "from-[#ffedd5] via-[#fff7ed] to-[#fffaf5]",
    accent: "text-orange-600",
    illustration: "query",
    span: "col-span-2",
    to: "/compliance",
  },
];

const COMPLIANCE_PILLARS = [
  { label: "Integrity", icon: Scale, color: "bg-blue-100 text-blue-700" },
  { label: "People", icon: Users, color: "bg-blue-100 text-blue-700" },
  { label: "Culture", icon: Heart, color: "bg-purple-100 text-purple-700" },
  { label: "Process", icon: Settings, color: "bg-teal-100 text-teal-700" },
  { label: "Growth Mindset", icon: TrendingUp, color: "bg-pink-100 text-pink-700" },
  { label: "Technology", icon: Cpu, color: "bg-orange-100 text-orange-700" },
];

const KNOWLEDGE_HUB_ITEMS = [
  { label: "Policies", icon: FileText, color: "bg-purple-100 text-purple-700" },
  { label: "e-Module Trainings", icon: GraduationCap, color: "bg-teal-100 text-teal-700" },
  { label: "Flyers", icon: FileText, color: "bg-purple-100 text-purple-700" },
  { label: "Laws", icon: Lock, color: "bg-blue-100 text-blue-700" },
  { label: "Guidance Notes", icon: BookOpen, color: "bg-pink-100 text-pink-700" },
  { label: "Early Warnings", icon: Bell, color: "bg-orange-100 text-orange-700" },
];

const NEWLY_ADDED = [
  { title: "Data Privacy Policy", tag: "POLICY", tagClass: "bg-blue-100 text-blue-700", bar: "bg-blue-500" },
  { title: "Factories Act [1948]", tag: "LAW", tagClass: "bg-sky-100 text-sky-700", bar: "bg-sky-400" },
  { title: "Employee Code of Conduct", tag: "FLYER", tagClass: "bg-purple-100 text-purple-700", bar: "bg-purple-500" },
  { title: "Personnel Training Guide", tag: "TRAINING", tagClass: "bg-teal-100 text-teal-700", bar: "bg-teal-500" },
  { title: "Staff Guidelines", tag: "NOTE", tagClass: "bg-pink-100 text-pink-700", bar: "bg-pink-500" },
  { title: "Evacuation Plan", tag: "EARLY WARNINGS", tagClass: "bg-orange-100 text-orange-700", bar: "bg-orange-500" },
];

function CarouselDots({ total, active, onSelect, variant = "hero" }) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          type="button"
          aria-label={`Go to slide ${index + 1}`}
          onClick={() => onSelect(index)}
          className={`rounded-full transition-all ${
            index === active
              ? variant === "hero"
                ? "h-2.5 w-7 bg-blue-600"
                : "h-2.5 w-7 bg-blue-600"
              : variant === "hero"
                ? "h-2.5 w-2.5 bg-slate-300"
                : "h-2 w-2 bg-blue-200"
          }`}
        />
      ))}
    </div>
  );
}

function HeroWaveBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#003da5]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#002f87] via-[#0052cc] to-[#4d9fff]" />
      <svg
        className="absolute bottom-0 left-0 w-[120%] -translate-x-[8%] opacity-90"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="rgba(255,255,255,0.12)"
          d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,261.3C672,256,768,224,864,213.3C960,203,1056,213,1152,224C1248,235,1344,245,1392,250.7L1440,256L1440,320L0,320Z"
        />
      </svg>
      <svg
        className="absolute bottom-0 left-0 w-full opacity-80"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="rgba(255,255,255,0.08)"
          d="M0,256L60,245.3C120,235,240,213,360,208C480,203,600,213,720,234.7C840,256,960,288,1080,288C1200,288,1320,256,1380,240L1440,224L1440,320L0,320Z"
        />
      </svg>
      <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#60a5fa]/30 blur-3xl" />
    </div>
  );
}

function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const total = 5;

  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % total), 5000);
    return () => clearInterval(timer);
  }, [total]);

  return (
    <section className="w-full bg-white">
      <div className="relative h-[240px] md:h-[320px] lg:h-[360px]">
        <HeroWaveBackground />

        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => setIndex((current) => (current - 1 + total) % total)}
          className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2.5 text-white backdrop-blur-sm transition hover:bg-white/30 md:left-8"
        >
          <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => setIndex((current) => (current + 1) % total)}
          className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2.5 text-white backdrop-blur-sm transition hover:bg-white/30 md:right-8"
        >
          <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      </div>
      <CarouselDots total={total} active={index} onSelect={setIndex} variant="hero" />
    </section>
  );
}

function QuickActionIllustration({ type, accent }) {
  if (type === "gift") {
    return (
      <div className={`relative h-20 w-24 ${accent}`}>
        <Gift className="absolute right-0 top-2 h-10 w-10 opacity-80" />
        <div className="absolute bottom-0 right-4 h-12 w-8 rounded-full bg-purple-200/80" />
        <div className="absolute bottom-1 right-10 h-10 w-6 rounded-full bg-purple-300/70" />
      </div>
    );
  }
  if (type === "shield") {
    return (
      <div className={`relative h-20 w-24 ${accent}`}>
        <Shield className="absolute right-2 top-0 h-14 w-14 opacity-90" />
        <span className="absolute right-6 top-5 text-lg font-bold">e</span>
      </div>
    );
  }
  if (type === "complaint") {
    return (
      <div className={`relative h-20 w-24 ${accent}`}>
        <FileText className="absolute right-0 top-4 h-12 w-12 opacity-70" />
        <div className="absolute right-8 top-0 h-10 w-10 rounded-full border-4 border-amber-400/60" />
      </div>
    );
  }
  if (type === "declaration") {
    return (
      <div className={`relative h-20 w-24 ${accent}`}>
        <div className="absolute right-0 top-2 h-14 w-10 rounded-md border-2 border-sky-300 bg-white/70" />
        <div className="absolute right-3 top-6 h-1 w-6 rounded bg-sky-400" />
        <div className="absolute right-3 top-9 h-1 w-5 rounded bg-sky-300" />
        <Users className="absolute right-10 top-6 h-8 w-8 opacity-70" />
      </div>
    );
  }
  return (
    <div className={`relative h-20 w-28 ${accent}`}>
      <MessageCircle className="absolute right-8 top-0 h-10 w-10 opacity-70" />
      <span className="absolute right-0 top-2 text-5xl font-bold opacity-40">?</span>
      <Users className="absolute right-12 top-8 h-8 w-8 opacity-60" />
    </div>
  );
}

function SectionCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_0_20px_rgba(8,8,8,0.03)] md:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, requireLogin, navigateToApp } = useAuthNavigation();
  const navigateToLanding = (path) => {
    const landingPath = toLandingPath(path);
    if (requireLogin && !isAuthenticated) {
      navigateToApp(landingPath);
      return;
    }
    navigate(landingPath);
  };
  const [leadershipIndex, setLeadershipIndex] = useState(0);
  const leadership = LEADERSHIP_SLIDES[leadershipIndex];

  const renderQuickAction = (action) => {
    const className = `relative flex min-h-[118px] items-start justify-between overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br p-4 text-left transition hover:shadow-md ${action.gradient} ${action.span || ""}`;

    const content = (
      <>
        <span className="max-w-[58%] text-[15px] font-semibold leading-snug text-[#1e3a5f]">
          {action.title}
        </span>
        <QuickActionIllustration type={action.illustration} accent={action.accent} />
      </>
    );

    if (action.href) {
      return (
        <a key={action.title} href={action.href} target="_blank" rel="noreferrer" className={className}>
          {content}
        </a>
      );
    }

    return (
      <button
        key={action.title}
        type="button"
        className={className}
        onClick={() => action.to && navigateToLanding(action.to)}
      >
        {content}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* Top header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[64px] max-w-[1280px] items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Open app menu"
            >
              <Grid3X3 className="h-5 w-5" />
            </button>
            <img src="/maruti-suzuki-logo.svg" alt="Maruti Suzuki" className="h-8 w-auto md:h-9" />
            <span
              className="h-8 w-px shrink-0 bg-slate-300"
              aria-hidden
            />
            <span className="text-sm font-medium tracking-wide text-[#003da5] md:text-[15px]">
              Enterprise Compliance Platform
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <MyComplianceSpaceMenu
                labelClassName="text-xs font-medium leading-tight text-[#334155] md:text-[13px]"
                avatarClassName="h-9 w-9"
              />
            ) : null}
          </div>
        </div>
      </header>

      {/* Secondary navigation */}
      <nav className="border-b border-[#c7ddfc] bg-[#eef4ff]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-3 md:px-6">
          {NAV_LINKS.map((link) => {
            if (!link.to.startsWith("/")) {
              return (
                <a
                  key={link.label}
                  href={link.to}
                  className="text-sm font-medium text-[#4b7fd6] hover:text-[#003da5]"
                >
                  {link.label}
                </a>
              );
            }

            const landingPath = toLandingPath(link.to);

            if (requireLogin && !isAuthenticated) {
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => navigateToApp(landingPath)}
                  className="text-sm font-medium text-[#4b7fd6] transition hover:text-[#003da5]"
                >
                  {link.label}
                </button>
              );
            }

            return (
              <Link
                key={link.label}
                to={landingPath}
                className="text-sm font-medium text-[#4b7fd6] transition hover:text-[#003da5]"
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <HeroCarousel />

      <main className="mx-auto max-w-[1280px] space-y-8 px-4 py-8 md:space-y-10 md:px-6">
        {/* Leadership + Latest News */}
        <section className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#4b7fd6]">
              Leadership Speaks
            </p>
            <h1 className="mt-2 text-[34px] font-bold leading-tight text-[#102a43] md:text-[42px]">
              Tone at the <span className="text-[#4b7fd6]">Top</span>
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Compliance begins with conviction at the highest level
            </p>

            <SectionCard className="mt-5 border-[#dbeafe] bg-[#f3f8ff]">
              <div className="flex items-center gap-4">
                <img
                  src={leadership.image}
                  alt={leadership.name}
                  className="h-[72px] w-[72px] rounded-full border-[3px] border-white object-cover shadow-md"
                />
                <div>
                  <p className="text-lg font-bold text-[#102a43]">{leadership.name}</p>
                  <span className="mt-1 inline-flex rounded-full bg-[#ede9fe] px-3 py-1 text-xs font-semibold text-[#7c3aed]">
                    {leadership.role}
                  </span>
                </div>
              </div>

              <div className="relative mt-5 rounded-2xl border border-[#dbeafe] bg-white px-5 py-6 md:px-6">
                <span className="absolute left-4 top-1 text-[56px] leading-none text-[#93c5fd]">&ldquo;</span>
                <p className="relative z-10 px-6 text-sm leading-7 text-slate-700 md:text-[15px]">
                  {leadership.quote}
                </p>
                <span className="absolute bottom-0 right-5 text-[56px] leading-none text-[#93c5fd]">&rdquo;</span>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Previous quote"
                  onClick={() =>
                    setLeadershipIndex(
                      (current) =>
                        (current - 1 + LEADERSHIP_SLIDES.length) % LEADERSHIP_SLIDES.length,
                    )
                  }
                  className="rounded-full border border-[#bfdbfe] bg-white p-2 text-[#2563eb] hover:bg-[#eff6ff]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <CarouselDots
                  total={LEADERSHIP_SLIDES.length}
                  active={leadershipIndex}
                  onSelect={setLeadershipIndex}
                />
                <button
                  type="button"
                  aria-label="Next quote"
                  onClick={() =>
                    setLeadershipIndex((current) => (current + 1) % LEADERSHIP_SLIDES.length)
                  }
                  className="rounded-full border border-[#bfdbfe] bg-white p-2 text-[#2563eb] hover:bg-[#eff6ff]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </SectionCard>
          </div>

          <SectionCard className="flex flex-col">
            <div className="mb-4 flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-[#2563eb]" />
              <h2 className="text-lg font-bold text-[#102a43]">Latest News &amp; Announcements</h2>
            </div>

            <div className="overflow-hidden rounded-2xl">
              <img
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1000&q=80"
                alt="Employee Code of Conduct"
                className="h-[220px] w-full object-cover md:h-[250px]"
              />
            </div>

            <h3 className="mt-5 text-[22px] font-bold leading-snug text-[#003da5]">
              Employee Code of Conduct Explained!
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Learn about our values, responsibilities and expected behavior.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigateToLanding("/knowledgeHub")}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] hover:underline"
              >
                <Play className="h-4 w-4 fill-current" />
                Knowledge Hub
              </button>
              <button
                type="button"
                onClick={() => navigateToLanding("/gallery")}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] hover:underline"
              >
                <Newspaper className="h-4 w-4" />
                Gallery
              </button>
              <button
                type="button"
                onClick={() => navigateToLanding("/faq")}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] hover:underline"
              >
                FAQs
              </button>
              <button
                type="button"
                onClick={() => navigateToLanding("/compliai")}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] hover:underline"
              >
                CompliAI
              </button>
              <button
                type="button"
                onClick={() => navigateToLanding("/compliance")}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] hover:underline"
              >
                Compliance Helpdesk
              </button>
            </div>
          </SectionCard>
        </section>

        {/* Compliance Culture + Quick Actions */}
        <section className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <SectionCard>
            <h2 className="text-xl font-bold text-[#003da5]">Compliance Culture @MSIL</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {COMPLIANCE_CULTURE.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className={`overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-b ${item.gradient}`}
                  >
                    <div className="flex justify-center px-4 pb-3 pt-5">
                      <span className={`inline-flex rounded-2xl p-4 ${item.iconBg}`}>
                        <Icon className="h-7 w-7" />
                      </span>
                    </div>
                    <div className="px-4 pb-5 text-center">
                      <p className={`text-[10px] font-bold tracking-wide ${item.tagColor}`}>{item.tag}</p>
                      <h3 className="mt-2 text-sm font-bold text-[#102a43]">{item.title}</h3>
                      <p className="mt-2 text-xs leading-5 text-slate-600">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard>
            <h2 className="text-xl font-bold text-[#003da5]">Quick Actions</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map((action) => renderQuickAction(action))}
            </div>
          </SectionCard>
        </section>

        {/* Pillars + Knowledge Hub + Newly Added */}
        <section className="grid gap-6 xl:grid-cols-3 xl:gap-8">
          <SectionCard>
            <h2 className="text-lg font-bold text-[#102a43]">Compliance Pillars</h2>
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
              {COMPLIANCE_PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div key={pillar.label} className="flex items-center gap-3">
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${pillar.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-[#102a43]">{pillar.label}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard>
            <h2 className="text-lg font-bold text-[#102a43]">Knowledge Hub</h2>
            <div className="mt-5 space-y-2.5">
              {KNOWLEDGE_HUB_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigateToLanding("/knowledgeHub")}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold text-[#102a43]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#102a43]">Newly Added</h2>
              <Button
                variant="link"
                className="h-auto p-0 text-sm font-semibold text-[#2563eb]"
                onClick={() => navigateToLanding("/knowledgeHub")}
              >
                View All
              </Button>
            </div>
            <div className="mt-5 space-y-2.5">
              {NEWLY_ADDED.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => navigateToLanding("/knowledgeHub")}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3 text-left shadow-sm transition hover:bg-slate-50"
                >
                  <span className={`h-10 w-1 shrink-0 rounded-full ${item.bar}`} />
                  <span className="flex-1 text-sm font-medium text-[#102a43]">{item.title}</span>
                  <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${item.tagClass}`}>
                    {item.tag}
                  </span>
                </button>
              ))}
            </div>
          </SectionCard>
        </section>
      </main>

      <footer className="mt-4 bg-[#0b1f3f] text-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <p className="text-lg font-semibold">Enterprise Compliance Portal</p>
            <p className="mt-1 text-sm text-slate-300">&copy; Maruti Suzuki India Limited</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
            {["Privacy Policy", "Terms of Use", "Anonymous Reporting", "Contact Legal", "Sitemap"].map(
              (link) => (
                <a key={link} href="#" className="transition hover:text-white">
                  {link}
                </a>
              ),
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
