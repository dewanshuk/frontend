import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDocumentGallery, getWhatsNew } from "@/api/homeApi";
import { Button } from "@/components/ui/button";
import LandingScaledContent from "@/components/landing/LandingScaledContent";
import LandingPageLayout from "@/components/landing/LandingPageLayout";
import LandingSectionPanel from "@/components/landing/LandingSectionPanel";
import LatestNewsCarousel from "@/components/landing/LatestNewsCarousel";
import CarouselNavButton from "@/components/landing/CarouselNavButton";
import QuickActionIllustration from "@/components/landing/QuickActionIllustration";
import EventMediaModal from "@/components/events/EventMediaModal";
import {
  ELECTRIC_BLUE,
  MARUTI_BLUE,
  landingHeroSlideClassName,
  landingPageContentClassName,
} from "@/components/landing/landingTheme";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shared/Tooltip";
import { useAuthNavigation } from "@/context/AuthNavigationContext";
import { toLandingPath, LANDING_V2_BASE } from "@/lib/appNavigation";
import {
  KNOWLEDGE_HUB_ITEMS,
  QUICK_ACTIONS,
  getNewlyAddedItemPath,
  mapWhatsNewToNewlyAdded,
} from "@/data/headHomeData";
import { mapDocumentGalleryToNewsSlides } from "@/utils/latestNewsUtils";
import {
  LOOPING_CAROUSEL_EASE,
  useLoopingCarousel,
} from "@/hooks/useLoopingCarousel";

const HERO_SLIDE_MS = 750;
const LEADERSHIP_SLIDE_MS = 650;
const CAROUSEL_EASE = LOOPING_CAROUSEL_EASE;
const HERO_ICON_BASE = "/assets/landing-page-icons";
const HERO_ICON_HEIGHT = 48;
const HERO_ICON_MAX_WIDTH = 88;
const heroIconMarkupCache = new Map();
const heroIconBoundsCache = new Map();

function parseSvgViewBox(markup) {
  const match = markup.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!match) return null;
  const parts = match[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) return null;
  if (parts[2] <= 0 || parts[3] <= 0) return null;
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}

function rasterizeSvg(markup, width, height) {
  return new Promise((resolve, reject) => {
    const sized = markup.replace(/<svg\b[^>]*>/i, (tag) =>
      tag
        .replace(/\swidth\s*=\s*["'][^"']*["']/i, "")
        .replace(/\sheight\s*=\s*["'][^"']*["']/i, "")
        .replace(/<svg/i, `<svg width="${width}" height="${height}"`),
    );
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`;
  });
}

// Trims rows/columns whose ink is negligible so stray specks and faint
// artifacts in the source artwork do not inflate the measured bounds.
function inkRange(profile) {
  const max = Math.max(...profile);
  if (!max) return null;
  const threshold = Math.max(1, max * 0.02);
  let start = 0;
  while (start < profile.length && profile[start] < threshold) start += 1;
  let end = profile.length - 1;
  while (end > start && profile[end] < threshold) end -= 1;
  return [start, end];
}

async function measureHeroIconBounds(markup) {
  const viewBox = parseSvgViewBox(markup);
  if (!viewBox) return null;

  const aspect = viewBox.width / viewBox.height;
  const width = Math.max(24, Math.round(aspect >= 1 ? 320 : 320 * aspect));
  const height = Math.max(24, Math.round(aspect >= 1 ? 320 / aspect : 320));

  const image = await rasterizeSvg(markup, width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);

  const rows = new Array(height).fill(0);
  const columns = new Array(width).fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 16) {
        rows[y] += 1;
        columns[x] += 1;
      }
    }
  }

  const verticalRange = inkRange(rows);
  const horizontalRange = inkRange(columns);
  if (!verticalRange || !horizontalRange) return null;

  const scaleX = viewBox.width / width;
  const scaleY = viewBox.height / height;
  return {
    x: viewBox.x + horizontalRange[0] * scaleX,
    y: viewBox.y + verticalRange[0] * scaleY,
    width: (horizontalRange[1] - horizontalRange[0] + 1) * scaleX,
    height: (verticalRange[1] - verticalRange[0] + 1) * scaleY,
  };
}

function measureHeroIconBoundsFromGeometry(svg) {
  const drawables = svg.querySelectorAll(
    "path,rect,circle,ellipse,polygon,polyline,line,use",
  );
  let bounds = null;

  drawables.forEach((element) => {
    if (element.closest("defs,clipPath,mask")) return;
    const fill = element.getAttribute("fill");
    const stroke = element.getAttribute("stroke");
    if (fill === "none" && (!stroke || stroke === "none")) return;

    try {
      const box = element.getBBox();
      if (box.width === 0 && box.height === 0) return;
      if (!bounds) {
        bounds = { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height };
        return;
      }
      bounds.left = Math.min(bounds.left, box.x);
      bounds.top = Math.min(bounds.top, box.y);
      bounds.right = Math.max(bounds.right, box.x + box.width);
      bounds.bottom = Math.max(bounds.bottom, box.y + box.height);
    } catch {
      // Ignore SVG nodes that do not expose geometry.
    }
  });

  if (!bounds) return null;
  return {
    x: bounds.left,
    y: bounds.top,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top,
  };
}

function HeroAssetIcon({ name, className = "" }) {
  const hostRef = useRef(null);
  const [svgMarkup, setSvgMarkup] = useState(() => heroIconMarkupCache.get(name) ?? "");
  const [bounds, setBounds] = useState(() => heroIconBoundsCache.get(name) ?? null);

  useEffect(() => {
    let cancelled = false;
    setSvgMarkup(heroIconMarkupCache.get(name) ?? "");
    setBounds(heroIconBoundsCache.get(name) ?? null);

    const loadMarkup = heroIconMarkupCache.has(name)
      ? Promise.resolve(heroIconMarkupCache.get(name))
      : fetch(`${HERO_ICON_BASE}/${name}`)
          .then((response) => response.text())
          .then((markup) => {
            heroIconMarkupCache.set(name, markup);
            return markup;
          });

    loadMarkup
      .then(async (markup) => {
        if (cancelled) return;
        setSvgMarkup(markup);
        if (heroIconBoundsCache.has(name)) return;
        const measured = await measureHeroIconBounds(markup).catch(() => null);
        if (!measured) return;
        heroIconBoundsCache.set(name, measured);
        if (!cancelled) setBounds(measured);
      })
      .catch(() => {
        if (!cancelled) setSvgMarkup("");
      });

    return () => {
      cancelled = true;
    };
  }, [name]);

  useLayoutEffect(() => {
    const svg = hostRef.current?.querySelector("svg");
    if (!svg) return;

    const box = bounds ?? measureHeroIconBoundsFromGeometry(svg);
    if (box && box.height > 0) {
      // Normalize by artwork height so every icon shares the same visible
      // vertical size while its width scales proportionally.
      const padding = box.height * 0.04;
      const width = box.width + padding * 2;
      const height = box.height + padding * 2;
      svg.setAttribute("viewBox", `${box.x - padding} ${box.y - padding} ${width} ${height}`);
      svg.style.width = `${Math.min(HERO_ICON_HEIGHT * (width / height), HERO_ICON_MAX_WIDTH)}px`;
    }

    svg.removeAttribute("width");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.display = "block";
    svg.style.flex = "none";
    svg.style.height = "100%";
    svg.style.overflow = "visible";
  }, [svgMarkup, bounds]);

  return (
    <span
      ref={hostRef}
      className={`inline-flex size-12 shrink-0 items-center justify-center overflow-visible ${className}`}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}

const LANDING_KH_ITEM_TYPES = {
  Policies: "Policies",
  "e-Module Trainings": "Training Resources",
  Flyers: "Flyers",
  Laws: "Law & Regulation",
  "Guidance Notes": "Guidance Notes",
  "Early Warnings": "Early Warnings",
};

const HERO_SLIDES = [
  { background: "/assets/landing/hero-slides/hero-slide-1.png" },
  { background: "/assets/landing/hero-slides/hero-slide-2.png" },
  { background: "/assets/landing/hero-slides/hero-slide-3.png" },
  { background: "/assets/landing/hero-slides/hero-slide-4.png" },
  { background: "/assets/landing/hero-slides/hero-slide-5.png" },
  { background: "/assets/landing/hero-slides/hero-slide-6.png" },
];

const LEADERSHIP_SLIDES = [
  {
    name: "Mr. R C Bhargava",
    role: "Chairman",
    badgeClass: "bg-[#2563eb] text-white",
    quote: (
      <div className="text-justify">
        A company cannot build a sustainable and profitable business by being non-compliant or unethical in its ways of working.
        <br/><br/>
        Business competitiveness and profitability requires a strong element of trust in all aspects of operations. Compliance with what is ‘right’ and ‘fair’ is a fundamental requirement of building trust.
      </div>
    ),    
    image: "/assets/landing/Chairman_san_Grey_BG.png",
    dividerWidth: "w-[150px]",
    quoteClass: "font-normal",
  },
  {
    name: "Mr. Hisashi Takeuchi",
    role: "Managing Director and CEO",
    badgeClass: "bg-[#2563eb] text-white",
    quote: (
      <div className="text-justify">
        Compliance is the bedrock on which we build credibility, and credibility is what allows growth to be both strong and sustainable.
        <br/><br/>
        The cost of non-compliance is enormous. It can damage our financial health, erode our hard-earned reputation, demoralize our workforce, and even compromise our license to operate.
      </div>
    ),        
    image: "/assets/landing/MD_san_Grey_BG.png",
    dividerWidth: "w-[150px]",
    quoteClass: "font-medium",
  },
  {
    name: "Ms. Manjaree Chowdhary",
    role: "Chief Compliance Officer",
    badgeClass: "bg-[#2563eb] text-white",
    quote: (
      <div className="text-justify">
        New business risks and regulatory demands driven by need for sustainable future are placing increased responsibility and accountability on companies.
        <br/><br/>
        To successfully meet such evolving requirements, employees need to be constantly vigilant, be highly accountable, and demonstrate individual ownership of Compliance.
      </div>
    ),      
    image: "/assets/landing/Manjaree_san_Grey_BG.png",
    dividerWidth: "w-[150px]",
    quoteClass: "font-normal",
  },
];

const COMPLIANCE_CULTURE = [
  {
    tag: "Ownership & Partnership",
    tagColor: "text-[#8b5cf6]",
    title: "Compliance Begins with Me",
    icon: "/assets/leadership-new/ownership-partner.png",
    description:
      "Every employee takes ownership of compliance in their area of work, fostering a culture of accountability, integrity, and partnership."
  },
  {
    tag: "Continuous Education",
    tagColor: "text-[#2563eb]",
    title: "15,000+ Employees Trained Annually",
    icon: "/assets/leadership-new/continue-education.png",
    description:
      "Mandatory COBCE and POSH trainings for all employees, complemented by focused awareness on statutory compliance requirements."
  },
  {
    tag: <div>Speak Up <br/><br/> </div>,
    tagColor: "text-[#171c8f]",
    title: "Safe to Raise Concerns",
    icon: "/assets/landing/zero-retaliation-icon.png",
    description:
      "Every employee is empowered to speak up without fear. MSIL maintains confidentiality and enforces a strict non-retaliation policy."
  },
];

const COMPLIANCE_PILLARS = [
  {
    label: "Integrity",
    tintColor: "#171C8F",
    iconAsset: "compass.svg",
    tagline: "sets the ethical standards and expectations.",
    description:
      "The foundation of compliance. Integrity means acting ethically, honestly, and transparently in every decision and interaction. It requires doing what is right, even when faced with pressure, uncertainty, or situations where no one is watching.",
  },
  {
    label: "People",
    tintColor: "#2563EB",
    icon: "/assets/landing/pillars/pillar-people-icon.svg",
    tagline: "translate those standards into daily actions and decisions.",
    description:
      "Compliance begins with people. Every employee plays a role in understanding expectations, following policies, raising concerns, and being accountable for their actions. Empowered and informed employees are the first line of defense against compliance risks.",
  },
  {
    label: "Culture",
    tintColor: "#8B5CF6",
    icon: "/assets/landing/pillars/pillar-culture-icon.svg",
    tagline: "reinforces desired behaviors across the organization.",
    description:
      "A strong compliance culture promotes trust, accountability, and ethical decision-making. It encourages employees to speak up without fear, learn from mistakes, and consistently align their actions with organizational values and regulatory requirements.",
  },
  {
    label: "Process",
    tintColor: "#00B6FD",
    icon: "/assets/landing/pillars/pillar-process-icon.svg",
    tagline: "embeds compliance requirements into business operations.",
    description:
      "Well-defined processes ensure compliance is embedded into daily operations. Standardized procedures, controls, monitoring, and documentation help reduce risk, maintain consistency, and ensure adherence to internal policies and external regulations.",
  },
  {
    label: "Technology",
    tintColor: "#BF6A02",
    iconAsset: "computer.svg",
    tagline: "strengthens processes through automation, monitoring, and insights.",
    description:
      "Technology strengthens compliance through automation, monitoring, analytics, and secure data management. It improves efficiency, enhances transparency, supports informed decision-making, and enables timely identification and mitigation of compliance risks.",
  },
  {
    label: "Growth Mindset",
    tintColor: "#8A226F",
    icon: "/assets/landing/pillars/pillar-growth-icon.svg",
    tagline: "drives continuous improvement and adaptation to emerging risks.",
    description:
      "Compliance is a continuous journey, not a one-time activity. A growth mindset encourages learning, adaptability, and proactive risk management, enabling the organization to respond effectively to evolving regulations, technologies, and business challenges.",
  },
];

const KNOWLEDGE_HUB_PRESENTATION = {
  Policies: { label: "Policies", tint: "bg-[#171c8f]/15" },
  "Guidance Notes": { label: "Guidance Notes", tint: "bg-[#8a226f]/15" },
  Laws: { label: "Law & Regulation", tint: "bg-[#2563eb]/15" },
  "e-Module Trainings": { label: "Training Resources", tint: "bg-[#00b6fd]/15" },
  Flyers: { label: "Flyers", tint: "bg-[#8b5cf6]/15" },
  "Early Warnings": { label: "Early Warnings", tint: "bg-[#bf6a02]/15" },
};

const LANDING_KNOWLEDGE_HUB_ORDER = [
  "Policies",
  "Guidance Notes",
  "Laws",
  "e-Module Trainings",
  "Flyers",
  "Early Warnings",
];

function HeroDots({ total, active, onSelect }) {
  return (
    <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          type="button"
          aria-label={`Go to slide ${index + 1}`}
          onClick={() => onSelect(index)}
          className={`rounded-full transition-all ${
            index === active ? "h-3.5 w-5 bg-white" : "size-3.5 bg-white/40"
          }`}
        />
      ))}
    </div>
  );
}

function HeroSlideAcceleration() {
  return (
    <div className={landingHeroSlideClassName("flex items-center")}>
      <div className="min-w-0 flex-1">
        <div className="min-w-0 text-white">
          <h2
            className="animate-hero-fade-in-left text-[64px] font-bold leading-[1.12]"
            style={{ animationDelay: "0.15s" }}
          >
            Acceleration with{" "}
            <span className="text-[#00b6fd]">Compliance</span>
          </h2>
          <p
            className="animate-hero-fade-in-left mt-5 max-w-2xl text-2xl leading-relaxed text-white/90"
            style={{ animationDelay: "0.35s" }}
          >
            Driving India&apos;s mobility revolution — with integrity, accountability, and
            unwavering commitment to compliance.
          </p>
          <div
            className="animate-hero-fade-in-left mt-8 flex flex-wrap items-center gap-x-10 gap-y-4"
            style={{ animationDelay: "0.55s" }}
          >
            <div className="flex items-center gap-3">
              <HeroAssetIcon name="Building trust .svg" />
              <span className="text-xl leading-relaxed text-white/90">40+ Years of Trust</span>
            </div>
            <div className="flex items-center gap-3">
              <HeroAssetIcon name="Gearing Up for Excellence.svg" />
              <span className="text-xl leading-relaxed text-white/90">Gearing Up for Excellence</span>
            </div>
            <div className="flex items-center gap-3">
              <HeroAssetIcon name="Long-term Value Creation Updated.svg" />
              <span className="text-xl leading-relaxed text-white/90">Long-term Value Creation</span>
            </div>
          </div>
        </div>

        {/* <div
          className="animate-hero-fade-in-right relative mt-0 flex min-h-[280px] items-center justify-center"
          style={{ animationDelay: "0.4s" }}
        >
          <img
            src="/assets/landing/hero-slide-1-badge.png"
            alt=""
            className="animate-hero-float max-h-[420px] w-full max-w-[520px] object-contain object-center"
          />
        </div> */}
      </div>
    </div>
  );
}

function HeroStatCard({ icon, value, label, animationDelay }) {
  const [showBorder, setShowBorder] = useState(false);

  return (
    <div
      className={`animate-hero-fade-in-right rounded-2xl border bg-white/10 p-5 text-white backdrop-blur-sm transition-[border-color] duration-300 ${
        showBorder ? "border-white/25" : "border-transparent"
      }`}
      style={{ animationDelay }}
      onAnimationEnd={(event) => {
        if (event.animationName.includes("hero-fade-in-right")) {
          setShowBorder(true);
        }
      }}
    >
      <HeroAssetIcon name={icon} />
      <p className="mt-4 text-5xl font-bold leading-none text-white">{value}</p>
      <p className="mt-2 text-sm font-semibold uppercase leading-snug tracking-wide text-white/90">
        {label}
      </p>
    </div>
  );
}

function HeroSlideCompliance() {
  const features = [
    { icon: "Risk Mitigation.svg", label: "Risk Mitigation" },
    { icon: "Business Continuity.svg", label: "Business Continuity" },
  ];

  const stats = [
    { icon: "Business Units.svg", value: "60+", label: "Business Units" },
    {
      icon: "Laws & Regulations- slide 2.svg",
      value: "400+",
      label: "Laws & Regulations",
    },
    {
      icon: "LAws and regulations 3.0.svg",
      value: "350+",
      label: "Registrations and Licenses",
    },
    {
      icon: "Follow regulations.svg",
      value: "10,000+",
      label: "Compliance requirements",
    },
  ];

  return (
    <div className={landingHeroSlideClassName("flex items-center")}>
      <div className="grid min-w-0 flex-1 grid-cols-[1.05fr_0.95fr] items-center gap-10">
        <div className="min-w-0 text-white">
          <h2
            className="animate-hero-fade-in-left text-[64px] font-bold leading-[1.12]"
            style={{ animationDelay: "0.15s" }}
          >
            Compliance at <span className="text-[#00b6fd]">MSIL</span>
          </h2>
          <p
            className="animate-hero-fade-in-left mt-5 max-w-2xl text-2xl leading-relaxed text-white/90"
            style={{ animationDelay: "0.35s" }}
          >
            A comprehensive, multi-layered compliance framework —
            ensuring every action aligns with law, ethics, and our promise to India.
          </p>
          <div
            className="animate-hero-fade-in-left mt-8 grid grid-cols-2 gap-x-10 gap-y-4"
            style={{ animationDelay: "0.55s" }}
          >
            {features.map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <HeroAssetIcon name={icon} />
                <span className="text-xl leading-relaxed text-white/90">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="mt-0 grid grid-cols-2 gap-4 text-white"
          style={{ animationDelay: "0.4s" }}
        >
          {stats.map(({ icon, value, label }, index) => (
            <HeroStatCard
              key={label}
              icon={icon}
              value={value}
              label={label}
              animationDelay={`${0.5 + index * 0.1}s`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroSlideEthicsIntegrity() {
  const columns = [
    {
      icon: "Upholding our values in every business decision.svg",
      text: "Upholding our values in every business decision",
    },
    {
      icon: "Doing what is right, even when no one is watching.svg",
      text: "Doing what is right, even when no one is watching",
    },
    {
      icon: "Working with honesty, transparency, and accountability.svg",
      text: "Working with honesty, transparency and accountability",
    },
    {
      icon: "Setting the right example through your own actions.svg",
      text: "Setting the right example through our own actions",
    },
    {
      icon: "Building trust .svg",
      text: "Building trust through consistent actions and behavior",
    },
    {
      icon: "Speaking up when something doesn’t feel right (1).svg",
      text: "Speaking up when something doesn't feel right",
    },
  ];

  return (
    <div
      className={`${landingHeroSlideClassName()} bg-gradient-to-br from-[#1a2e45] via-[#223a55] to-[#2c4a6a]`}
    >
      <div className="flex h-full flex-col justify-center pb-0">
        <h2
          className="animate-hero-fade-in-left text-[64px] font-bold leading-[1.12] text-white"
          style={{ animationDelay: "0.15s" }}
        >
          Ethics & Integrity
        </h2>

        <div className="mt-12 grid grid-cols-3 gap-x-8 gap-y-12">
          {columns.map(({ icon, text }, index) => (
            <div
              key={text}
              className="animate-hero-fade-in-left min-w-0 text-white"
              style={{ animationDelay: `${0.35 + index * 0.15}s` }}
            >
              <HeroAssetIcon name={icon} />
              <p className="mt-4 text-xl leading-relaxed text-white/90">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



function HeroSlideRegulatoryFocus() {
  const columns = [
    {
      icon: "Complex & Dynamic legislative regime.svg",
      text: "Complex & Dynamic legislative regime",
    },
    {
      icon: "Greater regulatory oversight.svg",
      text: "Greater regulatory oversight",
    },
    {
      icon: "Focus on ESG and Materiality.svg",
      text: "Focus on ESG and Materiality",
    },
    {
      icon: "Increased reporting obligations (1).svg",
      text: "Increased reporting obligations",
    },
  ];

  return (
    <div className={landingHeroSlideClassName()}>
      <div className="flex h-full flex-col justify-center">
        <h2
          className="animate-hero-fade-in-left text-[64px] font-bold leading-[1.12] text-white"
          style={{ animationDelay: "0.15s" }}
        >
          Need for focus on regulatory compliance
        </h2>

        <div className="mt-10 grid grid-cols-2 gap-x-10 gap-y-8 lg:grid-cols-4">
          {columns.map(({ icon, text }, index) => (
            <div
              key={text}
              className="animate-hero-fade-in-left min-w-0 text-white"
              style={{ animationDelay: `${0.35 + index * 0.15}s` }}
            >
              <HeroAssetIcon name={icon} />
              <p className="mt-4 text-xl leading-relaxed text-white/90">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroSlideZeroTolerance() {
  const columns = [
    {
      icon: "Compliance is everyone's responsibility.svg",
      text: "Compliance is everyone's responsibility",
    },
    {
      icon: "Follow regulations.svg",
      text: "Follow regulations, policies and procedures",
    },
    {
      icon: "Prevent risk.svg",
      text: "Prevent risks before they become issues",
    },
    {
      icon: "No Compromise.svg",
      text: "No shortcuts - no exceptions - No compromises",
    },
  ];

  return (
    <div className={landingHeroSlideClassName()}>
      <div className="flex h-full flex-col justify-center">
        <h2
          className="animate-hero-fade-in-left whitespace-nowrap text-[64px] font-bold leading-[1.12] text-white"
          style={{ animationDelay: "0.15s" }}
        >
          Zero Tolerance for Non-Compliance
        </h2>

        <div className="mt-10 grid grid-cols-2 gap-x-10 gap-y-8 lg:grid-cols-4">
          {columns.map(({ icon, text }, index) => (
            <div
              key={text}
              className="animate-hero-fade-in-left min-w-0 text-white"
              style={{ animationDelay: `${0.35 + index * 0.15}s` }}
            >
              <HeroAssetIcon name={icon} />
              <p className="mt-4 text-xl leading-relaxed text-white/90">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroSlideComplianceFramework() {
  const columns = [
    {
      icon: "Compliance Commiitee .svg",
      text: "Compliance Committee",
    },
    {
      icon: "Compliance Leaders.svg",
      text: "Compliance Leaders",
    },
    {
      icon: "Compliance Champions.svg",
      text: "Compliance Champions",
    },
    {
      icon: "Early Warning System.svg",
      text: "Early Warning System",
    },
    {
      icon: "Building Compliance in Design (1).svg",
      text: "Building Compliance in Design",
    },
    {
      icon: "desktop audits (2).svg",
      text: "3G and Desktop Audit",
    },
  ];

  return (
    <div className={landingHeroSlideClassName()}>
      <div className="flex h-full flex-col justify-center">
        <h2
          className="animate-hero-fade-in-left text-[64px] font-bold leading-[1.12] text-white"
          style={{ animationDelay: "0.15s" }}
        >
          Compliance Management Framework
        </h2>

        <div className="mt-12 grid grid-cols-3 gap-x-8 gap-y-12">
          {columns.map(({ icon, text }, index) => (
            <div
              key={text}
              className="animate-hero-fade-in-left min-w-0 text-white"
              style={{ animationDelay: `${0.35 + index * 0.15}s` }}
            >
              <HeroAssetIcon name={icon} />
              <p className="mt-4 text-xl leading-relaxed text-white/90">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const HERO_SLIDE_CONTENT = [
  HeroSlideAcceleration,
  HeroSlideCompliance,
  HeroSlideEthicsIntegrity,
  HeroSlideRegulatoryFocus,
  HeroSlideZeroTolerance,
  HeroSlideComplianceFramework,
];

function LeadershipDots({ total, active, onSelect }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          type="button"
          aria-label={`Go to quote ${index + 1}`}
          onClick={() => onSelect(index)}
          className={`rounded-full transition-all ${
            index === active
              ? "h-3.5 w-7 bg-gradient-to-r from-[#8b5cf6] to-[#2563eb]"
              : "size-3.5 bg-gradient-to-r from-[#8b5cf6]/15 to-[#2563eb]/15"
          }`}
        />
      ))}
    </div>
  );
}

function CarouselArrow({ direction, onClick, size = "lg" }) {
  return (
    <CarouselNavButton
      direction={direction}
      onClick={onClick}
      size={size}
      variant={size === "sm" ? "outline" : "glass"}
    />
  );
}

function PillarCircle({ tintColor, icon, iconAsset, label, tagline, description }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="group flex min-w-0 items-center gap-4 rounded-2xl text-left outline-none transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#2563eb]/35"
        >
          <div className="relative size-[120px] shrink-0" aria-hidden>
            <img
              src="/assets/landing/pillars/pillar-base.png"
              alt=""
              className="absolute inset-0 size-full object-contain"
            />
            <div
              className="absolute inset-0 rounded-full mix-blend-color"
              style={{ backgroundColor: tintColor }}
            />
            {/* Slide-sized artwork from landing-page-icons needs HeroAssetIcon
                to crop it to the drawing before it can sit in the circle. */}
            {iconAsset ? (
              <HeroAssetIcon
                name={iconAsset}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              />
            ) : (
              <img
                src={icon}
                alt=""
                className="absolute left-1/2 top-1/2 size-[52px] -translate-x-1/2 -translate-y-1/2 object-contain"
              />
            )}
          </div>
          <span
            className="min-w-0 text-[28px] font-bold leading-tight transition group-hover:opacity-90"
            style={{ color: MARUTI_BLUE }}
          >
            {label}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        sideOffset={16}
        className="w-[min(380px,calc(100vw-2rem))] max-w-[380px] overflow-hidden rounded-2xl border border-[#e8eaf6] bg-white p-0 text-left text-[#171c4d] shadow-[0_16px_40px_rgba(23,28,143,0.16)]"
      >
        <div
          className="px-6 pb-5 pt-5"
          style={{
            background:
              "linear-gradient(180deg, rgba(23, 28, 143, 0.04) 0%, rgba(255, 255, 255, 0) 100%)",
          }}
        >
          <div className="flex items-start gap-3.5">
            <span
              className="mt-1.5 h-9 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: tintColor || MARUTI_BLUE }}
              aria-hidden
            />
            <div className="min-w-0 flex-1 space-y-2.5">
              <p
                className="text-[22px] font-extrabold leading-tight tracking-tight"
                style={{ color: MARUTI_BLUE }}
              >
                {label}
              </p>
              {tagline ? (
                <p
                  className="text-[15px] font-semibold leading-snug"
                  style={{ color: ELECTRIC_BLUE }}
                >
                  {tagline}
                </p>
              ) : null}
            </div>
          </div>

          {description ? (
            <>
              <div
                className="my-4 h-px w-full bg-gradient-to-r from-[#171c8f]/15 via-[#8b5cf6]/25 to-[#00b6fd]/15"
                aria-hidden
              />
              <p className="text-justify text-[14.5px] font-normal leading-[1.65] text-black/70">
                {description}
              </p>
            </>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function ImagePlaceholder({ image, className = "" }) {
  return (
    <div
      className={`shrink-0 overflow-hidden bg-slate-100/60 ${className}`}
      aria-hidden
    >
      {image && (
        <img
          src={image}
          alt=""
          className="size-full object-contain object-center"
        />
      )}
    </div>
  );
}

export default function LandingPage2() {
  const navigate = useNavigate();
  const { navigateToApp, requireLogin, isAuthenticated } = useAuthNavigation();
  const navigateToLanding = (path) => {
    const landingPath = toLandingPath(path);
    if (requireLogin && !isAuthenticated) {
      navigateToApp(landingPath);
      return;
    }
    navigate(landingPath);
  };
  const openKnowledgeHub = (typeLabel) => {
    const type = LANDING_KH_ITEM_TYPES[typeLabel];
    const hubPath = type
      ? `${LANDING_V2_BASE}/knowledge-hub?type=${encodeURIComponent(type)}`
      : toLandingPath("/knowledgeHub");
    if (requireLogin && !isAuthenticated) {
      navigateToApp(hubPath);
      return;
    }
    navigate(hubPath);
  };
  const [framedLeadershipIndex, setFramedLeadershipIndex] = useState(0);
  const [latestNewsSlides, setLatestNewsSlides] = useState([]);
  const [newsViewerIndex, setNewsViewerIndex] = useState(null);
  const [newlyAdded, setNewlyAdded] = useState([]);
  const heroTotal = HERO_SLIDES.length;
  const leadershipTotal = LEADERSHIP_SLIDES.length;
  const {
    trackIndex: heroTrackIndex,
    logicalIndex: heroIndex,
    enableTransition: heroTransition,
    resumeVersion: heroResumeVersion,
    next: nextHero,
    prev: prevHero,
    goToLogical: goToHero,
    onTransitionEnd: onHeroTransitionEnd,
    buildTrackItems,
  } = useLoopingCarousel({
    total: heroTotal,
    slideMs: HERO_SLIDE_MS,
  });
  const {
    trackIndex: leadershipTrackIndex,
    logicalIndex: leadershipIndex,
    enableTransition: leadershipTransition,
    resumeVersion: leadershipResumeVersion,
    next: nextLeadership,
    prev: prevLeadership,
    goToLogical: goToLeadership,
    onTransitionEnd: onLeadershipTransitionEnd,
  } = useLoopingCarousel({
    total: leadershipTotal,
    slideMs: LEADERSHIP_SLIDE_MS,
  });
  const heroTrackSlides = useMemo(
    () => buildTrackItems(HERO_SLIDES),
    [buildTrackItems],
  );
  const leadershipTrackSlides = useMemo(
    () => buildTrackItems(LEADERSHIP_SLIDES),
    [buildTrackItems],
  );
  const newsSlides = latestNewsSlides;
  const newsViewerSlide =
    newsViewerIndex !== null ? newsSlides[newsViewerIndex] : null;
  const newsViewerMedia = newsSlides.map((slide) => ({
    id: slide.id,
    type: "image",
    url: slide.image,
    thumbnailUrl: slide.image,
  }));

  useEffect(() => {
    if (document.hidden) return undefined;
    const timer = setTimeout(() => {
      nextHero();
    }, 6000);
    return () => clearTimeout(timer);
  }, [heroIndex, heroResumeVersion, nextHero]);

  useEffect(() => {
    if (document.hidden) return undefined;
    const timer = setTimeout(() => {
      nextLeadership();
    }, 10000);
    return () => clearTimeout(timer);
  }, [leadershipIndex, leadershipResumeVersion, nextLeadership]);

  useEffect(() => {
    setFramedLeadershipIndex(-1);
    const timer = setTimeout(
      () => setFramedLeadershipIndex(leadershipIndex),
      LEADERSHIP_SLIDE_MS,
    );
    return () => clearTimeout(timer);
  }, [leadershipIndex]);

  useEffect(() => {
    let cancelled = false;

    const loadHomeData = async () => {
      const [whatsNewResult, galleryResult] = await Promise.allSettled([
        getWhatsNew({ page: 1, page_size: 6 }),
        getDocumentGallery({
          document_type: "Latest News and Announcements",
          page: 1,
          page_size: 10,
        }),
      ]);
      if (cancelled) return;

      if (whatsNewResult.status === "fulfilled") {
        const whatsNewResponse = whatsNewResult.value;
        const whatsNewItems = Array.isArray(whatsNewResponse?.data)
          ? whatsNewResponse.data
          : [];
        setNewlyAdded(mapWhatsNewToNewlyAdded(whatsNewItems));
      } else {
        setNewlyAdded([]);
      }

      if (galleryResult.status === "fulfilled") {
        const galleryResponse = galleryResult.value;
        const galleryItems = Array.isArray(galleryResponse?.data)
          ? galleryResponse.data
          : [];
        setLatestNewsSlides(mapDocumentGalleryToNewsSlides(galleryItems));
      } else {
        setLatestNewsSlides([]);
      }
    };

    loadHomeData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Warm the browser cache so cloned slides do not first appear blank.
  useEffect(() => {
    const sources = [
      ...HERO_SLIDES.map((slide) => slide.background),
      ...LEADERSHIP_SLIDES.map((slide) => slide.image),
      ...latestNewsSlides.map((slide) => slide.image),
    ].filter(Boolean);

    const preloaders = sources.map((source) => {
      const image = new Image();
      image.decoding = "async";
      image.src = source;
      return image;
    });

    return () => {
      preloaders.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [latestNewsSlides]);
  const renderQuickAction = (action) => {
    const className = `relative flex h-full min-h-[118px] items-center overflow-hidden rounded-3xl pl-8 pr-0 text-left transition hover:opacity-95 ${action.span || ""}`;

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

  return (
    <LandingPageLayout landingRoutes insetContent={false}>
      {/*
        Full-bleed scale host: carousel background is 100% width.
        Hero slide text has extra inset so arrows don't overlap copy.
        Header stays outside (LandingPageLayout).
      */}
      <LandingScaledContent fullBleed>
      {/* Hero carousel — edge-to-edge background inside DesktopScaleCanvas */}
      <section className="relative h-[700px] w-full min-w-0 overflow-hidden bg-[#2563eb]">
        <div
          className="flex h-full w-full will-change-transform"
          style={{
            transform: `translate3d(-${heroTrackIndex * 100}%, 0, 0)`,
            transition: heroTransition
              ? `transform ${HERO_SLIDE_MS}ms ${CAROUSEL_EASE}`
              : "none",
          }}
          onTransitionEnd={onHeroTransitionEnd}
        >
          {heroTrackSlides.map((slide, trackPos) => {
            let realIndex = trackPos;
            if (heroTotal > 1) {
              if (trackPos === 0) realIndex = heroTotal - 1;
              else if (trackPos === heroTrackSlides.length - 1) realIndex = 0;
              else realIndex = trackPos - 1;
            }
            const SlideContent = HERO_SLIDE_CONTENT[realIndex];
            const isActive = realIndex === heroIndex;
            return (
              <div
                key={`${slide.background}-track-${trackPos}`}
                className="relative h-full w-full min-w-0 shrink-0 grow-0 basis-full overflow-hidden"
                aria-hidden={!isActive}
              >
                <img
                  src={slide.background}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                  loading="eager"
                  decoding="async"
                  fetchPriority={realIndex === 0 ? "high" : "auto"}
                  draggable={false}
                />
                <div className="pointer-events-none absolute inset-0 z-[2] bg-[#2563eb]/10" />
                <div className="absolute inset-0 z-[3]">
                  <SlideContent />
                </div>
              </div>
            );
          })}
        </div>

        <div className="absolute left-10 top-1/2 z-20 -translate-y-1/2 sm:left-12">
          <CarouselArrow
            direction="prev"
            onClick={prevHero}
          />
        </div>
        <div className="absolute right-8 top-1/2 z-20 -translate-y-1/2 sm:right-10">
          <CarouselArrow
            direction="next"
            onClick={nextHero}
          />
        </div>

        <HeroDots total={heroTotal} active={heroIndex} onSelect={goToHero} />
      </section>

      <div className={landingPageContentClassName("pb-16 pt-20")}>
        {/* Leadership + Latest News — Figma 677:13576 (539 : 1061, gap 80) */}
        <section className="grid h-[692px] w-full min-w-0 grid-cols-[minmax(0,539fr)_minmax(0,1061fr)] items-stretch gap-20">
          {/* Leadership Speaks — 677:13577 */}
          {/* pb matches the news panel's bottom padding so both carousel
              control rows (and their arrows) sit on the same baseline. */}
          <div className="flex h-full min-h-0 min-w-0 flex-col pb-[26px]">
            <h2 className="shrink-0 text-[40px] font-extrabold leading-none text-[#171c8f]">
              Tone at the <span className="text-[#2563eb]">Top</span>
            </h2>
            <p className="mt-3 shrink-0 text-[20px] font-normal leading-normal text-[#6b7399]">
              Compliance begins with conviction at the highest level
            </p>

            <div className="mt-6 flex min-h-0 w-full flex-1 flex-col gap-5">
              <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-3xl">
                <div
                  className="flex h-full w-full will-change-transform"
                  style={{
                    transform: `translate3d(-${leadershipTrackIndex * 100}%, 0, 0)`,
                    transition: leadershipTransition
                      ? `transform ${LEADERSHIP_SLIDE_MS}ms ${CAROUSEL_EASE}`
                      : "none",
                  }}
                  onTransitionEnd={onLeadershipTransitionEnd}
                >
                  {leadershipTrackSlides.map((slide, trackPos) => {
                    let realIndex = trackPos;
                    if (leadershipTotal > 1) {
                      if (trackPos === 0) realIndex = leadershipTotal - 1;
                      else if (trackPos === leadershipTrackSlides.length - 1)
                        realIndex = 0;
                      else realIndex = trackPos - 1;
                    }
                    const isActive = realIndex === leadershipIndex;
                    const isFramed = realIndex === framedLeadershipIndex;
                    return (
                      <div
                        key={`${slide.name}-track-${trackPos}`}
                        aria-hidden={!isActive}
                        aria-live={isActive ? "polite" : undefined}
                        className={`relative h-full w-full min-w-0 shrink-0 grow-0 basis-full overflow-hidden rounded-3xl border-[1.5px] bg-gradient-to-r px-8 pb-12 pt-8 transition-[border-color] duration-300 ${
                          isFramed
                            ? "border-[#2563eb] from-[#8b5cf6]/10 to-[#2563eb]/10"
                            : "border-transparent from-[#8b5cf6]/5 to-[#2563eb]/5"
                        }`}
                      >
                        <div className="flex items-start gap-8">
                          <img
                            src={slide.image}
                            alt={slide.name}
                            className="size-[100px] shrink-0 rounded-full object-contain object-bottom"
                            loading="eager"
                            decoding="async"
                            draggable={false}
                          />
                          <div className="flex min-w-0 flex-col justify-center gap-2 pt-1.5">
                            <span
                              className={`inline-flex w-fit items-center justify-center whitespace-nowrap rounded-2xl px-4 py-[5px] text-base font-semibold ${slide.badgeClass}`}
                            >
                              {slide.role}
                            </span>
                            <p className="whitespace-nowrap text-2xl font-bold leading-[1.5] text-[#171c4d]">
                              {slide.name}
                            </p>
                          </div>
                        </div>

                        <span className="mt-7 block text-[28px] leading-none text-[#8b5cf6]">
                          &ldquo;
                        </span>
                        <p
                          className={`mt-2 text-[20px] leading-[1.55] text-black/75 ${slide.quoteClass}`}
                        >
                          {slide.quote}
                        </p>
                        <span className="mt-3 block text-right text-[28px] leading-none text-[#2563eb]">
                          &rdquo;
                        </span>

                        <div
                          className={`absolute bottom-8 left-1/2 h-1 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#2563eb] transition-[width] duration-500 ${slide.dividerWidth}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex h-[46px] shrink-0 items-center justify-between">
                <CarouselArrow
                  size="sm"
                  direction="prev"
                  onClick={prevLeadership}
                />
                <LeadershipDots
                  total={LEADERSHIP_SLIDES.length}
                  active={leadershipIndex}
                  onSelect={goToLeadership}
                />
                <CarouselArrow
                  size="sm"
                  direction="next"
                  onClick={nextLeadership}
                />
              </div>
            </div>
          </div>

          {/* Latest News & Announcements — 677:13582 */}
          <LandingSectionPanel className="flex h-full min-h-0 min-w-0 flex-col px-7 pb-[26px] pt-6 shadow-[0_10.667px_20px_rgba(23,28,143,0.08)]">
            <LatestNewsCarousel
              slides={newsSlides}
              variant="image-only"
              className="h-full min-h-0"
              imageClassName="rounded-3xl"
              autoPlayMs={12000}
              onSlideClick={(_, index) => setNewsViewerIndex(index)}
            />
          </LandingSectionPanel>
        </section>

        {/* Compliance Culture + Quick Actions — Figma 677:15269, 677:14635 */}
        <section className="mt-20 grid h-[620px] w-full min-w-0 grid-cols-[minmax(0,780fr)_minmax(0,860fr)] items-stretch gap-10">
          {/* Compliance Culture @MSIL */}
          <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-3xl bg-white p-8 shadow-[0_10.667px_37.333px_rgba(23,28,143,0.08)]">
            <h2 className="text-center text-[40px] font-extrabold leading-none text-[#171c8f]">
              Compliance Culture @MARUTI
            </h2>
            <div className="mt-8 grid flex-1 auto-rows-fr grid-cols-3 items-stretch gap-5">
              {COMPLIANCE_CULTURE.map((item) => (
                <div
                  key={item.title}
                  className="flex h-full min-w-0 flex-col overflow-hidden rounded-3xl bg-white shadow-[0_10.667px_37.333px_rgba(23,28,143,0.08)]"
                >
                  <div className="relative h-[118px] shrink-0 overflow-hidden rounded-t-3xl">
                    <ImagePlaceholder
                      image={item.icon}
                      className="absolute inset-0 size-full"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 px-4 pb-6 pt-6">
                    <p
                      className={`min-h-[24px] text-base font-semibold uppercase tracking-[2px] ${item.tagColor}`}
                    >
                      {item.tag}
                    </p>
                    <h3 className="min-h-[60px] text-xl font-bold leading-[1.5] text-[#171c4d]">
                      {item.title}
                    </h3>
                    <p className="flex-1 text-[17px] font-normal leading-[1.4] text-black/75">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions — 2 / 2 / 1 full-width */}
          <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-3xl bg-white px-6 py-8 shadow-[0_10.667px_37.333px_rgba(23,28,143,0.08)]">
            <h2 className="text-center text-[40px] font-extrabold leading-none text-[#171c8f]">
              Quick Actions
            </h2>
            <div className="mt-8 grid flex-1 auto-rows-fr grid-cols-2 gap-5">
              {QUICK_ACTIONS.map((action) => renderQuickAction(action))}
            </div>
          </div>
        </section>

        {/* Pillars + Knowledge Hub + Newly Added — same full width as sections above */}
        <section className="mt-24 w-full min-w-0">
          <div
            className="mx-auto h-1 w-full max-w-[800px] bg-gradient-to-r from-[#171c8f] via-[#8b5cf6] to-[#00b6fd] opacity-15"
            aria-hidden
          />

          {/* Pillars tighter; Knowledge Hub narrower so Newly Added can show titles. */}
          <div className="mt-20 grid w-full min-w-0 grid-cols-[1.7fr_0.8fr_1.3fr] items-start gap-6">
            <div className="min-w-0">
              <h2 className="text-[40px] font-extrabold leading-none" style={{ color: MARUTI_BLUE }}>
                Compliance Pillars
              </h2>
              <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-14">
                <TooltipProvider delayDuration={120}>
                  {COMPLIANCE_PILLARS.map((pillar) => (
                    <PillarCircle
                      key={pillar.label}
                      tintColor={pillar.tintColor}
                      icon={pillar.icon}
                      iconAsset={pillar.iconAsset}
                      label={pillar.label}
                      tagline={pillar.tagline}
                      description={pillar.description}
                    />
                  ))}
                </TooltipProvider>
              </div>
            </div>

            <div className="min-w-0">
              <button
                type="button"
                onClick={() => navigateToLanding("/knowledgeHub")}
                className="text-left text-[40px] font-extrabold leading-none transition hover:opacity-80"
                style={{ color: MARUTI_BLUE }}
              >
                Knowledge Hub
              </button>
              <div className="mt-8 flex flex-col gap-5">
                {LANDING_KNOWLEDGE_HUB_ORDER.map((sourceLabel) => {
                  const item = KNOWLEDGE_HUB_ITEMS.find((entry) => entry.label === sourceLabel);
                  const presentation = KNOWLEDGE_HUB_PRESENTATION[sourceLabel];
                  if (!item || !presentation) return null;
                  return (
                    <button
                      key={sourceLabel}
                      type="button"
                      onClick={() => openKnowledgeHub(sourceLabel)}
                      className="flex h-20 w-full items-center overflow-hidden rounded-3xl bg-white text-left shadow-[0_10.667px_37.333px_rgba(23,28,143,0.08)] transition hover:-translate-y-0.5"
                    >
                      <span className={`flex size-20 shrink-0 items-center justify-center rounded-3xl ${presentation.tint}`}>
                        <img src={item.icon} alt="" className="size-8 object-contain" />
                      </span>
                      <span className="ml-5 min-w-0 truncate text-xl font-bold text-[#171c4d]">
                        {presentation.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex min-h-10 items-end justify-between gap-4">
                <h2 className="text-[40px] font-extrabold leading-none" style={{ color: MARUTI_BLUE }}>
                  Newly Added
                </h2>
                <Button
                  variant="link"
                  className="h-auto shrink-0 whitespace-nowrap p-0 text-xl font-semibold"
                  style={{ color: ELECTRIC_BLUE }}
                  onClick={() => navigateToLanding("/knowledgeHub")}
                >
                  View All
                </Button>
              </div>
              <div className="mt-8 flex flex-col gap-5">
                {newlyAdded.length === 0 ? (
                  <p className="rounded-3xl border border-dashed border-[#d9d9d9] bg-white/70 px-5 py-8 text-center text-sm text-black/50">
                    No newly added documents
                  </p>
                ) : (
                  newlyAdded.map((item) => (
                    <button
                      key={item.key || item.id || item.title}
                      type="button"
                      onClick={() => {
                        const detailPath = getNewlyAddedItemPath(item);
                        if (requireLogin && !isAuthenticated) {
                          navigateToApp(detailPath);
                          return;
                        }
                        navigate(detailPath);
                      }}
                      className="relative h-20 w-full overflow-hidden rounded-3xl bg-white text-left shadow-[0_10.667px_37.333px_rgba(23,28,143,0.08)] transition hover:-translate-y-0.5"
                    >
                      <span className={`absolute left-0 top-0 h-full w-1.5 rounded-[5px] ${item.bar}`} aria-hidden />
                      <div className="absolute inset-y-0 left-[26px] right-6 flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-xl font-normal text-[#171c4d]">{item.title}</span>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-lg font-bold tracking-[2px] ${item.tagClass}`}>
                          {item.tag}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
      </LandingScaledContent>
      <EventMediaModal
        open={newsViewerIndex !== null}
        title={newsViewerSlide?.title || "Latest News & Announcements"}
        description={newsViewerSlide?.description}
        media={newsViewerMedia}
        currentIndex={newsViewerIndex || 0}
        initialExpanded
        disableCollapse
        onIndexChange={setNewsViewerIndex}
        onClose={() => setNewsViewerIndex(null)}
      />
    </LandingPageLayout>
  );
}
