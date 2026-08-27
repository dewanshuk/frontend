import { useEffect, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash, ArrowLeft } from "lucide-react"
import useUI from "@/hooks/useUI"

function SNo({ index }) {
  const num = String(index + 1).padStart(2, "0")
  return (
    <div className="w-12 text-center text-sm text-slate-700">{num}</div>
  )
}

export default function SelfDeclarationModal({ open, onOpenChange }) {
  const { success, warning, error, Toast } = useUI()
  const [type, setType] = useState("COBCE")
  const [rows, setRows] = useState([{ id: 1, description: "", person: "" }])

  useEffect(() => {
    if (!open) {
      setType("COBCE")
      setRows([{ id: 1, description: "", person: "" }])
    }
  }, [open])

  const addRow = () => {
    setRows((prev) => [...prev, { id: prev.length + 1, description: "", person: "" }])
  }

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const updateRow = (index, key, value) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)))
  }

  const handleSaveDraft = () => {
    // Placeholder for API integration
    try {
      success("Declaration saved as draft.")
    } catch (err) {
      error("Unable to save draft. Please try again.")
    }
  }

  const handleSubmit = () => {
    // Placeholder for API integration
    try {
      warning("Submit: API not connected yet.")
    } catch (err) {
      error("Unable to submit declaration. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Toast />
      <DialogContent className="w-full h-screen m-0 p-6 bg-white rounded-none overflow-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-lg font-semibold">Self Declaration</h1>
        </div>

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
          <p className="text-sm text-slate-700 mb-4">I have come across instance of violation of Code of Business Conduct and Ethics.</p>

          <div className="w-full overflow-auto">
            <div className="grid grid-cols-12 items-center bg-slate-100 text-xs font-semibold text-slate-700 py-2 px-3 rounded-t">
              <div className="col-span-1">ID Number</div>
              <div className="col-span-6">Brief description of the nature of violation</div>
              <div className="col-span-4">Person Responsible</div>
              <div className="col-span-1 text-center">Actions</div>
            </div>

            <div>
              {rows.map((row, idx) => (
                <div key={row.id} className="grid grid-cols-12 items-center gap-2 py-3 px-3 border-t">
                  <div className="col-span-1"><SNo index={idx} /></div>
                  <div className="col-span-6">
                    <Input
                      value={row.description}
                      onChange={(e) => updateRow(idx, "description", e.target.value)}
                      placeholder="Type here....."
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      value={row.person}
                      onChange={(e) => updateRow(idx, "person", e.target.value)}
                      placeholder="Type here"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center gap-2">
                    <button type="button" onClick={() => addRow()} className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border border-slate-300 text-blue-600 hover:bg-blue-50">
                      <Plus className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => removeRow(idx)} className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border border-slate-300 text-rose-600 hover:bg-rose-50">
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button type="button" onClick={handleSaveDraft} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">Save as Draft</Button>
            <Button type="button" onClick={() => onOpenChange(false)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">Back</Button>
            <Button type="button" onClick={handleSubmit} className="bg-blue-600 text-white hover:bg-blue-700">Submit</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
