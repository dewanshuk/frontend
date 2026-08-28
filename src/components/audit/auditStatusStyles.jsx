export const auditStatusStyles = {
  COMPLETED: "bg-green-400/15 text-[#009951]",
  "IN-PROGRESS": "bg-[#fff1c2] text-[#bf6a02]",
  DRAFT: "bg-[#f5f5f5] text-[#757575]",
  OPEN: "bg-blue-100 text-blue-700",
  CLOSED: "bg-green-400/15 text-[#009951]",
  OVERDUE: "bg-red-100 text-red-700",
  DUE: "bg-[#fff1c2] text-[#bf6a02]",
  "NON-COMPLIANT": "bg-[#fee9e7] text-[#c00f0c]",
  "NON COMPLIANT": "bg-[#fee9e7] text-[#c00f0c]",
};

export function AuditStatusBadge({ status, className = "" }) {
  const normalized = String(status || "").toUpperCase();
  return (
    <span
      className={`inline-flex min-w-[116px] items-center justify-center rounded-lg px-4 py-2 text-base font-semibold leading-[1.4] ${
        auditStatusStyles[normalized] || "bg-[#f5f5f5] text-[#757575]"
      } ${className}`}
    >
      {status || "—"}
    </span>
  );
}

export const riskLevelStyles = {
  LOW: "bg-green-400/15 text-[#009951]",
  MEDIUM: "bg-[#fff1c2] text-[#bf6a02]",
  HIGH: "bg-[#fee9e7] text-[#c00f0c]",
};

export function RiskLevelBadge({ level, className = "" }) {
  const normalized = String(level || "").toUpperCase();
  if (!normalized) {
    return <span className="text-base text-[#b3b3b3]">—</span>;
  }
  return (
    <span
      className={`inline-flex min-w-[88px] items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold leading-[1.4] ${
        riskLevelStyles[normalized] || "bg-[#f5f5f5] text-[#757575]"
      } ${className}`}
    >
      {level}
    </span>
  );
}
