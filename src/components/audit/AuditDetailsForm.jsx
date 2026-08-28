import { useCallback, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import DateRangePicker from "../../atoms/date-range-picker";
import SearchableMultiSelectPicker from "@/atoms/searchable-multi-select-picker";
import {
  listDepartmentOptions,
  searchAuditorsForAudit,
  searchAuditeesForAudit,
} from "@/api/userManagementApi";
import { extractStaffId, isAuditDepartmentLocked } from "@/utils/auditHelpers";

const ALLOWED_EXTENSIONS = [
  ".png",
  ".pdf",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".ppt",
  ".pptx",
  ".tiff",
  ".xlsx",
  ".xls",
];
const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;
const MAX_REPORT_FILES = 6;
const MAX_PEOPLE = 5;

/** Normalise auditors/auditees into picker values `{ id, name }`. */
export function toPeoplePickerValues(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        const name = item.trim();
        if (!name) return null;
        return { id: extractStaffId(name) || name, name };
      }
      const staffId = String(
        item.staff_id ?? item.staffId ?? item.id ?? extractStaffId(item.name) ?? "",
      ).trim();
      const username = String(item.username ?? item.name ?? "").trim();
      if (!staffId && !username) return null;
      const id = staffId || username;
      const name =
        username && staffId && !username.includes(`(${staffId})`)
          ? `${username} (${staffId})`
          : username || staffId;
      return { id, name };
    })
    .filter(Boolean);
}

export default function AuditDetailsForm({
  audit,
  onFieldChange,
  readOnly = false,
  fieldErrors = {},
}) {
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const fetchDepartments = useCallback(async () => {
    try {
      return await listDepartmentOptions();
    } catch {
      return [];
    }
  }, []);

  const fetchAuditors = useCallback(async (searchTerm) => {
    try {
      // GET usersfind?role=is_audit_lead (& query when ≥ 3 chars)
      return await searchAuditorsForAudit(searchTerm);
    } catch {
      return [];
    }
  }, []);

  const fetchAuditees = useCallback(async (searchTerm) => {
    try {
      // GET usersfind (no role) — list on open; query only when ≥ 3 chars
      return await searchAuditeesForAudit(searchTerm);
    } catch {
      return [];
    }
  }, []);

  if (!audit) return null;

  const departmentValues = audit.vertical_div_deptt
    ? [
        {
          id: audit.vertical_div_deptt,
          name: audit.vertical_div_deptt,
        },
      ]
    : [];
  const auditorValues = toPeoplePickerValues(audit.auditors ?? audit.auditor);
  const auditeeValues = toPeoplePickerValues(audit.auditees ?? audit.auditee);

  const handleFileUpload = (fileList) => {
    if (readOnly) return;
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const existing = audit.reports || [];
    const remaining = Math.max(0, MAX_REPORT_FILES - existing.length);
    if (remaining <= 0) {
      setUploadError(`Maximum ${MAX_REPORT_FILES} files allowed.`);
      return;
    }

    const accepted = [];
    let typeError = false;
    let sizeError = false;

    for (const file of files.slice(0, remaining)) {
      const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        typeError = true;
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        sizeError = true;
        continue;
      }
      accepted.push(file);
    }

    if (typeError) {
      setUploadError(
        "Supported formats: pptx, ppt, xlsx, xls, pdf, png, jpg, jpeg, gif, tiff, bmp only.",
      );
    } else if (sizeError) {
      setUploadError("Maximum file size is 30MB per file.");
    } else if (files.length > remaining) {
      setUploadError(`Maximum ${MAX_REPORT_FILES} files allowed.`);
    } else {
      setUploadError("");
    }

    if (!accepted.length) return;

    const uploadedOn = new Date()
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toUpperCase();

    onFieldChange?.("reports", [
      ...existing,
      ...accepted.map((file, index) => ({
        id: `report-${Date.now()}-${index}`,
        uploaded_on: uploadedOn,
        file_name: file.name,
        file,
        isExisting: false,
        uploaded_by: file.uploaded_by || "",
      })),
    ]);
  };

  const removeReport = (reportId) => {
    if (readOnly) return;
    onFieldChange?.(
      "reports",
      (audit.reports || []).filter((report) => report.id !== reportId),
    );
    setDeleteConfirmId(null);
  };

  const fieldBg = readOnly ? "bg-[#f5f5f5]" : "bg-white";
  const errorClass = "mt-1 text-sm text-red-600";
  // After publish (non-draft with a department already set), department is locked.
  const departmentLocked = readOnly || isAuditDepartmentLocked(audit);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:gap-10">
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-base font-semibold text-[#1e1e1e]">
            Audit ID
          </label>
          <input
            type="text"
            value={audit.display_audit_id || audit.audit_id || "—"}
            readOnly
            className="h-[41px] w-full rounded-lg border border-[#d9d9d9] bg-[#f5f5f5] px-4 text-base text-[#1e1e1e]"
          />
        </div>

        <div>
          <label className="mb-2 block text-base font-semibold text-[#1e1e1e]">
            Audit Name
          </label>
          <input
            type="text"
            value={audit.audit_name || ""}
            onChange={(event) => onFieldChange?.("audit_name", event.target.value)}
            placeholder="Type here..."
            readOnly={readOnly}
            className={`h-[41px] w-full rounded-lg border border-[#d9d9d9] px-4 text-base text-[#1e1e1e] outline-none placeholder:text-[#b3b3b3] focus:border-[#2563eb] ${fieldBg} ${
              readOnly ? "cursor-default" : ""
            } ${fieldErrors.audit_name ? "border-red-500" : ""}`}
          />
          {fieldErrors.audit_name ? (
            <p className={errorClass}>{fieldErrors.audit_name}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-base font-semibold text-[#1e1e1e]">
            Auditee Department
          </label>
          <SearchableMultiSelectPicker
            values={departmentValues}
            onChange={(next) => {
              if (departmentLocked) return;
              const selected = Array.isArray(next) ? next[0] : null;
              onFieldChange?.(
                "vertical_div_deptt",
                selected?.name || selected?.id || "",
              );
            }}
            fetchOptions={fetchDepartments}
            fetchOnOpenOnly
            maxSelections={1}
            placeholder="select"
            searchPlaceholder="Search departments…"
            disabled={departmentLocked}
            debounceMs={200}
            hasError={Boolean(fieldErrors.vertical_div_deptt)}
          />
          {departmentLocked && !readOnly ? (
            <p className="mt-1 text-xs text-gray-500">
              Department cannot be changed after the audit is published.
            </p>
          ) : null}
          {fieldErrors.vertical_div_deptt ? (
            <p className={errorClass}>{fieldErrors.vertical_div_deptt}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-base font-semibold text-[#1e1e1e]">
            Auditor
          </label>
          <SearchableMultiSelectPicker
            values={auditorValues}
            onChange={(next) => onFieldChange?.("auditors", next.slice(0, MAX_PEOPLE))}
            fetchOptions={fetchAuditors}
            maxSelections={MAX_PEOPLE}
            minSearchLength={0}
            placeholder="Search by name or staff ID…"
            searchPlaceholder="Type at least 3 characters to filter…"
            disabled={readOnly}
            debounceMs={350}
            hasError={Boolean(fieldErrors.auditors)}
          />
          <p className="mt-1 text-xs text-gray-500">
            Max {MAX_PEOPLE} auditors. Lists audit leads on open. Type 3+
            characters to filter. Displayed as Name (Staff ID).
          </p>
          {fieldErrors.auditors ? (
            <p className={errorClass}>{fieldErrors.auditors}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-base font-semibold text-[#1e1e1e]">
            Auditee
          </label>
          <SearchableMultiSelectPicker
            values={auditeeValues}
            onChange={(next) => onFieldChange?.("auditees", next.slice(0, MAX_PEOPLE))}
            fetchOptions={fetchAuditees}
            maxSelections={MAX_PEOPLE}
            minSearchLength={0}
            placeholder="Search by name or staff ID…"
            searchPlaceholder="Type at least 3 characters to filter…"
            disabled={readOnly}
            debounceMs={350}
            hasError={Boolean(fieldErrors.auditees)}
          />
          <p className="mt-1 text-xs text-gray-500">
            Max {MAX_PEOPLE} auditees. Opens the full employee list (no role).
            Type 3+ characters to filter. Displayed as Name (Staff ID).
          </p>
          {fieldErrors.auditees ? (
            <p className={errorClass}>{fieldErrors.auditees}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-base font-semibold text-[#1e1e1e]">
            Start &amp; End Dates
          </label>
          {readOnly ? (
            <input
              type="text"
              value={audit.date_range || "—"}
              readOnly
              className="h-[41px] w-full cursor-default rounded-lg border border-[#d9d9d9] bg-[#f5f5f5] px-4 text-base text-[#1e1e1e]"
            />
          ) : (
            <DateRangePicker
              value={audit.date_range || ""}
              onChange={(value) => onFieldChange?.("date_range", value)}
              showIcon
              placeholder="select start & end dates"
              className="w-full"
              inputClassName={
                fieldErrors.date_range ? "border-red-500" : ""
              }
            />
          )}
          {fieldErrors.date_range ? (
            <p className={errorClass}>{fieldErrors.date_range}</p>
          ) : null}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-base font-semibold text-[#1e1e1e]">
          Audit Report
        </label>

        {!readOnly ? (
          <label
            className="flex min-h-[155px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#2563eb] bg-blue-50/40 px-6 py-8 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFileUpload(event.dataTransfer.files);
            }}
          >
            <img
              src="/assets/icons/orch/file-image.svg"
              alt=""
              className="mb-4 h-12 w-12"
            />
            <p className="text-sm text-gray-700">
              Drag &amp; Drop your files here or{" "}
              <span className="font-medium text-blue-600">browse</span>
            </p>
            <p className="mt-2 text-xs text-gray-500">
              (pptx, ppt, xlsx, xls, pdf, png, jpg, jpeg, gif, tiff, bmp) · Max
              30MB · Max {MAX_REPORT_FILES} files
            </p>
            {uploadError ? (
              <p className="mt-2 text-xs text-red-500">{uploadError}</p>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_EXTENSIONS.join(",")}
              className="hidden"
              onChange={(event) => {
                handleFileUpload(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        ) : null}

        <div
          className={`${readOnly ? "" : "mt-6"} overflow-hidden rounded-xl border border-gray-200`}
        >
          <table className="w-full table-fixed">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Uploaded On
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Audit Report
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Uploaded By
                </th>
                {!readOnly ? (
                  <th className="w-24 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {(audit.reports || []).length > 0 ? (
                audit.reports.map((report) => (
                  <tr key={report.id} className="border-t border-gray-200">
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {report.uploaded_on}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {report.file_url ? (
                        <a
                          href={report.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-left font-medium text-blue-600 hover:underline"
                        >
                          {report.file_name}
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="text-left font-medium text-blue-600 hover:underline"
                        >
                          {report.file_name}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {report.uploaded_by || "—"}
                    </td>
                    {!readOnly ? (
                      <td className="px-4 py-4 text-center">
                        {deleteConfirmId === report.id ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-red-600">Delete?</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => removeReport(report.id)}
                                className="rounded bg-red-600 px-2 py-0.5 text-xs text-white"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700"
                              >
                                No
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(report.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100"
                            aria-label={`Delete ${report.file_name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={readOnly ? 3 : 4}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No audit reports uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
