export const COI_SUB_TYPES = [
  "OUTSIDE_ACTIVITY",
  "DIRECTORSHIP",
  "FINANCIAL_INTEREST",
  "REPORTING_CONFLICT",
  "GIFT",
  "PRICE_SENSITIVE_INFO",
  "OTHERS",
]

export const COI_QUESTIONS = [
  {
    title: "Engagement in any outside employment or gainful activity",
    desc: "which may conflict with the performance of my duties at MSIL or create an actual, potential or perceived conflict of interest",
  },
  {
    title: "Directorship or board membership",
    desc: "in any company or organization other than MSIL or the ones appointed by MSIL management approval",
  },
  {
    title: "Direct or indirect financial interest",
    desc: "My or my Family or any Relative in any business that competes with or provides products or services to MSIL",
  },
  {
    title: "Decision maker or in a direct reporting relationship",
    desc: "of my Family or any Relative working with MSIL as an employee or business partner",
  },
  {
    title: "Accepted or going to accept gift",
    desc: "or anything of value directly or through my Family or any Relative from a dealer, supplier, or other business partner, and/or demonstrated any favoritism towards a dealer, supplier, vendor or business partner of MSIL",
  },
  {
    title: '"Material non-public" or "price sensitive" information of MSIL',
    desc: "disclosure to a third party or use for my personal gain",
  },
  {
    title: "Others",
    desc: "",
  },
]

export const COI_FIELD_CONFIGS = [
  [
    { key: "companyName", label: "Company Name", placeholder: "(max. 25 words)", required: true },
    { key: "address", label: "Address", placeholder: "(max. 50 words)", required: true },
    { key: "typeOfActivity", label: "Type of activity", placeholder: "(max. 100 words)", required: true },
    { key: "remarks", label: "Remarks", placeholder: "(max. 100 words)", required: true },
  ],
  [
    { key: "companyName", label: "Company Name", placeholder: "(max. 25 words)", required: true },
    { key: "address", label: "Address", placeholder: "(max. 50 words)", required: true },
    { key: "typeOfDirectorship", label: "Type of Directorship", placeholder: "(max. 100 words)", required: true },
    { key: "remarks", label: "Remarks", placeholder: "(max. 100 words)", required: true },
  ],
  [
    { key: "companyName", label: "Company Name", placeholder: "(max. 25 words)", required: true },
    { key: "address", label: "Address", placeholder: "(max. 50 words)", required: true },
    { key: "detailsOfFinancialInterest", label: "Details of Financial Interest", placeholder: "(max. 100 words)", required: true },
    { key: "remarks", label: "Remarks", placeholder: "(max. 100 words)", required: true },
  ],
  [
    { key: "employeeName", label: "Employee Name", placeholder: "Type here", required: true },
    { key: "nameOfRelative", label: "Name of Relative", placeholder: "Type here", required: true },
    { key: "relative", label: "Relative", placeholder: "Type here", required: true },
    { key: "natureOfConflict", label: "Nature of Conflict", placeholder: "(max. 100 words)", required: true },
    { key: "remarks", label: "Remarks", placeholder: "(max. 100 words)", required: true },
  ],
  [
    { key: "dealerSupplier", label: "Dealer/Supplier", placeholder: "Type here", required: true },
    { key: "address", label: "Address", placeholder: "(max. 50 words)", required: true },
    { key: "detailsOfTheGift", label: "Details of the Gift", placeholder: "(max. 100 words)", required: true },
    { key: "dateWhichReceived", label: "Date which received", placeholder: "Select date", required: true, inputType: "date" },
    { key: "remarks", label: "Remarks", placeholder: "(max. 100 words)", required: true },
    { key: "employeeName", label: "Employee Name", placeholder: "Type here", required: true },
  ],
  [
    { key: "employeeName", label: "Employee Name", placeholder: "Type here", required: true },
    { key: "dateOfDisclosure", label: "Date of disclosure", placeholder: "Select date", required: true, inputType: "date" },
    { key: "informationShared", label: "Information shared", placeholder: "(max. 100 words)", required: true },
    { key: "nameOfThirdParty", label: "Name of Third Party", placeholder: "Type here", required: true },
    { key: "address", label: "Address", placeholder: "(max. 50 words)", required: true },
    { key: "remarks", label: "Remarks", placeholder: "(max. 100 words)", required: true },
  ],
  [
    { key: "remarks", label: "Remarks", placeholder: "(max. 100 words)", required: true },
  ],
]

export const toSnakeCase = (key) =>
  String(key)
    .replace(/([A-Z])/g, "_$1")
    .replace(/__/g, "_")
    .toLowerCase()

export const createEmptyCoiRow = (fields = COI_FIELD_CONFIGS[0], id = 1) => {
  const row = { id, errors: {} }
  fields.forEach((f) => {
    row[f.key] = ""
  })
  return row
}

export const buildCoiFormData = (row, fields) => {
  const formData = {}
  fields.forEach((f) => {
    formData[toSnakeCase(f.key)] = String(row?.[f.key] ?? "").trim()
  })
  return formData
}

export const areCoiRowsValid = (rows, fields) =>
  rows.every((r) => fields.every((f) => !f.required || String(r[f.key] ?? "").trim()))

/** Field config (labels/keys) for a given COI sub type, used to render submitted formData. */
export const getCoiFieldConfigBySubType = (subType) => {
  const index = COI_SUB_TYPES.indexOf(String(subType || "").toUpperCase())
  return index >= 0 ? COI_FIELD_CONFIGS[index] : null
}
