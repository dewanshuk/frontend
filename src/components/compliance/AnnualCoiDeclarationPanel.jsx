import { Input } from "@/components/ui/input"
import { COI_FIELD_CONFIGS } from "@/components/compliance/coiDeclarationConfig"

/** Annual declaration COI uses questions 1–6 (excludes "Others"). */
export const ANNUAL_COI_QUESTION_COUNT = 6

export const ANNUAL_COI_QUESTIONS = [
  "I am not engaged in any outside employment or gainful activity which may conflict with the performance of my duties at MSIL or create an actual, potential or perceived conflict of interest.",
  "I do not hold a directorship or board membership in any company or organization other than MSIL or the ones appointed by MSIL management approval.",
  "Neither I nor my Family or any Relative has a direct or indirect financial interest in any business that competes with or provides products or services to MSIL.",
  "I am not the decision maker or in a direct reporting relationship of my Family or any Relative working with MSIL as an employee or business partner.",
  "I have not directly or through my Family or any Relative accepted any expensive gift or anything of value from a dealer, supplier, or other business partner , and/or demonstrated any favoritism towards a dealer, supplier, vendor or business partner of MSIL.",
  "I have not disclosed any “material non-public” or “price sensitive” information of MSIL to a third party or used it for my personal gain.",
]

export default function AnnualCoiDeclarationPanel({
  answers,
  onAnswerChange,
  onFieldChange,
  readOnly = false,
}) {
  return (
    <div className="space-y-5">
      {ANNUAL_COI_QUESTIONS.map((question, index) => {
        const answer = answers[index]?.answer ?? null
        const form = answers[index]?.form ?? {}
        const fields = COI_FIELD_CONFIGS[index] ?? []
        const showFields = answer === "disagree"

        return (
          <div key={index} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-normal text-black">
              <span>{index + 1}</span>
              <span className="text-rose-600">*</span>
              <span> {question}</span>
            </p>

            <div className="mt-3 flex items-center gap-6">
              <label className={`inline-flex items-center gap-2 ${readOnly ? "" : "cursor-pointer"}`}>
                <input
                  type="radio"
                  name={`annual-coi-q-${index}`}
                  checked={answer === "agree"}
                  onChange={() => !readOnly && onAnswerChange(index, "agree")}
                  disabled={readOnly}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm font-normal text-black">Agree</span>
              </label>
              <label className={`inline-flex items-center gap-2 ${readOnly ? "" : "cursor-pointer"}`}>
                <input
                  type="radio"
                  name={`annual-coi-q-${index}`}
                  checked={answer === "disagree"}
                  onChange={() => !readOnly && onAnswerChange(index, "disagree")}
                  disabled={readOnly}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm font-normal text-black">Disagree</span>
              </label>
            </div>

            {showFields ? (
              <div className="mt-4 overflow-x-auto">
                <div className="flex min-w-max gap-3">
                  {fields.map((field) => (
                    <div key={field.key} className="w-44 shrink-0">
                      <div className="text-xs font-normal text-black mb-1">
                        {field.label}
                        {field.required ? <span className="text-rose-600"> *</span> : null}
                      </div>
                      <Input
                        type={field.inputType || "text"}
                        value={form[field.key] ?? ""}
                        onChange={(e) => onFieldChange(index, field.key, e.target.value)}
                        placeholder={field.placeholder}
                        readOnly={readOnly}
                        disabled={readOnly}
                        className={`bg-white ${form.errors?.[field.key] ? "border-rose-500" : ""}`}
                      />
                      {form.errors?.[field.key] ? (
                        <div className="text-rose-600 text-xs mt-1">{form.errors[field.key]}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
