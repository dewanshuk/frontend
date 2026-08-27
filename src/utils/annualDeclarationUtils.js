/**
 * Annual declaration deep-link helpers.
 * New unified URL pattern: /compliance?type=annual&id={id}&annualType=COBCE|COI&mode={mode}&tab={tab}
 */

import { buildComplianceUrl, COMPLIANCE_TYPES } from "./complianceUrlUtils"

export const normalizeAnnualDeclarationType = (value) => {
  const key = String(value ?? "")
    .trim()
    .toUpperCase()
  return key === "COI" ? "COI" : "COBCE"
}

export const buildAnnualDeclarationPath = ({
  id,
  type = "COBCE",
  mode = "respond",
  tab = "due-to-respond",
  basePath = "/compliance",
} = {}) => {
  const declarationId = String(id ?? "").trim()
  if (!declarationId) return basePath

  return buildComplianceUrl({
    basePath,
    type: COMPLIANCE_TYPES.ANNUAL,
    id: declarationId,
    mode,
    tab,
    annualType: normalizeAnnualDeclarationType(type),
  })
}

/**
 * Map getUserDeclarationStatus payload to either a toast message or a deep-link path.
 */
export const resolveAnnualDeclarationFromStatus = (raw = {}) => {
  const data =
    raw?.data && typeof raw.data === "object" && !Array.isArray(raw.data)
      ? raw.data
      : raw

  if (data?.applicable !== true) {
    return {
      ok: false,
      message: "No active annual declaration",
    }
  }

  const id = String(data?.annual_declaration_id ?? "").trim()
  if (!id) {
    return {
      ok: false,
      message: "No active annual declaration",
    }
  }

  return {
    ok: true,
    path: buildAnnualDeclarationPath({
      id,
      type: "COBCE",
      mode: data?.completed === true ? "view" : "respond",
    }),
  }
}
