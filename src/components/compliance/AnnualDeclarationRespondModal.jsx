import { useEffect, useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  FileText,
  Link2,
  Plus,
  Trash,
  UploadCloud,
} from "lucide-react"
import AnnualCoiDeclarationPanel, {
  ANNUAL_COI_QUESTION_COUNT,
} from "@/components/compliance/AnnualCoiDeclarationPanel"
import {
  COI_FIELD_CONFIGS,
  buildCoiFormData,
  createEmptyCoiRow,
  toSnakeCase,
} from "@/components/compliance/coiDeclarationConfig"
import {
  getAnnualDeclarationResponses,
  saveAnnualDeclaration,
} from "@/api/complianceApi"
import { normalizeAnnualDeclarationType } from "@/utils/annualDeclarationUtils"
import Loader from "@/atoms/loader"

const createViolationRow = (displayId = "01") => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  displayId,
  description: "",
  person: "",
  file: null,
  errors: {},
})

const createInitialCoiAnswers = () =>
  Array.from({ length: ANNUAL_COI_QUESTION_COUNT }, (_, index) => ({
    answer: null,
    form: createEmptyCoiRow(COI_FIELD_CONFIGS[index] ?? []),
  }))

const formatSerial = (index) => String(index + 1).padStart(2, "0")

const getFinancialYearEndedLabel = (financialYear) => {
  const fy = String(financialYear ?? "").trim()
  if (fy) {
    const parts = fy.split("-")
    if (parts.length >= 2) {
      const endPart = parts[1].trim()
      const endYear =
        endPart.length === 2 ? `20${endPart}` : endPart.length === 4 ? endPart : null
      if (endYear) return `March ${endYear}`
    }
  }

  const now = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return `March ${year}`
}

const readDetailValue = (details, fieldKey) => {
  if (!details || typeof details !== "object") return ""
  if (details[fieldKey] != null && details[fieldKey] !== "") {
    return String(details[fieldKey])
  }
  const snake = toSnakeCase(fieldKey)
  if (details[snake] != null && details[snake] !== "") {
    return String(details[snake])
  }
  return ""
}

const mapDeclarationDetailsToForm = (details, fields) => {
  const form = createEmptyCoiRow(fields)
  const source = Array.isArray(details) ? details[0] : details
  fields.forEach((field) => {
    form[field.key] = readDetailValue(source, field.key)
  })
  return form
}

const mapCobceDetailsToRows = (details) => {
  const list = Array.isArray(details) ? details : details ? [details] : []
  if (list.length === 0) return [createViolationRow("01")]

  const cobceRows = list.map((item, index) => ({
    
    ...createViolationRow(formatSerial(index)),
    description: String(
      item?.natureOfViolation ?? item?.nature_of_violation ?? "",
    ).trim(),
    person: String(
      item?.personResponsible ?? item?.person_responsible ?? "",
    ).trim(),
    
    file:item.files[0] && {name:item.files[0].filename}
  }))
  return cobceRows
}

const mapPrefilledCobceToRows = (prefilled = []) => {
  const cobceItems = prefilled.filter((item) => {
    const source = String(item?.source ?? "").toLowerCase()
    const questionId = String(item?.questionId ?? item?.question_id ?? "").toUpperCase()
    return source === "cobce" && questionId === "COBCE_Q1"
  })

  if (cobceItems.length === 0) return [createViolationRow("01")]

  return cobceItems.map((item, index) => {
    const details = item?.details ?? {}
    const displayId = String(
      item?.recordId ??
        item?.record_id ??
        details?.selfDeclarationId ??
        details?.self_declaration_id ??
        formatSerial(index),
    ).trim()

    return {
      ...createViolationRow(displayId || formatSerial(index)),
      displayId: displayId || formatSerial(index),
      description: String(
        details?.natureOfViolation ?? details?.nature_of_violation ?? "",
      ).trim(),
      person: String(
        details?.personResponsible ?? details?.person_responsible ?? "",
      ).trim(),
    }
  })
}

function Stepper({ step, onStepChange, allowAnyStep = false }) {
  const steps = [
    { id: 1, label: "Code of Business Conduct and Ethics", Icon: FileText },
    { id: 2, label: "Conflicts of Interest Policy", Icon: Link2 },
  ]

  return (
    <div className="mb-8 rounded-xl border border-gray-200 bg-white px-8 py-6">
      <div className="flex items-start justify-center">
        {steps.map((s, idx) => {
          const active = step === s.id
          const done = step > s.id
          const Icon = s.Icon
          const canSelect = allowAnyStep || s.id < step
          return (
            <div key={s.id} className="flex items-start">
              <button
                type="button"
                onClick={() => {
                  if (canSelect) onStepChange(s.id)
                }}
                className="flex flex-col items-center gap-2 text-center"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    active || done
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-white"
                  }`}
                >
                  {s.id}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-black">
                  <Icon className="h-4 w-4 shrink-0 text-black" />
                  <span className="font-normal whitespace-nowrap">{s.label}</span>
                </div>
              </button>

              {idx < steps.length - 1 ? (
                <div className="mx-6 mt-5 h-px w-28 shrink-0 bg-gray-300 sm:w-40 md:w-56" aria-hidden />
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AnnualDeclarationRespondModal({
  open,
  onOpenChange,
  onBack,
  request,
  readOnly = false,
  initialType = "COBCE",
  onTypeChange,
  onShowToast,
  onSuccess,
}) {
  const [step, setStep] = useState(1)
  const [cobceOption, setCobceOption] = useState("a")
  const [alreadyDeclared, setAlreadyDeclared] = useState(false)
  const [ackRead, setAckRead] = useState(false)
  const [ackInform, setAckInform] = useState(false)
  const [violationRows, setViolationRows] = useState([createViolationRow("01")])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingIds, setIsLoadingIds] = useState(false)
  const [isDraftLoading, setIsDraftLoading] = useState(false)
  const [prefilledDeclarations, setPrefilledDeclarations] = useState([])
  const [financialYear, setFinancialYear] = useState("")

  const [coiAnswers, setCoiAnswers] = useState(createInitialCoiAnswers)
  const [coiAckPolicy, setCoiAckPolicy] = useState(false)
  const [coiAckUpdate, setCoiAckUpdate] = useState(false)

  const fileInputRefs = useRef({})
  const fyLabel = useMemo(
    () => getFinancialYearEndedLabel(financialYear),
    [financialYear],
  )

  const getDeclarationId = () =>
    String(
      request?.reference_id ??
        request?.annual_declaration_id ??
        request?.requestId ??
        "",
    ).trim()

  const declarationId = getDeclarationId()

  const resetState = () => {
    setStep(1)
    setCobceOption("a")
    setAlreadyDeclared(false)
    setAckRead(false)
    setAckInform(false)
    setViolationRows([createViolationRow("01")])
    setIsSubmitting(false)
    setIsLoadingIds(false)
    setIsDraftLoading(false)
    setPrefilledDeclarations([])
    setFinancialYear("")
    setCoiAnswers(createInitialCoiAnswers())
    setCoiAckPolicy(false)
    setCoiAckUpdate(false)
  }

  const goToStep = (nextStep) => {
    const normalized = Number(nextStep) === 2 ? 2 : 1
    setStep(normalized)
    onTypeChange?.(normalized === 2 ? "COI" : "COBCE")
  }

  const applyDraftPayload = (payload) => {
    const responses = Array.isArray(payload?.responses) ? payload.responses : []
    const prefilled = Array.isArray(payload?.prefilledDeclarations)
      ? payload.prefilledDeclarations
      : Array.isArray(payload?.prefilled_declarations)
        ? payload.prefilled_declarations
        : []

    setFinancialYear(
      String(payload?.financialYear ?? payload?.financial_year ?? "").trim(),
    )
    setPrefilledDeclarations(prefilled)

    const nextCoiAnswers = createInitialCoiAnswers()
    let nextCobceOption = "a"
    let nextViolationRows = [createViolationRow("01")]
    let nextAlreadyDeclared = false
    let nextAckRead = false
    let nextAckInform = false
    let nextCoiAckPolicy = false
    let nextCoiAckUpdate = false

    responses.forEach((entry) => {
      const questionId = String(entry?.questionId ?? entry?.question_id ?? "")
        .trim()
        .toUpperCase()
      const response = String(entry?.response ?? "").trim().toLowerCase()
      const details = entry?.declarationDetails ?? entry?.declaration_details

      if (questionId === "COBCE_Q1") {
        nextAckRead = true
        nextAckInform = true
        if (response === "option_b") {
          nextCobceOption = "b"
          nextViolationRows = mapCobceDetailsToRows(details)
        } else {
          nextCobceOption = "a"
        }
        return
      }

      if (questionId === "COI_PREFACE") {
        if (response === "checked") {
          nextCoiAckPolicy = true
          nextCoiAckUpdate = true
        }
        return
      }

      const coiMatch = questionId.match(/^COI_Q(\d+)$/)
      if (!coiMatch) return

      const index = Number(coiMatch[1]) - 1
      if (index < 0 || index >= ANNUAL_COI_QUESTION_COUNT) return

      if (response === "agree" || response === "disagree") {
        const fields = COI_FIELD_CONFIGS[index] ?? []
        nextCoiAnswers[index] = {
          answer: response,
          form:
            response === "disagree"
              ? mapDeclarationDetailsToForm(details, fields)
              : createEmptyCoiRow(fields),
        }
      }
    })

    setCobceOption(nextCobceOption)
    setAlreadyDeclared(nextAlreadyDeclared)
    setAckRead(nextAckRead)
    setAckInform(nextAckInform)
    setViolationRows(nextViolationRows)
    setCoiAnswers(nextCoiAnswers)
    setCoiAckPolicy(nextCoiAckPolicy)
    setCoiAckUpdate(nextCoiAckUpdate)
  }

  useEffect(() => {
    if (!open) {
      resetState()
      return
    }

    if (!declarationId) {
      onShowToast?.("error", "Missing declaration id for this request.")
      return
    }

    let cancelled = false
    const loadResponses = async () => {
      setIsDraftLoading(true)
      try {
        const payload = await getAnnualDeclarationResponses(declarationId)
        if (cancelled) return
        applyDraftPayload(payload)
      } catch (error) {
        console.error(error)
        // New / unanswered declarations may have no saved responses yet.
        if (!cancelled && readOnly) {
          onShowToast?.(
            "error",
            error?.message ?? "Unable to load annual declaration responses.",
          )
        }
      } finally {
        if (!cancelled) setIsDraftLoading(false)
      }
    }

    loadResponses()
    return () => {
      cancelled = true
    }
  }, [open, declarationId, onShowToast, readOnly])

  useEffect(() => {
    if (!open) return
    setStep(normalizeAnnualDeclarationType(initialType) === "COI" ? 2 : 1)
  }, [open, initialType])

  const renumberLocalIds = (rows) =>
    rows.map((row, index) => ({ ...row, displayId: formatSerial(index) }))

  const fetchAlreadyDeclaredIds = async () => {
    setIsLoadingIds(true)
    try {
      if (prefilledDeclarations.length > 0) {
        setViolationRows(mapPrefilledCobceToRows(prefilledDeclarations))
        return
      }
      onShowToast?.(
        "warning",
        "No previously declared Self Declaration records were found.",
      )
      setViolationRows([createViolationRow("01")])
    } finally {
      setIsLoadingIds(false)
    }
  }

  const handleAlreadyDeclaredChange = async (checked) => {
    setAlreadyDeclared(checked)
    if (checked) {
      await fetchAlreadyDeclaredIds()
    } else {
      setViolationRows((prev) => renumberLocalIds(prev))
    }
  }

  const updateViolationRow = (index, key, value) => {
    setViolationRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, [key]: value, errors: { ...row.errors, [key]: undefined } }
          : row,
      ),
    )
  }

  const addViolationRow = () => {
    const last = violationRows[violationRows.length - 1]
    if (!String(last.description).trim() || !String(last.person).trim()) {
      onShowToast?.(
        "error",
        "Please fill description and person responsible before adding a new row.",
      )
      return
    }
    setViolationRows((prev) => {
      const next = [...prev, createViolationRow(formatSerial(prev.length))]
      return alreadyDeclared ? next : renumberLocalIds(next)
    })
  }

  const removeViolationRow = (index) => {
    if (violationRows.length === 1) return
    setViolationRows((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return alreadyDeclared ? next : renumberLocalIds(next)
    })
  }

  const validateCobceStep = () => {
    if (!ackRead || !ackInform) {
      onShowToast?.("error", "Please acknowledge both declarations before continuing.")
      return false
    }
    if (cobceOption === "b") {
      let ok = true
      setViolationRows((prev) =>
        prev.map((row) => {
          const errors = {}
          if (!String(row.description).trim()) {
            errors.description = "Required"
            ok = false
          }
          if (!String(row.person).trim()) {
            errors.person = "Required"
            ok = false
          }
          return { ...row, errors }
        }),
      )
      if (!ok) {
        onShowToast?.("error", "Please fill all required violation details.")
        return false
      }
    }
    return true
  }

  const canGoNext = useMemo(() => {
    if (!ackRead || !ackInform) return false
    if (cobceOption === "a") return true
    return violationRows.every(
      (r) => String(r.description).trim() && String(r.person).trim(),
    )
  }, [ackRead, ackInform, cobceOption, violationRows])

  const allCoiValid = useMemo(() => {
    const questionsOk = coiAnswers.every((item, index) => {
      if (item.answer !== "agree" && item.answer !== "disagree") return false
      if (item.answer === "agree") return true
      const fields = COI_FIELD_CONFIGS[index] ?? []
      return fields.every((f) => !f.required || String(item.form?.[f.key] ?? "").trim())
    })
    return questionsOk && coiAckPolicy && coiAckUpdate
  }, [coiAnswers, coiAckPolicy, coiAckUpdate])

  const handleCoiAnswerChange = (index, answer) => {
    setCoiAnswers((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        if (answer === "agree") {
          return {
            answer: "agree",
            form: createEmptyCoiRow(COI_FIELD_CONFIGS[index] ?? []),
          }
        }
        return {
          ...item,
          answer: "disagree",
          form: item.form?.id
            ? item.form
            : createEmptyCoiRow(COI_FIELD_CONFIGS[index] ?? []),
        }
      }),
    )
  }

  const handleCoiFieldChange = (index, key, value) => {
    setCoiAnswers((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              form: {
                ...item.form,
                [key]: value,
                errors: { ...item.form?.errors, [key]: undefined },
              },
            }
          : item,
      ),
    )
  }

  const buildResponses = () => {
    const responses = []

    if (cobceOption === "a") {
      responses.push({
        question_id: "COBCE_Q1",
        response: "option_a",
      })
    } else {
      responses.push({
        question_id: "COBCE_Q1",
        response: "option_b",
        declaration_details: violationRows.map((row) => ({
          nature_of_violation: String(row.description ?? "").trim(),
          person_responsible: String(row.person ?? "").trim(),
          files: row.file ? [String(row.file.name || row.file)] : [],
        })),
      })
    }

    if (coiAckPolicy && coiAckUpdate) {
      responses.push({
        question_id: "COI_PREFACE",
        response: "checked",
      })
    }

    coiAnswers.forEach((item, index) => {
      if (item.answer !== "agree" && item.answer !== "disagree") return

      const entry = {
        question_id: `COI_Q${index + 1}`,
        response: item.answer,
      }

      if (item.answer === "disagree") {
        entry.declaration_details = [
          buildCoiFormData(item.form, COI_FIELD_CONFIGS[index] ?? []),
        ]
      }

      responses.push(entry)
    })

    return responses
  }

  const persistDeclaration = async (status) => {
    if (!declarationId) {
      throw new Error("Missing declaration id for this request.")
    }

    // Collect files from violation rows (COBCE) to send as multipart attachments
    const files = violationRows
      .map((r) => r.file)
      .filter((f) => f instanceof File)

    return saveAnnualDeclaration({
      declarationId,
      status,
      responses: buildResponses(),
      files,
    })
  }

  const handleSaveDraft = async () => {
    if (step === 1 && !validateCobceStep()) return
    if (step === 2 && !allCoiValid) {
      onShowToast?.(
        "error",
        "Please answer all Conflicts of Interest questions, complete Disagree details, and tick both acknowledgements.",
      )
      return
    }

    setIsSubmitting(true)
    try {
      const result = await persistDeclaration("draft")
      onShowToast?.(
        "success",
        result?.details ?? result?.message ?? "Annual declaration saved as draft.",
      )
      onSuccess?.()
    } catch (error) {
      onShowToast?.(
        "error",
        error?.message ?? "Unable to save draft. Please try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (!validateCobceStep()) return
    goToStep(2)
  }

  const handleSubmit = async () => {
    if (!validateCobceStep()) return
    if (!allCoiValid) {
      onShowToast?.(
        "error",
        "Please answer all Conflicts of Interest questions, complete Disagree details, and tick both acknowledgements.",
      )
      return
    }
    setIsSubmitting(true)
    try {
      const result = await persistDeclaration("submit")
      onShowToast?.(
        "success",
        result?.details ?? result?.message ?? "Annual declaration submitted successfully.",
      )
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      onShowToast?.(
        "error",
        error?.message ?? "Unable to submit declaration. Please try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="fixed inset-0 z-[110] flex h-screen w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 bg-[#F3F4F6] p-0 m-0"
      >
        <DialogTitle className="sr-only">Annual Declaration</DialogTitle>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => (onBack ? onBack() : onOpenChange(false))}
                className="inline-flex items-center gap-1 shrink-0 rounded-md bg-blue-300 px-2 py-1 text-sm font-medium text-black transition-colors duration-150 hover:bg-blue-500 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <h1 className="text-xl font-semibold">Annual Declaration</h1>
            </div>

            {isDraftLoading ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-xl border bg-white p-8">
                <Loader />
              </div>
            ) : (
              <>
            <Stepper
              step={step}
              onStepChange={goToStep}
              allowAnyStep={readOnly || step === 2}
            />

            {step === 1 ? (
              <div className="rounded-xl border bg-white p-6">
                <p className="text-sm text-black mb-4">
                  I hereby confirm that during the financial year ended {fyLabel}
                </p>

                <div className="rounded-lg border border-gray-200 p-4 space-y-4">
                  <div className="text-sm text-black">(Select either option a. or b.)</div>

                  <label className={`flex items-start gap-3 ${readOnly ? "" : "cursor-pointer"}`}>
                    <input
                      type="radio"
                      name="annual-cobce-option"
                      checked={cobceOption === "a"}
                      onChange={() => !readOnly && setCobceOption("a")}
                      disabled={readOnly}
                      className="mt-1 w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-black">
                      a. I have not violated any provision of Code of Business Conduct and Ethics
                      and I have not seen any violation of the Code of Business Conduct and Ethics
                      by any person to whom this code is applicable.
                    </span>
                  </label>

                  <label className={`flex items-start gap-3 ${readOnly ? "" : "cursor-pointer"}`}>
                    <input
                      type="radio"
                      name="annual-cobce-option"
                      checked={cobceOption === "b"}
                      onChange={() => !readOnly && setCobceOption("b")}
                      disabled={readOnly}
                      className="mt-1 w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-black">
                      b. I have come across instance of violation of Code of Business Conduct and
                      Ethics.
                    </span>
                  </label>

                  {cobceOption === "b" ? (
                    <div className="pt-2 space-y-4">
                      <label className={`inline-flex items-center gap-2 ${readOnly ? "" : "cursor-pointer"}`}>
                        <input
                          type="checkbox"
                          checked={alreadyDeclared}
                          onChange={(e) =>
                            !readOnly && handleAlreadyDeclaredChange(e.target.checked)
                          }
                          disabled={readOnly}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <span className="text-sm text-black">I have already declared</span>
                      </label>

                      <div className="w-full overflow-auto">
                        <div className="grid grid-cols-12 gap-2 items-center bg-gray-100 text-xs font-semibold text-black py-2 px-3 rounded-t min-w-[900px]">
                          <div className="col-span-2">Self Declaration ID</div>
                          <div className="col-span-3">
                            Brief description of the nature of violation
                          </div>
                          <div className="col-span-3">Person Responsible</div>
                          <div className="col-span-2">Upload Documents</div>
                          <div className="col-span-2 text-center">Actions</div>
                        </div>

                        {isLoadingIds ? (
                          <div className="py-6 text-center text-sm text-black border-t">
                            Loading declaration IDs...
                          </div>
                        ) : (
                          violationRows.map((row, idx) => (
                            <div
                              key={row.key}
                              className="grid grid-cols-12 gap-2 items-start py-3 px-3 border-t min-w-[900px]"
                            >
                              <div className="col-span-2">
                                <Input
                                  value={row.displayId}
                                  readOnly
                                  className="bg-gray-50 text-black"
                                />
                              </div>
                              <div className="col-span-3">
                                <Input
                                  value={row.description}
                                  onChange={(e) =>
                                    updateViolationRow(idx, "description", e.target.value)
                                  }
                                  placeholder="Type here....."
                                  readOnly={readOnly}
                                  disabled={readOnly}
                                  className={row.errors?.description ? "border-rose-500" : ""}
                                />
                              </div>
                              <div className="col-span-3">
                                <Input
                                  value={row.person}
                                  onChange={(e) =>
                                    updateViolationRow(idx, "person", e.target.value)
                                  }
                                  placeholder="Type here"
                                  readOnly={readOnly}
                                  disabled={readOnly}
                                  className={row.errors?.person ? "border-rose-500" : ""}
                                />
                              </div>
                              <div className="col-span-2">
                                {!readOnly ? (
                                  <>
                                    <input
                                      ref={(el) => {
                                        fileInputRefs.current[row.key] = el
                                      }}
                                      type="file"
                                      className="hidden"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0] ?? null
                                        updateViolationRow(idx, "file", f)
                                        e.target.value = ""
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => fileInputRefs.current[row.key]?.click?.()}
                                      className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-2 text-xs text-blue-700 hover:bg-blue-100"
                                    >
                                      <UploadCloud className="h-4 w-4" />
                                      {row.file ? (
                                        <span className="truncate max-w-[100px]" title={row.file.name}>
                                          {row.file.name}
                                        </span>
                                      ) : (
                                        "Click Here to Upload"
                                      )}
                                    </button>
                                  </>
                                ) : (
                                  <div className="rounded-md border border-gray-200 bg-gray-50 px-2 py-2 text-xs text-black">
                                    {row.file?.name || "-"}
                                  </div>
                                )}
                              </div>
                              <div className="col-span-2 flex items-center justify-center gap-2 pt-1">
                                {!readOnly ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={addViolationRow}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-blue-600 hover:bg-blue-50"
                                      title="Add row"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeViolationRow(idx)}
                                      disabled={violationRows.length === 1}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                                      title="Delete row"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-xs text-black/50">-</span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 space-y-3">
                  <label className={`flex items-start gap-3 ${readOnly ? "" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={ackRead}
                      onChange={(e) => !readOnly && setAckRead(e.target.checked)}
                      disabled={readOnly}
                      className="mt-1 w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-black">
                      I have read and understood the Code of Business Conduct and Ethics of MSIL
                      and above declaration is true to the best of my knowledge.
                    </span>
                  </label>
                  <label className={`flex items-start gap-3 ${readOnly ? "" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={ackInform}
                      onChange={(e) => !readOnly && setAckInform(e.target.checked)}
                      disabled={readOnly}
                      className="mt-1 w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-black">
                      I also acknowledge and undertake that I will inform whenever I come across
                      any violation of the COBCE.
                    </span>
                  </label>
                </div>

                <div className="mt-8 flex items-center justify-end gap-3">
                  {readOnly ? (
                    <Button
                      type="button"
                      onClick={() => goToStep(2)}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Next
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={isSubmitting || !canGoNext}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Save as Draft
                      </Button>
                      <Button
                        type="button"
                        onClick={handleNext}
                        disabled={isSubmitting || !canGoNext}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Next
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border bg-white p-6">
                <AnnualCoiDeclarationPanel
                  answers={coiAnswers}
                  onAnswerChange={handleCoiAnswerChange}
                  onFieldChange={handleCoiFieldChange}
                  readOnly={readOnly}
                />

                <div className="mt-6 space-y-3">
                  <label className={`flex items-start gap-3 ${readOnly ? "" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={coiAckPolicy}
                      onChange={(e) => !readOnly && setCoiAckPolicy(e.target.checked)}
                      disabled={readOnly}
                      className="mt-1 w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm font-normal text-black">
                      <span className="text-rose-600">*</span>{" "}
                      I certify that I have fully read and understood the Conflicts of Interest
                      Policy and this disclosure form and state that I have not concealed anything
                      and the information provided by me is true, accurate and complete to the best
                      of my knowledge and understanding.
                    </span>
                  </label>
                  <label className={`flex items-start gap-3 ${readOnly ? "" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={coiAckUpdate}
                      onChange={(e) => !readOnly && setCoiAckUpdate(e.target.checked)}
                      disabled={readOnly}
                      className="mt-1 w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm font-normal text-black">
                      <span className="text-rose-600">*</span>{" "}
                      I also acknowledge and undertake that I will make another disclosure to state
                      any change in any matter contained in this declaration as soon as I become
                      aware of it.
                    </span>
                  </label>
                </div>

                <div className="mt-8 flex items-center justify-end gap-3">
                  {readOnly ? (
                    <Button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="bg-white border border-gray-200 text-black hover:bg-gray-50"
                    >
                      Back to COBCE
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={isSubmitting || !allCoiValid}
                        className="bg-white border border-gray-200 text-black hover:bg-gray-50"
                      >
                        Save as Draft
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !allCoiValid}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Submit
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
