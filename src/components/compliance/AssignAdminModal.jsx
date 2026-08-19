import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, Loader2, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { findUsersByRole } from "@/api/userManagementApi"
import { assignComplianceAdmin } from "@/api/complianceApi"

function UserSearchSelect({ role, value, selectedLabel, onSelect, disabled }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const rootRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50)
    } else {
      setSearch("")
      setDebouncedSearch("")
    }
  }, [open])

  useEffect(() => {
    const trimmed = search.trim()
    if (trimmed.length >= 3) {
      const id = window.setTimeout(() => setDebouncedSearch(trimmed), 300)
      return () => window.clearTimeout(id)
    }
    setDebouncedSearch("")
  }, [search])

  const fetchUsers = useCallback(async (query) => {
    if (!role) {
      setUsers([])
      return
    }

    setLoading(true)
    setError("")
    try {
      const list = await findUsersByRole({ role, query })
      setUsers(Array.isArray(list) ? list.filter((u) => u?.staff_id) : [])
    } catch (err) {
      console.error("Failed to load users for assign", err)
      setUsers([])
      setError(err?.message || "Unable to load users.")
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => {
    if (!open) return
    fetchUsers(debouncedSearch)
  }, [open, debouncedSearch, fetchUsers])

  const handleSelect = (user) => {
    onSelect?.(user)
    setOpen(false)
    setSearch("")
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onSelect?.(null)
    setSearch("")
  }

  return (
    <div className="relative" ref={rootRef}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev)
        }}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setOpen((prev) => !prev)
          }
        }}
        className={`min-h-[42px] w-full px-3 py-2 border rounded-lg bg-white flex items-center ${
          disabled
            ? "cursor-not-allowed border-gray-200 opacity-60"
            : "cursor-pointer border-gray-300 hover:border-blue-400"
        }`}
      >
        {value && selectedLabel ? (
          <>
            <span className="flex-1 text-sm text-gray-800 truncate">{selectedLabel}</span>
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
              aria-label="Clear selected user"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <span className="flex-1 text-sm text-gray-400">Select user...</span>
        )}
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0 ml-2" />
      </div>

      {open ? (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg flex flex-col max-h-64">
          <div className="p-2 border-b flex-shrink-0">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type at least 3 characters to search..."
              className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div className="overflow-y-auto flex-1">
            {error ? (
              <div className="px-3 py-2 text-sm text-red-600">{error}</div>
            ) : null}

            {!error && users.length === 0 && !loading ? (
              <div className="px-3 py-2 text-sm text-gray-400">
                {search.trim().length > 0 && search.trim().length < 3
                  ? "Enter at least 3 characters to search"
                  : "No users found"}
              </div>
            ) : null}

            {users.map((user) => {
              const label = `${user.username || "-"} (${user.staff_id})`
              const isSelected = user.staff_id === value
              return (
                <button
                  key={user.staff_id}
                  type="button"
                  onClick={() => handleSelect(user)}
                  className={`w-full text-left px-3 py-2 text-sm truncate hover:bg-blue-50 ${
                    isSelected ? "bg-blue-50 font-medium text-blue-700" : "text-gray-800"
                  }`}
                >
                  {label}
                </button>
              )
            })}

            {loading ? (
              <div className="flex justify-center py-2">
                <Loader2 size={16} className="animate-spin text-gray-400" />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function AssignAdminModal({
  open,
  onOpenChange,
  request,
  role,
  onShowToast,
  onSuccess,
}) {
  const [selectedUser, setSelectedUser] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const recordId = request?.requestId || request?.id || ""
  const selectedLabel = selectedUser
    ? `${selectedUser.username || "-"} (${selectedUser.staff_id})`
    : ""

  useEffect(() => {
    if (!open) {
      setSelectedUser(null)
      setIsSubmitting(false)
    }
  }, [open])

  const handleClose = () => {
    if (isSubmitting) return
    onOpenChange?.(false)
  }

  const handleAssign = async () => {
    if (!recordId || !selectedUser?.staff_id || isSubmitting) return

    setIsSubmitting(true)
    try {
      await assignComplianceAdmin({
        recordId,
        staffId: selectedUser.staff_id,
      })
      onShowToast?.(
        "success",
        `Admin assigned successfully to ${selectedUser.username || selectedUser.staff_id}.`,
      )
      onSuccess?.()
      onOpenChange?.(false)
    } catch (err) {
      console.error("Failed to assign admin", err)
      onShowToast?.("error", err?.message || "Failed to assign admin.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const canAssign = Boolean(recordId && selectedUser?.staff_id && role && !isSubmitting)

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next) handleClose()
      else onOpenChange?.(next)
    }}>
      <DialogContent className="max-w-md w-full bg-white">
        <DialogHeader>
          <DialogTitle>Assign Admin</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {recordId ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs font-semibold text-slate-500">Request ID</div>
              <div className="mt-0.5 text-sm font-medium text-slate-800 break-all">{recordId}</div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black">Select User</label>
            <UserSearchSelect
              role={role}
              value={selectedUser?.staff_id || ""}
              selectedLabel={selectedLabel}
              onSelect={setSelectedUser}
              disabled={isSubmitting || !role}
            />
            {!role ? (
              <p className="text-xs text-red-600">
                Assign is not available for this request type.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-9 px-4 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={!canAssign}
            className="h-9 px-4 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? "Assigning..." : "Assign"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
