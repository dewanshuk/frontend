const R518_REGEX = /\s*\(?\s*R5\.18\s*\)?/gi;

export const stripR5_18 = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const cleaned = raw.replace(R518_REGEX, "").replace(/\s+/g, " ").trim();
  return cleaned || raw;
};

export const getCurrentFinancialYearLabel = () => {
  const today = new Date();
  const month = today.getMonth() + 1; // 1-indexed
  const year = today.getFullYear();
  const currentFYStart = month >= 4 ? year : year - 1;
  return `${currentFYStart}-${String(currentFYStart + 1).slice(-2)}`;
};

