import { useCallback, useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import { ChevronDown, Check, X, Loader2 } from "lucide-react";
import DateRangePicker from "../../atoms/date-range-picker";
import MultiSelectDropdown from "../../atoms/multi-select-dropdown";
import { listUsers, buildListUsersFilterBody, getDepartments } from "../../api/userManagementApi";
import { getOrchestrationItems } from "../../api/orchestration";
import { normaliseDocTypeLabel } from "../../lib/utils";

const FILTER_INITIAL_VALUES = {
  documentType: [],
  documentName: [],
  status: [],
  owner: "",
  updated_by: "",
  lastUpdated: null,
  nextReview: null,
};

export const ORCHESTRATION_ALL_STATUSES = ["Active", "Draft", "Inactive"];

export const ORCHESTRATION_STATUS_OPTIONS = ORCHESTRATION_ALL_STATUSES.map((status) => ({
  value: status,
  label: status,
}));

/** Normalize UI status filter (array or legacy string) to API `statuses` array. */
export const statusFilterToStatuses = (status) => {
  if (Array.isArray(status)) {
    const cleaned = status.map((s) => String(s || "").trim()).filter(Boolean);
    if (cleaned.includes("All") || cleaned.includes("Both")) {
      return [...ORCHESTRATION_ALL_STATUSES];
    }
    return cleaned.filter((s) => ORCHESTRATION_ALL_STATUSES.includes(s));
  }

  const normalized = String(status || "").trim();
  if (!normalized) return [];
  if (normalized === "All" || normalized === "Both") {
    return [...ORCHESTRATION_ALL_STATUSES];
  }
  return ORCHESTRATION_ALL_STATUSES.includes(normalized) ? [normalized] : [];
};

const normalizeStatusFilterValue = (status) => {
  if (Array.isArray(status)) {
    return statusFilterToStatuses(status);
  }
  return statusFilterToStatuses(status);
};

const pickModalFilterFields = (filters) => {
  const source = filters || FILTER_INITIAL_VALUES;
  return {
    documentType: source.documentType ?? [],
    documentName: source.documentName ?? [],
    status: normalizeStatusFilterValue(source.status),
    owner: source.owner ?? "",
    updated_by: source.updated_by ?? "",
    lastUpdated: source.lastUpdated ?? null,
    nextReview: source.nextReview ?? null,
  };
};

const toComparableFilterValue = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => toComparableFilterValue(item))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = toComparableFilterValue(value[key]);
        return acc;
      }, {});
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value ?? null;
};

const areFiltersEqual = (left, right) =>
  JSON.stringify(toComparableFilterValue(pickModalFilterFields(left))) ===
  JSON.stringify(toComparableFilterValue(pickModalFilterFields(right)));

const DATE_RANGE_INCOMPLETE_MESSAGE = "Please select both start and end dates.";

/** Empty is valid (no filter). A single date without a range end is invalid. */
const hasCompleteDateRange = (value) => {
  if (value == null || String(value).trim() === "") return true;
  const parts = String(value)
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length >= 2;
};

const getDateRangeError = (value) =>
  hasCompleteDateRange(value) ? "" : DATE_RANGE_INCOMPLETE_MESSAGE;

const normalizeDocTypeKey = (value) =>
  String(normaliseDocTypeLabel(value) || value || "")
    .trim()
    .toLowerCase();

/** Keep first occurrence of each document name (case-insensitive). */
const uniqueDocumentsByName = (items = []) => {
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    const name = String(item?.name ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
};

export default function OrchestrationFilterModal({ orchestrationConfig, currentFilters, onApply, isOpen, setIsOpen }) {
  const actionsRef = useRef(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setHasUnsavedChanges(false);
      setDiscardConfirmOpen(false);
    }
  }, [isOpen]);

  const requestClose = () => {
    if (hasUnsavedChanges) {
      setDiscardConfirmOpen(true);
      return;
    }
    setIsOpen(false);
  };

  const handleConfirmDiscard = () => {
    setDiscardConfirmOpen(false);
    setIsOpen(false);
  };

  return (
    <div className="">
      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={requestClose}
          ></div>

          {/* Modal Box */}
          <div className="relative bg-white w-[700px] mx-4 rounded-2xl shadow-xl p-6 animate-[fadeIn_.2s_ease-out] h-[550px]">

            {/* Header */}
            <div className="flex justify-between items-center pb-2 pr-4">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button
                type="button"
                onClick={requestClose}
                aria-label="Close filters"
                className="rounded-md border border-transparent p-1 text-gray-600 hover:border-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ maxHeight: 'calc(100% - 84px)', paddingBottom: '72px' }}>
              <DocumentFilters
                currentFilters={currentFilters}
                onApply={onApply}
                orchestrationConfig={orchestrationConfig}
                setIsOpen={setIsOpen}
                actionsRef={actionsRef}
                onDirtyChange={setHasUnsavedChanges}
                hideInternalButtons={true}
              />
            </div>

            {/* Footer buttons (fixed inside modal) */}
            <div className="absolute bottom-4 left-6 right-6 flex justify-between items-center">
              <button
                type="button"
                className="text-purple-600 font-bold"
                onClick={() => {
                  if (actionsRef.current && typeof actionsRef.current.reset === 'function') {
                    actionsRef.current.reset();
                  }
                }}
              >
                Reset Filters
              </button>

              <button
                type="button"
                onClick={() => {
                  if (actionsRef.current && typeof actionsRef.current.submit === 'function') {
                    actionsRef.current.submit();
                  }
                }}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold"
              >
                Apply Filters
              </button>
            </div>

            {discardConfirmOpen ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/40 px-4">
                <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                  <h3 className="text-lg font-semibold">Discard filter changes?</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Your unsaved filter selections will be lost if you close this modal.
                  </p>
                  <div className="mt-5 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setDiscardConfirmOpen(false)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDiscard}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

          </div>
        </div>
      )}
    </div>
  );
}



function DocumentFilters({ currentFilters, onApply, orchestrationConfig, setIsOpen, actionsRef = null, onDirtyChange, hideInternalButtons = false }) {
  const { documentTypes } = orchestrationConfig || {};

  const EVENT_OPTION = { value: "Event", label: "Event" };
  const documentTypeOptions = (
    Array.isArray(documentTypes)
      ? documentTypes.some((dt) => dt.value === "Event")
        ? documentTypes
        : [...documentTypes, EVENT_OPTION]
      : [EVENT_OPTION]
  ).slice()
    .map((dt) => {
      const mapped = normaliseDocTypeLabel(dt.label)
      return mapped !== dt.label ? { ...dt, label: mapped } : dt
    })
    .sort((a, b) => String(a.label).localeCompare(String(b.label)));

  const [departments, setDepartments] = useState([]);
  const [dateRangeErrors, setDateRangeErrors] = useState({
    lastUpdated: "",
    nextReview: "",
  });
  useEffect(() => {
    getDepartments()
      .then((data) => {
        const opts = data
          .map((d) => {
            const name =
              d?.name ?? d?.department_name ?? d?.label ?? String(d);
            return { value: name, label: name };
          })
          .filter((o) => o.value)
          .sort((a, b) => String(a.label).localeCompare(String(b.label)));
        setDepartments(opts);
      })
      .catch(() => {});
  }, []);

  const { values, setFieldValue, handleChange, submitForm, resetForm } =
    useFormik({
      initialValues: currentFilters || FILTER_INITIAL_VALUES,
      enableReinitialize: true,
      onSubmit: (vals) => {
        const nextDateRangeErrors = {
          lastUpdated: getDateRangeError(vals.lastUpdated),
          nextReview: getDateRangeError(vals.nextReview),
        };

        if (nextDateRangeErrors.lastUpdated || nextDateRangeErrors.nextReview) {
          setDateRangeErrors(nextDateRangeErrors);
          return;
        }

        setDateRangeErrors({ lastUpdated: "", nextReview: "" });
        onApply?.(vals);
        setIsOpen(false);
      },
    });

  useEffect(() => {
    onDirtyChange?.(!areFiltersEqual(values, currentFilters || FILTER_INITIAL_VALUES));
  }, [values, currentFilters, onDirtyChange]);

  const clearDateRangeError = (field) => {
    setDateRangeErrors((prev) =>
      prev[field] ? { ...prev, [field]: "" } : prev,
    );
  };

  // expose actions to parent via ref so footer buttons can call them
  useEffect(() => {
    if (!actionsRef) return;
    actionsRef.current = {
      submit: submitForm,
      reset: () => {
        // mirror previous behavior: reset form values, notify parent and close
        resetForm({ values: FILTER_INITIAL_VALUES });
        setDateRangeErrors({ lastUpdated: "", nextReview: "" });
        onApply?.(FILTER_INITIAL_VALUES);
        setIsOpen(false);
      },
    };
    return () => {
      if (actionsRef) actionsRef.current = null;
    };
  }, [submitForm, resetForm, onApply, setIsOpen, actionsRef]);

  return (
    <div className="w-[670px] bg-white mt-4 pr-4">
      <div className="grid grid-cols-2 gap-6">

        {/* Document Type */}
        <div className="flex flex-col">
          <label className="mb-1.5 text-sm font-semibold">
            Document Type
          </label>
          <MultiSelectDropdown
            options={documentTypeOptions}
            value={values.documentType}
            onChange={(vals) => {
              const selectedTypeKeys = new Set((vals || []).map((type) => normalizeDocTypeKey(type)));
              const filteredDocumentNames = (values.documentName || []).filter((doc) => {
                const parentDocType =
                  doc?.document_type ?? doc?._docType ?? doc?.documentType ?? null;
                // If parent type is unknown on legacy selection, keep it rather than dropping it.
                if (!parentDocType) return true;
                return selectedTypeKeys.has(normalizeDocTypeKey(parentDocType));
              });
              setFieldValue("documentType", vals);
              setFieldValue("documentName", filteredDocumentNames);
            }}
            placeholder="Select document type"
          />
        </div>

        {/* Document Name */}
        <div className="flex flex-col">
          <label className="mb-1.5 text-sm font-semibold">
            Document Name
          </label>
          <DocumentNamePicker
            documentTypes={values.documentType}
            values={values.documentName}
            onChange={(selected) => setFieldValue("documentName", selected)}
            disabled={!values.documentType?.length}
            placeholder="Select document names"
          />
        </div>

        {/* Status */}
        <div className="flex flex-col">
          <label className="mb-1.5 text-sm font-semibold">Status</label>
          <MultiSelectDropdown
            options={ORCHESTRATION_STATUS_OPTIONS}
            value={Array.isArray(values.status) ? values.status : statusFilterToStatuses(values.status)}
            onChange={(vals) => setFieldValue("status", vals)}
            placeholder="Select status"
            showSelectAll
          />
        </div>

        {/* Owner */}
        <div className="flex flex-col">
          <label className="mb-1.5 text-sm font-semibold">
            Owner (Vertical/Division/Deptt)
          </label>
          <StaticSinglePicker
            options={departments}
            value={values.owner}
            onSelect={(option) => setFieldValue("owner", option?.value ?? "")}
            placeholder="Select owner"
          />
        </div>

        {/* Updated By */}
        <div className="flex flex-col">
          <label className="mb-1.5 text-sm font-semibold">
            Updated By
          </label>
          <UserPicker
            value={values.updated_by}
            onSelect={(staffId) => setFieldValue("updated_by", staffId ?? "")}
            placeholder="Search by name or staff ID"
          />
        </div>

        {/* Last Updated */}
        <div className="flex flex-col">
          <label className="mb-1.5 text-sm font-semibold">Last Updated on</label>
          <DateRangePicker
            value={values.lastUpdated}
            onChange={(value) => {
              setFieldValue("lastUpdated", value);
              clearDateRangeError("lastUpdated");
            }}
            showIcon
            placeholder="Select start & end dates"
            placement="top"
            emitPartialSelection
          />
          {dateRangeErrors.lastUpdated ? (
            <small className="mt-1 text-sm text-red-500">{dateRangeErrors.lastUpdated}</small>
          ) : null}
        </div>

        {/* Next Review */}
        <div className="flex flex-col">
          <label className="mb-1.5 text-sm font-semibold">Next Review Date</label>
          <DateRangePicker
            value={values.nextReview}
            onChange={(value) => {
              setFieldValue("nextReview", value);
              clearDateRangeError("nextReview");
            }}
            showIcon
            placement="top"
            placeholder="Select start & end dates"
            emitPartialSelection
          />
          {dateRangeErrors.nextReview ? (
            <small className="mt-1 text-sm text-red-500">{dateRangeErrors.nextReview}</small>
          ) : null}
        </div>

      </div>

      {/* Buttons (optional internal buttons) */}
      {!hideInternalButtons && (
        <div className="flex justify-between mt-10">
          <button
            type="button"
            className="text-purple-600 font-bold"
            onClick={() => {
              resetForm({ values: FILTER_INITIAL_VALUES });
              setDateRangeErrors({ lastUpdated: "", nextReview: "" });
              onApply?.(FILTER_INITIAL_VALUES);
            }}
          >
            Reset Filters
          </button>

          <button
            type="button"
            onClick={submitForm}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
}


const PAGE_SIZE = 20;

function DocumentNamePicker({ documentTypes, values: valuesProp, onChange, disabled, placeholder }) {
  const values = valuesProp ?? [];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef(null);
  const searchInputRef = useRef(null);
  const tokenRef = useRef(null);

  const typesKey = Array.isArray(documentTypes) ? documentTypes.join(",") : "";

  useEffect(() => {
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [open]);

  const fetchOptions = useCallback(
    (searchTerm) => {
      const types = typesKey.split(",").filter(Boolean);
      if (types.length === 0) return;

      const token = Symbol();
      tokenRef.current = token;
      setLoading(true);

      getOrchestrationItems({
        page: 1,
        page_size: 100,
        document_types: types,
        ...(searchTerm.length >= 3 && { search: searchTerm }),
      })
        .then((res) => {
          if (tokenRef.current !== token) return;
          setOptions(uniqueDocumentsByName(res?.data || []));
        })
        .catch(() => {
          if (tokenRef.current !== token) return;
          setOptions([]);
        })
        .finally(() => {
          if (tokenRef.current === token) setLoading(false);
        });
    },
    [typesKey],
  );

  useEffect(() => {
    setOptions([]);
    setSearch("");
    if (typesKey) fetchOptions("");
  }, [typesKey, fetchOptions]);

  useEffect(() => {
    const timer = setTimeout(() => fetchOptions(search), 600);
    return () => clearTimeout(timer);
  }, [search, fetchOptions]);

  const isSelected = (id) => values.some((v) => v.id === id);

  const toggle = (item) => {
    if (isSelected(item.id)) {
      onChange(values.filter((v) => v.id !== item.id));
    } else {
      onChange([
        ...values,
        {
          id: item.id,
          name: item.name,
          document_type: item.document_type ?? "",
        },
      ]);
    }
  };

  const removeTag = (id, e) => {
    e.stopPropagation();
    onChange(values.filter((v) => v.id !== id));
  };

  const isDisabled = disabled || !typesKey;

  return (
    <div className="relative" ref={rootRef}>
      <div
        onClick={() => !isDisabled && setOpen((o) => !o)}
        className={`min-h-[42px] w-full px-3 py-1.5 border rounded-lg bg-white flex flex-wrap gap-1 items-center
          ${isDisabled ? "bg-gray-100 cursor-not-allowed opacity-60" : "cursor-pointer hover:border-blue-400"}`}
      >
        {values.length === 0 ? (
          <span className="text-sm text-gray-400 select-none flex-1">{placeholder}</span>
        ) : (
          values.map((v) => (
            <span key={v.id} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs rounded-full px-2 py-0.5">
              <span className="max-w-[120px] truncate">{v.name}</span>
              <button type="button" onClick={(e) => removeTag(v.id, e)} className="hover:text-blue-900 flex-shrink-0">
                <X size={10} />
              </button>
            </span>
          ))
        )}
        <div className="ml-auto flex items-center gap-1 pl-1 flex-shrink-0">
          {loading && <Loader2 size={14} className="animate-spin text-blue-500" />}
          <ChevronDown size={14} className="text-gray-400" />
        </div>
      </div>

      {open && !isDisabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg flex flex-col max-h-64">
          <div className="p-2 border-b flex-shrink-0">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {options.length === 0 && !loading ? (
              <div className="px-3 py-2 text-sm text-gray-400">
                {search.length > 0 && search.length < 3
                  ? "Type at least 3 characters to search…"
                  : "No results found"}
              </div>
            ) : (
              options.map((item) => {
                const selected = isSelected(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggle(item)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${selected ? "bg-blue-50/60" : ""}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                      {selected && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="truncate">{item.name}</span>
                    {item.document_type && (
                      <span className="ml-auto shrink-0 text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                        {normaliseDocTypeLabel(item.document_type)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
            {loading && (
              <div className="flex justify-center py-2">
                <Loader2 size={14} className="animate-spin text-blue-400" />
              </div>
            )}
          </div>
          {values.length > 0 && (
            <div className="border-t px-3 py-1.5 flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
              <span>{values.length} selected</span>
              <button type="button" onClick={() => onChange([])} className="text-blue-600 hover:underline">
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserPicker({ value, onSelect, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const fetchUsers = useCallback(async (q, pg) => {
    setLoading(true);
    try {
      const body = buildListUsersFilterBody({ q: q || "", role: "all", sort_by: "username" });
      const { users: fetched, total: t } = await listUsers({ page: pg, page_size: PAGE_SIZE, filters: body });
      const list = Array.isArray(fetched) ? fetched : [];
      setUsers((prev) => (pg === 1 ? list : [...prev, ...list]));
      setTotal(t ?? 0);
    } catch {
      if (pg === 1) setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on open or search change (debounced)
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchUsers(search, 1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [open, search, fetchUsers]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || loading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      const nextPage = page + 1;
      if ((nextPage - 1) * PAGE_SIZE < total) {
        setPage(nextPage);
        fetchUsers(search, nextPage);
      }
    }
  }, [loading, page, total, search, fetchUsers]);

  // Resolve display label when value is set externally (e.g. modal reopens with existing filter)
  useEffect(() => {
    if (!value) {
      setSelectedLabel("");
      return;
    }
    // Already showing the correct label — nothing to do
    if (selectedLabel && selectedLabel.includes(`(${value})`)) return;

    // Check already-fetched list first (free)
    const cached = users.find((u) => u.staff_id === value);
    if (cached) {
      setSelectedLabel(`${cached.username ?? ""} (${cached.staff_id ?? ""})`);
      return;
    }

    // Fetch a small page using the staff_id as the query to resolve the name
    let cancelled = false;
    const resolveLabel = async () => {
      try {
        const body = buildListUsersFilterBody({ q: value, role: "all", sort_by: "username" });
        const { users: fetched } = await listUsers({ page: 1, page_size: 5, filters: body });
        const match = Array.isArray(fetched) ? fetched.find((u) => u.staff_id === value) : null;
        if (match && !cancelled) {
          setSelectedLabel(`${match.username ?? ""} (${match.staff_id ?? ""})`);
        }
      } catch {
        // label stays empty but the filter value is still applied
      }
    };
    resolveLabel();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleSelect = (user) => {
    const label = `${user.username ?? ""} (${user.staff_id ?? ""})`;
    setSelectedLabel(label);
    onSelect(user.staff_id);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedLabel("");
    onSelect(null);
    setSearch("");
  };

  return (
    <div className="relative" ref={rootRef}>
      {/* Trigger */}
      <div
        onClick={() => setOpen((o) => !o)}
        className="min-h-[42px] w-full px-3 py-2 border border-gray-300 rounded-lg bg-white flex items-center cursor-pointer hover:border-blue-400"
      >
        {value && selectedLabel ? (
          <>
            <span className="flex-1 text-sm text-gray-800 truncate">{selectedLabel}</span>
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <span className="flex-1 text-sm text-gray-400">{placeholder}</span>
        )}
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0 ml-2" />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg flex flex-col max-h-64">
          {/* Search */}
          <div className="p-2 border-b flex-shrink-0">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or staff ID…"
              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {/* List */}
          <div ref={listRef} className="overflow-y-auto flex-1" onScroll={handleScroll}>
            {users.length === 0 && !loading ? (
              <div className="px-3 py-2 text-sm text-gray-400">No users found</div>
            ) : (
              users.map((user) => {
                const label = `${user.username ?? ""} (${user.staff_id ?? ""})`;
                const isSelected = user.staff_id === value;
                return (
                  <div
                    key={user.staff_id ?? user.id}
                    onClick={() => handleSelect(user)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${isSelected ? "bg-blue-50/60" : ""}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                      {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="truncate">{label}</span>
                  </div>
                );
              })
            )}
            {loading && (
              <div className="flex justify-center py-2">
                <Loader2 size={16} className="animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StaticSinglePicker({ options, value, onSelect, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [open]);

  const selectedOption = options.find((o) => o.value === value) ?? null;
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative" ref={rootRef}>
      <div
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`min-h-[42px] w-full px-3 py-2 border rounded-lg bg-white flex items-center
          ${disabled ? "bg-gray-100 cursor-not-allowed opacity-60" : "cursor-pointer hover:border-blue-400"}`}
      >
        {selectedOption ? (
          <>
            <span className="flex-1 text-sm text-gray-800 truncate">{selectedOption.label}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(null); setSearch(""); }}
              className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <span className="flex-1 text-sm text-gray-400 select-none">{placeholder}</span>
        )}
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0 ml-2" />
      </div>

      {open && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg flex flex-col max-h-64">
          <div className="p-2 border-b flex-shrink-0">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">No results found</div>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => { onSelect(opt); setSearch(""); setOpen(false); }}
                    className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${isSelected ? "bg-blue-50/60" : ""}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                      ${isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}
                    >
                      {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
