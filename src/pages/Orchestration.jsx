import OrchestrationStatsCard from "../components/orchestration/OrchestrationStatsCard";
import OrchestrationActionBar from "../components/orchestration/OrchestrationActionBar";
import OrchestrationTable from "../components/orchestration/OrchestrationTable";
import { useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import { DATE_FORMAT_MOMENT } from "../config";
import OrchestrationAddDocumentModal from "../components/orchestration/OrchestrationAddDocumentModal";
import OrchestrationAddEventModal from "../components/orchestration/OrchestrationAddEventModal";
import OrchestrationFilterModal, {
  statusFilterToStatuses,
} from "../components/orchestration/OrchestrationFilterModal";
import {
  getOrchestrationConfig,
  getOrchestrationItemDetail,
  exportOrchestrationItems,
} from "../api/orchestration";
import OrchestrationBreadcrumb from "../components/shared/OrchestrationBreadcrumb";
import OrchestrationViewDrawer from "../components/orchestration/OrchestrationViewDrawer";
import useUI from "../hooks/useUI";

const DEFAULT_ORCHESTRATION_FILTERS = {
  documentType: [],
  documentName: [],
  status: [],
  owner: "",
  updated_by: "",
  lastUpdated: null,
  nextReview: null,
  due_for_review: false,
  overdue: false,
};

export default function Orchestration() {
  const { error, success, Toast } = useUI();
  const [isExporting, setIsExporting] = useState(false);
  const [tableTotal, setTableTotal] = useState(0);
  const [documentModalState, setDocumentModalState] = useState({
    isOpen: false,
    mode: "create",
    itemId: undefined,
    initialStepData: undefined,
  });
  const [eventModalState, setEventModalState] = useState({
    isOpen: false,
    mode: "create",
    itemId: undefined,
    initialStepData: undefined,
  });
  const [filterModalIsOpen, setFilterModalIsOpen] = useState(false);
  const [viewDrawerIsOpen, setViewDrawerIsOpen] = useState(false);
  const [selectedOrchestrationItem, setSelectedOrchestrationItem] = useState(null);
  const [orchestrationConfig, setOrchestrationConfig] = useState();
  const [orchestrationFilters, setOrchestrationFilters] = useState(DEFAULT_ORCHESTRATION_FILTERS);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [activeTileKey, setActiveTileKey] = useState(null);
  const appliedFiltersCount = useMemo(() => {
    const filters = orchestrationFilters || {};
    let count = 0;
    if (Array.isArray(filters.documentType) && filters.documentType.length > 0) count += 1;
    if (Array.isArray(filters.documentName) && filters.documentName.length > 0) count += 1;
    if (Array.isArray(filters.status) && filters.status.length > 0) count += 1;
    else if (String(filters.status || "").trim()) count += 1;
    if (String(filters.owner || "").trim()) count += 1;
    if (String(filters.updated_by || "").trim()) count += 1;
    if (filters.lastUpdated) count += 1;
    if (filters.nextReview) count += 1;
    return count;
  }, [orchestrationFilters]);

  const formatDisplayDate = (value) => {
    if (!value) {
      return "";
    }

    const formattedDate = moment(value);
    return formattedDate.isValid()
      ? formattedDate.format(DATE_FORMAT_MOMENT).toUpperCase()
      : "";
  };

  const formatDisplayDateRange = (eventDates = []) => {
    if (!Array.isArray(eventDates) || eventDates.length === 0) {
      return "";
    }

    const [startDate, endDate] = eventDates;
    const formattedStartDate = formatDisplayDate(startDate);
    const formattedEndDate = formatDisplayDate(endDate || startDate);

    if (!formattedStartDate) {
      return "";
    }

    return formattedEndDate
      ? `${formattedStartDate} - ${formattedEndDate}`
      : formattedStartDate;
  };

  const sanitizeEventDates = (eventDates = []) =>
    (Array.isArray(eventDates) ? eventDates : []).filter((value) =>
      Boolean(formatDisplayDate(value)),
    );

  const extractKnowledgeItemData = (response) => {
    if (response?.data && typeof response.data === "object" && response.data.id) {
      return response.data;
    }

    return response?.data ?? response;
  };

  const normalizeApplicabilityEmails = (emails = []) =>
    (Array.isArray(emails) ? emails : [])
      .map((email) => {
        if (typeof email === "string") {
          return { value: email, valid: true };
        }

        if (email?.value) {
          return {
            value: email.value,
            valid: email.valid ?? true,
          };
        }

        return null;
      })
      .filter(Boolean);

  const mapApplicabilityStepData = (detail) => {
    const applicabilityType = detail?.applicability_type || "DIVISION";
    const applicabilityRefs = detail?.applicability_refs;

    if (applicabilityType === "ALL") {
      return {
        applicability_type: "ALL",
        applicability_refs: null,
      };
    }

    if (applicabilityType === "EMPLOYEE") {
      return {
        applicability_type: "EMPLOYEE",
        applicability_refs: {
          emails: normalizeApplicabilityEmails(
            applicabilityRefs?.emails || applicabilityRefs,
          ),
        },
      };
    }

    return {
      applicability_type: "DIVISION",
      applicability_refs: {
        divisions: Array.isArray(applicabilityRefs?.divisions)
          ? applicabilityRefs.divisions
          : [],
        designations: Array.isArray(applicabilityRefs?.designations)
          ? applicabilityRefs.designations
          : [],
      },
    };
  };

  const inferAttachmentType = (file) => {
    const fileType = String(file?.file_type || "").toLowerCase();
    const fileName = String(
      file?.name || file?.original_filename || file?.filename || "",
    ).toLowerCase();

    if (
      fileType === "video" ||
      fileType.startsWith("video/") ||
      /\.(mp4|mov|avi|mkv|wmv)$/.test(fileName)
    ) {
      return "video/mp4";
    }

    if (
      fileType === "image" ||
      fileType.startsWith("image/") ||
      /\.(png|jpg|jpeg|gif|bmp|webp)$/.test(fileName)
    ) {
      return "image/png";
    }

    return "application/octet-stream";
  };

  const mapExistingFile = (file) => {
    const name =
      file?.name || file?.original_filename || file?.filename || "Attachment";
    const preview = file?.file_url || file?.url || "";
    const inferredType = inferAttachmentType(file);
    const isVideo = String(inferredType).startsWith("video/");
    const thumbnailPreview =
      file?.thumbnail_url ||
      file?.thumbnail_file_url ||
      file?.thumbnailUrl ||
      file?.thumbnail?.url ||
      (typeof file?.thumbnail === "string" ? file.thumbnail : "") ||
      "";
    const hasExistingThumbnail = Boolean(
      thumbnailPreview || file?.thumbnail_blob_path,
    );

    return {
      ...file,
      name,
      preview,
      caption: file?.caption || "",
      description: file?.description || "",
      // Keep a truthy marker so edit mode doesn't treat existing thumbs as missing
      thumbnail: isVideo
        ? hasExistingThumbnail
          ? { __existing: true, name: "existing-thumbnail" }
          : null
        : undefined,
      thumbnailPreview: isVideo ? thumbnailPreview : undefined,
      thumbnail_blob_path: file?.thumbnail_blob_path || null,
      file: {
        name,
        type: inferredType,
      },
    };
  };

  const mapLinkedItemsStepData = (detail) => {
    const linkedItems =
      detail?.linked_document_details ||
      detail?.linked_documents ||
      detail?.linked_items ||
      detail?.linkedDocuments ||
      [];

    if (!Array.isArray(linkedItems) || linkedItems.length === 0) {
      return undefined;
    }

    const rows = linkedItems
      .map((linkedItem) => {
        const id =
          linkedItem?.id ?? linkedItem?.document_id ?? linkedItem?.item_id;
        const name =
          linkedItem?.name ??
          linkedItem?.document_name ??
          linkedItem?.title ??
          "";
        const documentType =
          linkedItem?.document_type ??
          linkedItem?.type ??
          linkedItem?.item_type ??
          "";

        if (!id || !name || !documentType) {
          return null;
        }

        return {
          documentType,
          linkedItem: {
            ...linkedItem,
            id,
            name,
            document_type: documentType,
          },
        };
      })
      .filter(Boolean);

    return rows.length > 0 ? { rows } : undefined;
  };

  const getDocumentVersion = (detail) => {
    if (detail?.version) {
      return detail.version;
    }

    if (
      detail?.current_media_version !== undefined ||
      detail?.current_revision_number !== undefined
    ) {
      return `v${detail?.current_media_version ?? 1}.${detail?.current_revision_number ?? 0}`;
    }

    return "";
  };

  const mapDocumentDetailToStepData = (detail, fallbackStatus = "") => ({
    stepOneData: {
      documentType: detail?.document_type || "",
      legislation: detail?.legislation_id ?? detail?.legislation?.id ?? "",
      subLegislation:
        detail?.sub_legislation_id ?? detail?.sub_legislation?.id ?? "",
      name: detail?.name || "",
      version: getDocumentVersion(detail),
      reviewDate: formatDisplayDate(detail?.next_review_date),
      summary: detail?.summary || detail?.description || "",
      tags: Array.isArray(detail?.tags) ? detail.tags : [],
      downloadAllowed: detail?.download_allowed ?? true,
      status: detail?.status || fallbackStatus || "",
      files: Array.isArray(detail?.files)
        ? detail.files.map(mapExistingFile)
        : [],
      replacesDocumentId: detail?.replaces_document_id ?? null,
    },
    stepTwoData: mapLinkedItemsStepData(detail),
    stepThreeData: mapApplicabilityStepData(detail),
  });

  const mapEventDetailToStepData = (detail) => ({
    stepOneData: {
      eventName: detail?.event_name || detail?.name || "",
      subEventName: detail?.sub_event_name || "",
      eventDate: formatDisplayDateRange(
        Array.isArray(detail?.event_dates)
          ? sanitizeEventDates(detail.event_dates)
          : [detail?.start_date, detail?.end_date].filter(Boolean),
      ),
      description: detail?.description || detail?.summary || "",
      tags: Array.isArray(detail?.tags) ? detail.tags : [],
      version: detail?.version ?? "",
      status: detail?.status || "",
      replacesDocumentId: detail?.replaces_document_id ?? null,
    },
    stepTwoData: {
      files: Array.isArray(detail?.files) ? detail.files.map(mapExistingFile) : [],
    },
    stepThreeData: mapApplicabilityStepData(detail),
  });

  const closeDocumentModal = () => {
    setDocumentModalState({
      isOpen: false,
      mode: "create",
      itemId: undefined,
      initialStepData: undefined,
    });
  };

  const closeEventModal = () => {
    setEventModalState({
      isOpen: false,
      mode: "create",
      itemId: undefined,
      initialStepData: undefined,
    });
  };

  useEffect(() => {
    const fetchOrchestrationConfig = async () => {
      const config = await getOrchestrationConfig();
      setOrchestrationConfig(config.data);
    };
    fetchOrchestrationConfig();
  }, []);

  const handleEditClick = async (item) => {
    try {
      const itemType =
        item?.item_type ||
        (String(item?.document_type || "").toLowerCase() === "event"
          ? "event"
          : "document");
      const response = await getOrchestrationItemDetail({
        item_id: item?.id,
        item_type: itemType,
      });
      const detail = extractKnowledgeItemData(response);

      if (itemType === "event") {
        setEventModalState({
          isOpen: true,
          mode: "edit",
          itemId: detail?.id ?? item?.id,
          initialStepData: mapEventDetailToStepData(detail),
        });
        return;
      }

      setDocumentModalState({
        isOpen: true,
        mode: "edit",
        itemId: detail?.id ?? item?.id,
        initialStepData: mapDocumentDetailToStepData(detail, item?.status),
      });
    } catch (loadError) {
      error(loadError?.message || "Unable to load item details.");
    }
  };

  const handleViewClick = (item) => {
    setSelectedOrchestrationItem(item);
    setViewDrawerIsOpen(true);
  };

  const tableRef = useRef(null);

  const handleKpiTileClick = (filterKey) => {
    // Toggle: clicking the active tile clears the filter
    if (filterKey === activeTileKey) {
      setActiveTileKey(null);
      setOrchestrationFilters(DEFAULT_ORCHESTRATION_FILTERS);
      return;
    }

    let filterPatch = {};
    if (filterKey === "active_published") {
      filterPatch = { status: ["Active"] };
    } else if (filterKey === "due_for_review") {
      filterPatch = { due_for_review: true, status: ["Active"] };
    } else if (filterKey === "overdue") {
      filterPatch = { overdue: true, status: ["Active"] };
    } else if (filterKey === "draft") {
      filterPatch = { status: ["Draft"] };
    } else if (filterKey.startsWith("type:")) {
      filterPatch = { documentType: [filterKey.slice(5)] };
    }
    setActiveTileKey(filterKey);
    setOrchestrationFilters({ ...DEFAULT_ORCHESTRATION_FILTERS, ...filterPatch, page: 1 });
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const buildExportPayload = (filters) => {
    const parseDateRange = (rangeStr, key) => {
      const [startRaw, endRaw] = String(rangeStr || "").split("-");
      const start = startRaw?.trim()
        ? moment(startRaw.trim(), DATE_FORMAT_MOMENT).format("YYYY-MM-DD")
        : null;
      const end = endRaw?.trim()
        ? moment(endRaw.trim(), DATE_FORMAT_MOMENT).format("YYYY-MM-DD")
        : null;
      return { [`${key}_start`]: start || undefined, [`${key}_end`]: end || undefined };
    };

    const raw = {
      document_types: Array.isArray(filters?.documentType)
        ? filters.documentType
        : filters?.documentType ? [filters.documentType] : [],
      document_names: Array.isArray(filters?.documentName) && filters.documentName.length > 0
        ? filters.documentName.map((d) => d.name ?? d)
        : [],
      statuses: statusFilterToStatuses(filters?.status),
      ...parseDateRange(filters?.lastUpdated, "last_updated"),
      ...parseDateRange(filters?.nextReview, "next_review"),
      search: filters?.search || undefined,
      updated_by: filters?.updated_by || undefined,
      due_for_review: filters?.due_for_review === true ? true : undefined,
      overdue: filters?.overdue === true ? true : undefined,
    };

    // Strip undefined/null/empty-array values
    return Object.entries(raw).reduce((acc, [k, v]) => {
      if (v === undefined || v === null) return acc;
      if (Array.isArray(v) && v.length === 0) return acc;
      acc[k] = v;
      return acc;
    }, {});
  };

  const handleExportClick = async () => {
    if (tableTotal === 0) {
      error("Nothing to export");
      return;
    }
    setIsExporting(true);
    try {
      const payload = buildExportPayload(orchestrationFilters);
      const response = await exportOrchestrationItems(payload);
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers?.["content-disposition"];
      const filename =
        disposition?.match(/filename[^;=\n]*=(?:(\\?['"])(.*?)\1|(?:[^\s]+'.*?')?([^;\n]*))/i)?.[3]?.trim() ??
        disposition?.match(/filename="?([^";\n]+)"?/i)?.[1]?.trim() ??
        `Orchestration_Export_${moment().format("YYYY-MM-DD")}.xlsx`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      success("Export downloaded successfully.");
    } catch (err) {
      console.error("Export failed:", err);
      error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const refreshTable = () => {
    setTableRefreshKey((currentKey) => currentKey + 1);
  };

  return (
    <div className="min-h-full bg-gray-100">
      <Toast />
      <OrchestrationViewDrawer
        isOpen={viewDrawerIsOpen}
        item={selectedOrchestrationItem}
        onClose={() => setViewDrawerIsOpen(false)}
      />
      <div
        style={{
          width: "100%",
        }}
      >
        <div className="w-full py-6 md:py-8">
          <OrchestrationBreadcrumb currentPage="Documents & Events" />
          {/* <h1 className="text-xl md:text-xl font-semibold tracking-tight">
            Orchestration
          </h1> */}
          <div className="flex mt-4">
            <div className="w-full">
              <OrchestrationStatsCard onTileClick={handleKpiTileClick} activeTileKey={activeTileKey} refreshKey={tableRefreshKey} />
            </div>
          </div>
          <OrchestrationActionBar
            onFilterClickHandler={() =>
              setFilterModalIsOpen(!filterModalIsOpen)
            }
            onAddDocumentClickHandler={() =>
              setDocumentModalState({
                isOpen: true,
                mode: "create",
                itemId: undefined,
                initialStepData: undefined,
              })
            }
            onAddEventClickHandler={() =>
              setEventModalState({
                isOpen: true,
                mode: "create",
                itemId: undefined,
                initialStepData: undefined,
              })
            }
            onExportClickHandler={handleExportClick}
            isExporting={isExporting}
            noRecords={tableTotal === 0}
            appliedFiltersCount={appliedFiltersCount}
          />
          <div ref={tableRef}>
            <OrchestrationTable
              filters={orchestrationFilters}
              onEditClick={handleEditClick}
              onViewClick={handleViewClick}
              refreshKey={tableRefreshKey}
              onReload={refreshTable}
              onTotalChange={setTableTotal}
            />
          </div>
          <OrchestrationFilterModal
            orchestrationConfig={orchestrationConfig}
            currentFilters={orchestrationFilters}
            onApply={(filters) => {
              setActiveTileKey(null);
              setOrchestrationFilters({
                ...filters,
                // page: 1,
              });
            }}
            isOpen={filterModalIsOpen}
            setIsOpen={setFilterModalIsOpen}
          />
          <OrchestrationAddDocumentModal
            orchestrationConfig={orchestrationConfig}
            isOpen={documentModalState.isOpen}
            mode={documentModalState.mode}
            documentId={documentModalState.itemId}
            initialStepData={documentModalState.initialStepData}
            onSuccess={refreshTable}
            setIsOpen={(nextOpen) => {
              if (!nextOpen) {
                closeDocumentModal();
              }
            }}
          />
          <OrchestrationAddEventModal
            orchestrationConfig={orchestrationConfig}
            isOpen={eventModalState.isOpen}
            mode={eventModalState.mode}
            eventId={eventModalState.itemId}
            initialStepData={eventModalState.initialStepData}
            onSuccess={refreshTable}
            setIsOpen={(nextOpen) => {
              if (!nextOpen) {
                closeEventModal();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
