import { useRef } from "react"
import { Input } from "@/components/ui/input"
import { UploadCloud, X } from "lucide-react"
import {
  COI_FIELD_CONFIGS,
  COI_QUESTIONS,
} from "@/components/compliance/coiDeclarationConfig"

export default function CoiDeclarationPanel({
  coiActiveIndex,
  onSelectQuestion,
  coiRows,
  onUpdateRow,
  coiFile,
  onFileChange,
  radioName = "coi-select",
}) {
  const coiInputRef = useRef(null)
  const activeCoiFields = coiActiveIndex != null ? COI_FIELD_CONFIGS[coiActiveIndex] ?? [] : []

  return (
    <div className="grid grid-cols-12 gap-6 items-start">
      <div className="col-span-6 space-y-3">
        {COI_QUESTIONS.map((q, i) => (
          <div key={i} className="flex items-start gap-3 p-3 border rounded bg-white">
            <div className="flex-1">
              <div className="text-sm font-semibold">
                <strong>{q.title}</strong>
              </div>
              {q.desc ? <div className="text-sm text-slate-700 mt-1">{q.desc}</div> : null}
            </div>
            <div className="flex items-center flex-col gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={radioName}
                  value={i}
                  checked={coiActiveIndex === i}
                  onChange={() => onSelectQuestion(i)}
                  className="w-4 h-4 accent-blue-600"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="col-span-6 flex flex-col">
        {coiActiveIndex === null ? (
          <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Select a conflict of interest option on the left to fill in the related details.
          </div>
        ) : (
          <div className="bg-teal-900 text-white p-4 rounded mb-4">
            <div className="grid grid-cols-2 gap-4">
              {activeCoiFields.map((field) => (
                <div
                  key={field.key}
                  className={activeCoiFields.length === 1 ? "col-span-2" : undefined}
                >
                  <div className="text-sm font-semibold">
                    {field.label}
                    {field.required ? <span className="text-rose-600"> *</span> : null}
                  </div>
                  <Input
                    type={field.inputType || "text"}
                    value={coiRows[0]?.[field.key] ?? ""}
                    onChange={(e) => onUpdateRow(0, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className={`mt-2 bg-white text-black ${coiRows[0]?.errors?.[field.key] ? "border-rose-500" : ""}`}
                  />
                  {coiRows[0]?.errors?.[field.key] ? (
                    <div className="text-rose-300 text-xs mt-1">{coiRows[0].errors[field.key]}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-2">
          <div className="text-sm">Attachments</div>
          <div
            onClick={() => coiInputRef.current?.click?.()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files?.[0]
              if (f) onFileChange(f)
            }}
            className={`mt-2 flex cursor-pointer flex-col items-start gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors ${
              coiFile
                ? "border-emerald-200 bg-white"
                : "border-slate-300 bg-slate-50 hover:border-blue-400"
            }`}
          >
            <div className="flex items-center gap-3">
              <UploadCloud className="h-6 w-6 text-slate-500" />
              {coiFile ? (
                <div className="flex items-center gap-2">
                  {coiFile.url ? (
                    <a
                      href={coiFile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-700 underline underline-offset-2"
                      onClick={(ev) => ev.stopPropagation()}
                      title={coiFile.name || coiFile.filename}
                    >
                      {coiFile.name || coiFile.filename || "Attachment"}
                    </a>
                  ) : (
                    <div className="text-sm text-slate-700">
                      {coiFile.name || coiFile.filename || "Attachment"}
                    </div>
                  )}
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-slate-200"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      onFileChange(null)
                    }}
                    aria-label="Remove file"
                  >
                    <X className="h-3 w-3 text-slate-500" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-sm text-slate-700">Drag & drop or click to browse</div>
                  <div className="text-xs text-slate-400">Supports common file types</div>
                </div>
              )}
            </div>
          </div>
          <input
            ref={coiInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFileChange(f)
              e.target.value = ""
            }}
          />
        </div>
      </div>
    </div>
  )
}
