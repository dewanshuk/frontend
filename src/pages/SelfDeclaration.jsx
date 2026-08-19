import { useEffect, useState, useMemo } from "react"
import { useNavigate, useLocation, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash, ArrowLeft } from "lucide-react"
import CenterToast from "@/components/shared/CenterToast"
import LandingSectionPanel from "@/components/landing/LandingSectionPanel"
import CoiDeclarationPanel from "@/components/compliance/CoiDeclarationPanel"
import {
  COI_FIELD_CONFIGS,
  COI_SUB_TYPES,
  areCoiRowsValid,
  buildCoiFormData,
  createEmptyCoiRow,
  toSnakeCase,
} from "@/components/compliance/coiDeclarationConfig"
import { generateSimilarRequestsFromCreateResult, getSelfDeclaration, saveSelfDeclaration } from "@/api/complianceApi"
import {
  getComplianceBasePath,
  isLandingCompliancePath,
} from "@/lib/appNavigation"
import Loader from "@/atoms/loader"

function SNo({ index }) {
  const num = String(index + 1).padStart(2, "0")
  return <div className="w-12 text-center text-sm text-slate-700">{num}</div>
}

/** Preselect Declaration Type from `?type=COBCE|COI` (quick actions). */
function resolveDeclarationTypeFromQuery(raw) {
  const value = String(raw ?? "").trim().toUpperCase()
  if (value === "COI") return "COI"
  if (value === "COBCE") return "COBCE"
  return null
}

function readFormDataValue(formData, fieldKey) {
  if (!formData || typeof formData !== "object") return ""
  if (formData[fieldKey] != null && formData[fieldKey] !== "") {
    return String(formData[fieldKey])
  }
  const snake = toSnakeCase(fieldKey)
  if (formData[snake] != null && formData[snake] !== "") {
    return String(formData[snake])
  }
  return ""
}

function mapDraftToCobceRows(draft) {
  const apiRows = Array.isArray(draft?.rows) ? draft.rows : []
  if (apiRows.length > 0) {
    return {
      cobceChoice: "other",
      rows: apiRows.map((row, index) => ({
        id: index + 1,
        description: String(row?.natureOfViolation ?? row?.nature_of_violation ?? "").trim(),
        person: String(row?.personResponsible ?? row?.person_responsible ?? "").trim(),
        errors: {},
      })),
    }
  }

  const description = String(draft?.description ?? "").trim()
  return {
    cobceChoice: "self",
    rows: [{ id: 1, description, person: "", errors: {} }],
  }
}

function mapDraftAttachment(file) {
  if (!file) return null
  if (typeof File !== "undefined" && file instanceof File) return file

  const name = String(
    file.filename ?? file.fileName ?? file.name ?? "",
  ).trim()
  const url = String(file.url ?? file.path ?? file.href ?? "").trim()
  if (!name && !url) return null

  return {
    name: name || "Attachment",
    filename: name || "Attachment",
    url,
    isExisting: true,
  }
}

function mapDraftToCoiState(draft) {
  const subType = String(draft?.subType ?? draft?.sub_type ?? "").trim().toUpperCase()
  const activeIndex = COI_SUB_TYPES.findIndex((value) => value === subType)
  const resolvedIndex = activeIndex >= 0 ? activeIndex : 0
  const fields = COI_FIELD_CONFIGS[resolvedIndex] ?? []
  const formData = draft?.formData ?? draft?.form_data ?? {}
  const row = createEmptyCoiRow(fields, 1)
  fields.forEach((field) => {
    row[field.key] = readFormDataValue(formData, field.key)
  })

  const rawFiles = Array.isArray(formData?.files)
    ? formData.files
    : Array.isArray(draft?.files)
      ? draft.files
      : []

  return {
    coiActiveIndex: activeIndex >= 0 ? activeIndex : null,
    coiRows: [row],
    coiFile: mapDraftAttachment(rawFiles[0]),
  }
}

export default function SelfDeclaration({ variant = "default" }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isLanding = variant === "landing" || isLandingCompliancePath(location.pathname)
  const complianceBase = getComplianceBasePath({ landing: isLanding })
  const draftIdFromQuery = String(searchParams.get("id") || "").trim()
  const typeFromQuery = resolveDeclarationTypeFromQuery(
    searchParams.get("type") ?? searchParams.get("declarationType"),
  )

  const [type, setType] = useState(() => typeFromQuery || "COBCE")
  const [rows, setRows] = useState([{ id: 1, description: "", person: "", errors: {} }])
  const [cobceChoice, setCobceChoice] = useState("other")
  const [cobceOtherType, setCobceOtherType] = useState("MSIL Employee")
  const [coiActiveIndex, setCoiActiveIndex] = useState(null)
  const [coiRows, setCoiRows] = useState([createEmptyCoiRow()])
  const [toast, setToast] = useState({ open: false, variant: "error", message: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [coiFile, setCoiFile] = useState(null)
  const [draftId, setDraftId] = useState("")
  const [isDraftLoading, setIsDraftLoading] = useState(Boolean(draftIdFromQuery))

  const activeCoiFields = coiActiveIndex != null ? COI_FIELD_CONFIGS[coiActiveIndex] ?? [] : []

  useEffect(() => {
    if (!draftIdFromQuery) {
      setDraftId("")
      setIsDraftLoading(false)
      setType(typeFromQuery || "COBCE")
      setRows([{ id: 1, description: "", person: "", errors: {} }])
      setCobceChoice("other")
      setCobceOtherType("MSIL Employee")
      setCoiActiveIndex(null)
      setCoiRows([createEmptyCoiRow()])
      setCoiFile(null)
      return
    }

    let cancelled = false
    const loadDraft = async () => {
      setIsDraftLoading(true)
      try {
        const draft = await getSelfDeclaration(draftIdFromQuery)
        if (cancelled) return

        const declarationType = String(
          draft?.declarationType ?? draft?.declaration_type ?? "",
        )
          .trim()
          .toLowerCase()
        const recordId = String(draft?.id ?? draftIdFromQuery).trim()
        setDraftId(recordId)

        if (declarationType === "coi") {
          setType("COI")
          const coiState = mapDraftToCoiState(draft)
          setCoiActiveIndex(coiState.coiActiveIndex)
          setCoiRows(coiState.coiRows)
          setCoiFile(coiState.coiFile)
          setRows([{ id: 1, description: "", person: "", errors: {} }])
          setCobceChoice("other")
        } else {
          setType("COBCE")
          const cobceState = mapDraftToCobceRows(draft)
          setCobceChoice(cobceState.cobceChoice)
          setRows(cobceState.rows)
          setCoiActiveIndex(null)
          setCoiRows([createEmptyCoiRow()])
          setCoiFile(null)
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setToast({
            open: true,
            variant: "error",
            message: err?.message || "Unable to load draft declaration.",
          })
        }
      } finally {
        if (!cancelled) setIsDraftLoading(false)
      }
    }

    loadDraft()
    return () => {
      cancelled = true
    }
  }, [draftIdFromQuery, typeFromQuery])

  const addRow = () => {
    const last = rows[rows.length - 1]
    if (cobceChoice === "self") {
      if (!String(last.description).trim()) {
        setToast({
          open: true,
          variant: "error",
          message: "Please fill the description before adding a new row.",
        })
        return
      }
    } else if (!String(last.description).trim() || !String(last.person).trim()) {
      setToast({
        open: true,
        variant: "error",
        message: "Please fill all required fields before adding a new row.",
      })
      return
    }
    setRows((prev) => [...prev, { id: prev.length + 1, description: "", person: "", errors: {} }])
  }

  const removeRow = (index) => {
    if (rows.length === 1) return
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const updateRow = (index, key, value) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)))
  }

  const validate = () => {
    let ok = true
    setRows((prev) =>
      prev.map((r) => {
        const errors = {}
        if (!String(r.description).trim()) {
          errors.description = "Required"
          ok = false
        }
        if (cobceChoice !== "self" && !String(r.person).trim()) {
          errors.person = "Required"
          ok = false
        }
        return { ...r, errors }
      }),
    )
    return ok
  }

  const validateCoiRows = () => {
    let ok = true
    const fields = activeCoiFields
    setCoiRows((prev) =>
      prev.map((r) => {
        const errors = {}
        fields.forEach((f) => {
          if (f.required && !String(r[f.key] ?? "").trim()) {
            errors[f.key] = "Required"
            ok = false
          }
        })
        return { ...r, errors }
      }),
    )
    return ok
  }

  const buildCobcePayload = (status) => {
    const payload = {
      declaration_type: "cobce",
      status,
      subType: "nature_of_violation",
      ...(draftId ? { id: draftId } : {}),
    }

    if (cobceChoice === "self") {
      payload.description = String(rows[0]?.description ?? "").trim()
      return payload
    }

    payload.rows = rows.map((row) => ({
      nature_of_violation: String(row.description ?? "").trim(),
      person_responsible: String(row.person ?? "").trim(),
    }))
    return payload
  }

  const buildCoiPayload = (status) => ({
    declaration_type: "coi",
    status,
    subType: COI_SUB_TYPES[coiActiveIndex] ?? "",
    formData: buildCoiFormData(coiRows[0], activeCoiFields),
    files: coiFile ? [coiFile] : [],
    ...(draftId ? { id: draftId } : {}),
  })

  const submitDeclaration = async (status) => {
    const payload = type === "COBCE" ? buildCobcePayload(status) : buildCoiPayload(status)
    const result = await saveSelfDeclaration(payload)
    if (status !== "draft") {
      await generateSimilarRequestsFromCreateResult(result)
    }
    // Navigate away unmounts this page's toast — show success on Compliance Helpdesk via location state.
    const message =
      status === "draft"
        ? "Self Declaration saved as draft."
        : "Self Declaration Submitted Successfully"
    navigate(complianceBase, {
      replace: true,
      state: {
        flashToast: {
          open: true,
          variant: "success",
          message,
        },
      },
    })
  }

  const handleSaveDraft = async () => {
    if (type === "COBCE") {
      if (!validate()) return
    } else {
      if (coiActiveIndex === null) return
      if (!validateCoiRows()) return
    }
    setIsSubmitting(true)
    try {
      await submitDeclaration("draft")
    } catch (err) {
      console.error(err)
      setToast({
        open: true,
        variant: "error",
        message: "Unable to save draft. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (type === "COBCE") {
      if (!validate()) return
    } else {
      if (coiActiveIndex === null) return
      if (!validateCoiRows()) return
    }
    setIsSubmitting(true)
    try {
      await submitDeclaration("submit")
    } catch (err) {
      console.error(err)
      setToast({
        open: true,
        variant: "error",
        message: "Unable to submit declaration. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const onCoiAnswerChange = (index) => {
    if (coiActiveIndex === index) {
      setCoiActiveIndex(null)
      setCoiRows([createEmptyCoiRow()])
    } else {
      setCoiActiveIndex(index)
      setCoiRows([createEmptyCoiRow(COI_FIELD_CONFIGS[index] ?? [])])
    }
  }

  const updateCoiRow = (index, key, value) => {
    setCoiRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, [key]: value, errors: { ...r.errors, [key]: undefined } }
          : r,
      ),
    )
  }

  const allCobceValid = useMemo(() => {
    if (cobceChoice === "self") {
      return rows.every((r) => String(r.description).trim())
    }
    return rows.every((r) => String(r.description).trim() && String(r.person).trim())
  }, [rows, cobceChoice])

  const allCoiValid = useMemo(() => {
    if (coiActiveIndex === null) return false
    return areCoiRowsValid(coiRows, activeCoiFields)
  }, [coiRows, coiActiveIndex, activeCoiFields])

  const content = (
    <div className={isLanding ? "max-w-full" : "max-w-full"}>
      {!isLanding && (
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => navigate(complianceBase)}
            className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-xl font-semibold">Self Declaration</h1>
        </div>
      )}

      {isLanding && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate(complianceBase)}
            className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Compliance Helpdesk
          </button>
        </div>
      )}

      {isDraftLoading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-xl border bg-white p-8">
          <Loader />
        </div>
      ) : (
        <>
          <div className="mb-4 p-4 rounded-lg bg-white border border-slate-200">
            <div className="text-sm font-medium mb-2">Declaration Type</div>
            <div className="flex items-center gap-6">
              {[
                { key: "COBCE", label: "COBCE" },
                { key: "COI", label: "COI" },
              ].map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="declarationType"
                    value={opt.key}
                    checked={type === opt.key}
                    onChange={() => setType(opt.key)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4">
            {type === "COBCE" ? (
              <>
                <div className="mb-3 space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="cobceChoice"
                      value="self"
                      checked={cobceChoice === "self"}
                      onChange={() => setCobceChoice("self")}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm">
                      I want to declare potential/ actual concern/ violation of MSIL COBCE by
                      myself
                    </span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="cobceChoice"
                      value="other"
                      checked={cobceChoice === "other"}
                      onChange={() => setCobceChoice("other")}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm">
                      I have come across instance of concern/ violation of MSIL COBCE by some
                      other person
                    </span>
                  </label>

                  {cobceChoice === "other" ? (
                    <div className="mt-2 flex items-center gap-6 ml-6">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="cobceOtherType"
                          value="MSIL Employee"
                          checked={cobceOtherType === "MSIL Employee"}
                          onChange={() => setCobceOtherType("MSIL Employee")}
                          className="w-4 h-4 accent-blue-600"
                        />{" "}
                        <span className="text-sm">MSIL Employee</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="cobceOtherType"
                          value="Others"
                          checked={cobceOtherType === "Others"}
                          onChange={() => setCobceOtherType("Others")}
                          className="w-4 h-4 accent-blue-600"
                        />{" "}
                        <span className="text-sm">Others</span>
                      </label>
                    </div>
                  ) : null}
                </div>

                <div className="w-full overflow-auto">
                  <div className="grid grid-cols-12 items-center bg-slate-100 text-xs font-semibold text-slate-700 py-2 px-3 rounded-t">
                    <div className="col-span-1">ID Number</div>
                    <div className={cobceChoice === "self" ? "col-span-11" : "col-span-6"}>
                      Brief description of the nature of violation{" "}
                      <span className="text-rose-600">*</span>
                    </div>
                    {cobceChoice === "other" ? (
                      <div className="col-span-4">
                        Person Responsible <span className="text-rose-600">*</span>
                      </div>
                    ) : null}
                    {cobceChoice === "other" ? (
                      <div className="col-span-1 text-center">Actions</div>
                    ) : null}
                  </div>

                  <div>
                    {rows.map((row, idx) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-12 items-center gap-2 py-3 px-3 border-t"
                      >
                        <div className="col-span-1">
                          <SNo index={idx} />
                        </div>
                        <div className={cobceChoice === "self" ? "col-span-11" : "col-span-6"}>
                          <Input
                            value={row.description}
                            onChange={(e) => {
                              updateRow(idx, "description", e.target.value)
                            }}
                            placeholder="Type here..... (max. 500 words)"
                            className={
                              (row.errors?.description ? "border-rose-500 " : "") +
                              "w-full rounded-md border p-2 text-sm"
                            }
                          />
                          {row.errors?.description ? (
                            <div className="text-rose-600 text-xs mt-1">
                              {row.errors.description}
                            </div>
                          ) : null}
                        </div>
                        {cobceChoice === "other" ? (
                          <>
                            <div className="col-span-4">
                              <Input
                                value={row.person}
                                onChange={(e) => updateRow(idx, "person", e.target.value)}
                                placeholder="Names, Division, Dept, Staff IDs etc."
                                className={row.errors?.person ? "border-rose-500" : ""}
                              />
                              {row.errors?.person ? (
                                <div className="text-rose-600 text-xs mt-1">
                                  {row.errors.person}
                                </div>
                              ) : null}
                            </div>
                            <div className="col-span-1 flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => addRow()}
                                className={
                                  "inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border border-slate-300 text-blue-600 hover:bg-blue-50" +
                                  (rows.length > 0 &&
                                  (!String(rows[rows.length - 1].description).trim() ||
                                    !String(rows[rows.length - 1].person).trim())
                                    ? " opacity-50 cursor-not-allowed"
                                    : "")
                                }
                                title="Add row"
                                disabled={
                                  rows.length > 0 &&
                                  (!String(rows[rows.length - 1].description).trim() ||
                                    !String(rows[rows.length - 1].person).trim())
                                }
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeRow(idx)}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border border-slate-300 text-rose-600 hover:bg-rose-50"
                                title="Delete row"
                                disabled={rows.length === 1}
                              >
                                <Trash className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSubmitting || !allCobceValid}
                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={() => navigate(complianceBase)}
                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !allCobceValid}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Submit
                  </Button>
                </div>
              </>
            ) : (
              <>
                <CoiDeclarationPanel
                  coiActiveIndex={coiActiveIndex}
                  onSelectQuestion={onCoiAnswerChange}
                  coiRows={coiRows}
                  onUpdateRow={updateCoiRow}
                  coiFile={coiFile}
                  onFileChange={setCoiFile}
                />
                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSubmitting || coiActiveIndex === null || !allCoiValid}
                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={() => navigate(complianceBase)}
                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || coiActiveIndex === null || !allCoiValid}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Submit
                  </Button>
                </div>
              </>
            )}
          </div>
        </>
      )}
      <CenterToast
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  )

  if (isLanding) {
    return (
      <div className="mx-auto w-full max-w-[1720px] min-w-0 px-6 pb-16 pt-8 md:px-10 lg:px-[80px]">
        <LandingSectionPanel className="p-6 md:p-8 lg:p-10">{content}</LandingSectionPanel>
      </div>
    )
  }

  return <div className="min-h-full bg-secondary py-6">{content}</div>
}
