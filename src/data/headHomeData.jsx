import { LANDING_V2_BASE } from "@/lib/appNavigation";

export const QUICK_ACTIONS = [
  {
    title: <div>Annual<br/>COBCE Declaration</div>,
    background:
      "linear-gradient(169deg, rgba(23, 28, 143, 0.15) 31.407%, rgba(139, 92, 246, 0.15) 48.791%, rgba(0, 182, 253, 0.15) 128.99%)",
    illustration: "coi",
    image:
      "/assets/leadership-new/Quick%20Action%20-%20COI%20Button%20Icon.svg",
    action: "annual",
  },
  {
    title: <div>Annual<br/> COI Declaration</div>,
    background:
      "linear-gradient(169deg, rgba(23, 28, 143, 0.15) 31.407%, rgba(139, 92, 246, 0.15) 48.791%, rgba(0, 182, 253, 0.15) 128.99%)",
    illustration: "cobce",
    image:
      "/assets/leadership-new/Quick%20Action%20-%20COBCE%20Button%20Icon.svg",
    action: "annual",
  },
  {
    title: <>Access <br/> ComplyShield</>,
    background:
      "linear-gradient(to bottom, rgba(68, 160, 212, 0.15), rgba(61, 69, 144, 0.15))",
    illustration: "shield",
    image: "/assets/landing/quick-actions/comply-shield.png",
    span: "col-span-2",
    href: "https://prod.legatrixnxt.in/MarutiSuzuki/#/login",
  },
  {
    title: "Ask a Query",
    background:
      "linear-gradient(-3deg, rgba(209, 31, 0, 0.15) 22.35%, rgba(245, 158, 11, 0.15) 86.58%)",
    illustration: "query",
    image: "/assets/landing/quick-actions/raise-query.png",
    span: "col-span-2",
    to: "/compliance?action=query",
  },
];

export const EMPLOYEE_DUE_FOR_ME = {
  overdue: [
    {
      id: "eo1",
      title: "Self Declaration Submission 25-26",
      status: "Overdue for 9 Days",
      tone: "overdue",
    },
    {
      id: "eo2",
      title: "Annual Compliance Training",
      status: "Overdue for 10 Days",
      tone: "overdue",
    },
    {
      id: "eo3",
      title: "Fundamentals of Data Privacy",
      status: "Overdue for 10 Days",
      tone: "overdue",
    },
  ],
  dueSoon: [
    {
      id: "ed1",
      title: "Audit 0001",
      status: "Due in 3 Days",
      tone: "soon",
    },
    {
      id: "ed2",
      title: "POSH Training",
      status: "Due in 6 Days",
      tone: "soon",
    },
  ],
};

export const EMPLOYEE_RECENT_ACTIVITIES = [
  {
    id: "ea1",
    title: "Query Title 0001",
    status: "In Progress",
    submittedOn: "12/Jan/2026",
    pendingAt: "Compliance Team",
  },
  {
    id: "ea2",
    title: "Compliant Title 0002",
    status: "In Progress",
    submittedOn: "10/Jan/2026",
    pendingAt: "Compliance Team",
  },
  {
    id: "ea3",
    title: "Gift Declaration Title 0003",
    status: "In Progress",
    submittedOn: "08/Jan/2026",
    pendingAt: "Compliance Team",
  },
];

export const EMPLOYEE_LATEST_NEWS = {
  image: "/assets/landing/news-featured.png",
  category: "Employee Awareness",
  title: "Employee Code of Conduct Explained!",
  description:
    "Learn about our values, responsibilities and expected behavior.",
};

export const DUE_FOR_ME = {
  overdue: [
    {
      id: "o1",
      title: "Self Declaration Submission 25-26",
      status: "Overdue for 9 Days",
      tone: "overdue",
    },
    {
      id: "o2",
      title: "Audit 0001",
      status: "Overdue for 5 Days",
      tone: "overdue",
    },
    {
      id: "o3",
      title: "Training Completion",
      status: "Overdue for 2 Days",
      tone: "overdue",
    },
  ],
  dueSoon: [
    {
      id: "d1",
      title: "Audit 0001",
      status: "Due in 3 Days",
      tone: "soon",
    },
    {
      id: "d2",
      title: "Annual Declaration",
      status: "Due in 5 Days",
      tone: "soon",
    },
  ],
};

export const RECENT_ACTIVITIES = [
  {
    id: "a1",
    title: "Query Title 0001",
    status: "In Progress",
    submittedOn: "12/Jan/2026",
    pendingAt: "Legal Department",
  },
  {
    id: "a2",
    title: "Complaint Title 0002",
    status: "In Progress",
    submittedOn: "10/Jan/2026",
    pendingAt: "Compliance Team",
  },
  {
    id: "a3",
    title: "Declaration Review 0003",
    status: "In Progress",
    submittedOn: "08/Jan/2026",
    pendingAt: "HR Department",
  },
];

export const KNOWLEDGE_HUB_ITEMS = [
  { label: "Policies", icon: "/assets/icons/orch/active-published.svg" },
  { label: "e-Module Trainings", icon: "/assets/icons/orch/training-material.svg" },
  { label: "Flyers", icon: "/assets/icons/orch/flyers.svg" },
  { label: "Laws", icon: "/assets/icons/orch/lawsandregulation.svg" },
  { label: "Guidance Notes", icon: "/assets/icons/orch/guidance-notes.svg" },
  { label: "Early Warnings", icon: "/assets/icons/orch/ews.svg" },
];

/** Display names + tint for Knowledge Hub tiles (same as LandingPage2). */
export const KNOWLEDGE_HUB_PRESENTATION = {
  Policies: { label: "Policies", tint: "bg-[#171c8f]/15" },
  "Guidance Notes": { label: "Guidance Notes", tint: "bg-[#8a226f]/15" },
  Laws: { label: "Law & Regulation", tint: "bg-[#2563eb]/15" },
  "e-Module Trainings": { label: "Training Resources", tint: "bg-[#00b6fd]/15" },
  Flyers: { label: "Flyers", tint: "bg-[#8b5cf6]/15" },
  "Early Warnings": { label: "Early Warnings", tint: "bg-[#bf6a02]/15" },
};

/** Tile order used on landing + authenticated home Knowledge Hub sections. */
export const KNOWLEDGE_HUB_ORDER = [
  "Policies",
  "Guidance Notes",
  "Laws",
  "e-Module Trainings",
  "Flyers",
  "Early Warnings",
];

/** Maps Knowledge Hub tile labels → document_type query (same as LandingPage2). */
export const KNOWLEDGE_HUB_ITEM_TYPES = {
  Policies: "Policies",
  "e-Module Trainings": "Training Resources",
  Flyers: "Flyers",
  Laws: "Law & Regulation",
  "Guidance Notes": "Guidance Notes",
  "Early Warnings": "Early Warnings",
};

/** Presentation tokens only (colors) — not content. Used when mapping API whats-new items. */
export const NEWLY_ADDED_STYLES = [
  { bar: "bg-[#171c8f]", tagClass: "bg-[#171c8f]/15 text-[#171c8f]" },
  { bar: "bg-[#2563eb]", tagClass: "bg-[#2563eb]/15 text-[#2563eb]" },
  { bar: "bg-[#8b5cf6]", tagClass: "bg-[#8b5cf6]/15 text-[#8b5cf6]" },
  { bar: "bg-[#00b6fd]", tagClass: "bg-[#00b6fd]/15 text-[#00b6fd]" },
  { bar: "bg-[#8a226f]", tagClass: "bg-[#8a226f]/15 text-[#8a226f]" },
  { bar: "bg-[#bf6a02]", tagClass: "bg-[#bf6a02]/15 text-[#bf6a02]" },
];

const NEWLY_ADDED_TYPE_STYLES = {
  policy: NEWLY_ADDED_STYLES[0],
  policies: NEWLY_ADDED_STYLES[0],
  law: NEWLY_ADDED_STYLES[1],
  laws: NEWLY_ADDED_STYLES[1],
  "law & regulation": NEWLY_ADDED_STYLES[1],
  "laws & regulation": NEWLY_ADDED_STYLES[1],
  "laws and regulation": NEWLY_ADDED_STYLES[1],
  "law and regulation": NEWLY_ADDED_STYLES[1],
  flyer: NEWLY_ADDED_STYLES[2],
  flyers: NEWLY_ADDED_STYLES[2],
  training: NEWLY_ADDED_STYLES[3],
  "training resources": NEWLY_ADDED_STYLES[3],
  "e-module trainings": NEWLY_ADDED_STYLES[3],
  note: NEWLY_ADDED_STYLES[4],
  "guidance notes": NEWLY_ADDED_STYLES[4],
  "early warnings": NEWLY_ADDED_STYLES[5],
  "early warning": NEWLY_ADDED_STYLES[5],
  "early warning system": NEWLY_ADDED_STYLES[5],
  ews: NEWLY_ADDED_STYLES[5],
};

export const getNewlyAddedStyle = (documentType, index = 0) => {
  const key = String(documentType || "")
    .trim()
    .toLowerCase();
  return (
    NEWLY_ADDED_TYPE_STYLES[key] ||
    NEWLY_ADDED_STYLES[index % NEWLY_ADDED_STYLES.length]
  );
};

/**
 * Short display labels for Newly Added row tags (UI only; routing still uses documentType).
 * Early warning system → EWS, Laws and regulation → Law, Flyers → Flyer
 */
export const formatNewlyAddedTag = (documentType) => {
  const raw = String(documentType || "").trim();
  if (!raw) return "DOCUMENT";
  const lower = raw.toLowerCase();
  const compact = lower.replace(/[\s/_&-]+/g, "");

  if (
    lower.includes("early warning") ||
    compact === "ews" ||
    lower === "early warnings"
  ) {
    return "EWS";
  }
  if (lower.includes("flyer")) {
    return "FLYER";
  }
  if (lower.includes("law") || compact.includes("regulation")) {
    return "LAW";
  }
  if (lower.includes("polic")) return "POLICY";
  if (lower.includes("training") || lower.includes("e-module")) return "TRAINING";
  if (lower.includes("guidance") || lower.includes("note")) return "NOTE";

  return raw.toUpperCase();
};

/** Map whats-new API rows into Newly Added list items (presentation + detail route fields). */
export const mapWhatsNewToNewlyAdded = (items = []) =>
  (Array.isArray(items) ? items : []).slice(0, 6).map((item, index) => {
    const documentType =
      String(item?.document_type || item?.type || "Document").trim() || "Document";
    const style = getNewlyAddedStyle(documentType, index);
    const id =
      item?.id ??
      item?.document_id ??
      item?.uuid ??
      item?.document_uuid ??
      null;

    return {
      id: id != null && String(id).trim() ? String(id).trim() : null,
      key: id != null && String(id).trim() ? String(id).trim() : `whats-new-${index}`,
      title: item?.name || "Untitled",
      documentType,
      tag: formatNewlyAddedTag(documentType),
      bar: style.bar,
      tagClass: style.tagClass,
    };
  });

/** Detail route: /v2/knowledge-hub/:type/:uuid */
export const getNewlyAddedItemPath = (item) => {
  if (!item?.id) return `${LANDING_V2_BASE}/knowledge-hub`;
  const type = encodeURIComponent(item.documentType || item.type || "Document");
  return `${LANDING_V2_BASE}/knowledge-hub/${type}/${encodeURIComponent(item.id)}`;
};

/** @deprecated Prefer live API data via getWhatsNew. Kept for LandingPage2 until migrated. */
export const NEWLY_ADDED = [
  {
    title: "Data Privacy Policy",
    tag: "POLICY",
    ...NEWLY_ADDED_STYLES[0],
  },
  {
    title: "Factories Act [1948]",
    tag: "LAW",
    ...NEWLY_ADDED_STYLES[1],
  },
  {
    title: "Employee Code of Conduct",
    tag: "FLYER",
    ...NEWLY_ADDED_STYLES[2],
  },
  {
    title: "Personnel Training Guide",
    tag: "TRAINING",
    ...NEWLY_ADDED_STYLES[3],
  },
  {
    title: "Staff Guidelines",
    tag: "NOTE",
    ...NEWLY_ADDED_STYLES[4],
  },
  {
    title: "Evacuation Plan",
    tag: "EWS",
    ...NEWLY_ADDED_STYLES[5],
  },
];
