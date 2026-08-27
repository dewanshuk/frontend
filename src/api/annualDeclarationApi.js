import { genericApi } from "./axiosInstance";

const extractValidationMessage = (detail) => {
  if (typeof detail === "string" && detail.trim()) return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "string" && first.trim()) return first;
    if (first?.msg) return first.msg;
  }

  return null;
};

const toFriendlyApiMessage = (message, fallbackMessage) => {
  const raw = String(message || "").trim();
  if (!raw || /^network error$/i.test(raw)) {
    return fallbackMessage || "Unable to complete the request. Please try again.";
  }
  return raw;
};

const buildApiError = (error, fallbackMessage) => {
  const detail = error?.payload?.detail;
  const parsedMessage = extractValidationMessage(detail);

  const enhancedError = new Error(
    toFriendlyApiMessage(parsedMessage || error?.message, fallbackMessage),
  );
  enhancedError.status = error?.status;
  enhancedError.payload = error?.payload;
  return enhancedError;
};

const normalizeDateValue = (value) => {
  if (typeof value !== "string") return undefined;

  const trimmedValue = value.trim();
  if (!trimmedValue) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  const parts = trimmedValue.split("/").map((part) => part.trim());
  if (parts.length === 3) {
    let [day, monthPart, year] = parts;
    if (!day || !monthPart || !year) return undefined;

    if (/^\d+$/.test(monthPart)) {
      const monthNumber = String(Number(monthPart)).padStart(2, "0");
      return `${year}-${monthNumber}-${String(Number(day)).padStart(2, "0")}`;
    }

    const normalizedMonth = monthPart.replace(/[^a-zA-Z]/g, "").slice(0, 3).toLowerCase();
    const monthIndex = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ].indexOf(normalizedMonth);

    if (monthIndex >= 0) {
      const monthNumber = String(monthIndex + 1).padStart(2, "0");
      return `${year}-${monthNumber}-${String(Number(day)).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(trimmedValue);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return undefined;
};

const extractDateRange = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  const [fromValue, toValue] = value.split(" - ").map((item) => item?.trim());

  return {
    from: normalizeDateValue(fromValue),
    to: normalizeDateValue(toValue || fromValue),
  };
};

export const buildCreateAnnualDeclarationPayload = (payload = {}) => {
  const requestPayload = {
    declaration_name: payload.declaration_name ?? payload.declarationName,
    financial_year: payload.financial_year ?? payload.financialYear,
    assigned_date: payload.assigned_date ?? payload.assignedDate,
    due_date: payload.due_date ?? payload.dueDate,
    activity_closure_date:
      payload.activity_closure_date ?? payload.activityClosureDate ?? payload.closureDate,
  };

  const normalizedPayload = {
    declaration_name: requestPayload.declaration_name?.trim?.() ?? requestPayload.declaration_name,
    financial_year: requestPayload.financial_year?.trim?.() ?? requestPayload.financial_year,
    assigned_date: normalizeDateValue(requestPayload.assigned_date),
    due_date: normalizeDateValue(requestPayload.due_date),
    activity_closure_date: normalizeDateValue(requestPayload.activity_closure_date),
  };

  return Object.entries(normalizedPayload).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === "") {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
};

export const createAnnualDeclaration = async (payload) => {
  try {
    const response = await genericApi.post(
      "/api/compliance/declarations/create-declaration",
      buildCreateAnnualDeclarationPayload(payload),
    );
    return response.data;
  } catch (error) {
    throw buildApiError(error, "Failed to create annual declaration.");
  }
};

export const buildListAnnualDeclarationQuery = (queryParams = {}) => {
  const assignedRange = extractDateRange(
    queryParams.assigned_date ?? queryParams.assignedDate,
  );
  const dueRange = extractDateRange(queryParams.due_date ?? queryParams.dueDate);
  const closureRange = extractDateRange(
    queryParams.activity_closure_date ??
      queryParams.activityClosureDate ??
      queryParams.closure_date ??
      queryParams.closureDate,
  );

  const payload = {
    declaration_name: queryParams.declaration_name ?? queryParams.declarationName,
    financial_year: queryParams.financial_year ?? queryParams.financialYear,
    assigned_date_from:
      normalizeDateValue(queryParams.assigned_date_from ?? queryParams.assignedDateFrom) ??
      assignedRange.from,
    assigned_date_to:
      normalizeDateValue(queryParams.assigned_date_to ?? queryParams.assignedDateTo) ??
      assignedRange.to,
    due_date_from:
      normalizeDateValue(queryParams.due_date_from ?? queryParams.dueDateFrom) ?? dueRange.from,
    due_date_to:
      normalizeDateValue(queryParams.due_date_to ?? queryParams.dueDateTo) ?? dueRange.to,
    activity_closure_date_from:
      normalizeDateValue(
        queryParams.activity_closure_date_from ?? queryParams.activityClosureDateFrom,
      ) ?? closureRange.from,
    activity_closure_date_to:
      normalizeDateValue(
        queryParams.activity_closure_date_to ?? queryParams.activityClosureDateTo,
      ) ?? closureRange.to,
    page: Number.isFinite(queryParams.page) && queryParams.page > 0 ? queryParams.page : undefined,
    page_size:
      Number.isFinite(queryParams.page_size) && queryParams.page_size > 0
        ? queryParams.page_size
        : Number.isFinite(queryParams.limit) && queryParams.limit > 0
          ? queryParams.limit
          : undefined,
  };

  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === "") {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
};

/** Export uses the same filter params as list (without pagination). */
export const buildExportAnnualDeclarationQuery = (queryParams = {}) => {
  const { page: _page, page_size: _pageSize, limit: _limit, ...rest } = queryParams;
  const query = buildListAnnualDeclarationQuery(rest);
  delete query.page;
  delete query.page_size;
  return query;
};

export const getAnnualDeclarations = async (queryParams = {}) => {
  try {
    const response = await genericApi.get(
      "/api/compliance/declarations/list-declarations",
      { params: buildListAnnualDeclarationQuery(queryParams) },
    );
    return response.data;
  } catch (error) {
    throw buildApiError(error, "Failed to fetch annual declarations.");
  }
};

export const exportAnnualDeclarations = async (queryParams = {}) => {
  try {
    const response = await genericApi.get(
      "/api/compliance/declarations/export-declarations",
      {
        params: buildExportAnnualDeclarationQuery(queryParams),
        responseType: "blob",
      },
    );
    return response;
  } catch (error) {
    throw buildApiError(error, "Failed to export annual declarations.");
  }
};

export const updateAnnualDeclaration = async (declarationId, payload = {}) => {
  if (!declarationId) {
    throw new Error("Declaration id is required.");
  }

  try {
    const response = await genericApi.put(
      `/api/compliance/declarations/edit-declaration/${encodeURIComponent(declarationId)}`,
      buildCreateAnnualDeclarationPayload(payload),
    );
    return response.data;
  } catch (error) {
    throw buildApiError(error, "Failed to update annual declaration.");
  }
};

export const getAnnualDeclarationTypes = async () => {
  try {
    const response = await genericApi.get(
      "/api/compliance/declarations/declarationtypes",
    );
    const data = response?.data;
    const types = Array.isArray(data)
      ? data
      : Array.isArray(data?.declaration_types)
        ? data.declaration_types
        : Array.isArray(data?.data)
          ? data.data
          : [];

    return types.map((type) => String(type ?? "").trim()).filter(Boolean);
  } catch (error) {
    throw buildApiError(error, "Failed to load declaration types.");
  }
};

export const uploadAnnualDeclarationFile = async (declarationId, file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await genericApi.post(
      `/api/compliance/declarations/upload-declaration-file/${encodeURIComponent(declarationId)}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  } catch (error) {
    throw buildApiError(error, "Failed to upload declaration file.");
  }
};

export const downloadAnnualDeclarationTemplate = async () => {
  try {
    const response = await genericApi.get(
      "/api/compliance/declarations/download-declaration-file",
      {
        responseType: "blob",
      },
    );
    return response;
  } catch (error) {
    throw buildApiError(error, "Failed to download declaration template.");
  }
};

export const downloadAnnualDeclarationStatusFile = async (declarationId) => {
  if (!declarationId) {
    throw new Error("Declaration id is required.");
  }

  try {
    const response = await genericApi.get(
      `/api/compliance/declarations/download-declaration-status-file/${encodeURIComponent(declarationId)}`,
      {
        responseType: "blob",
      },
    );
    return response;
  } catch (error) {
    throw buildApiError(error, "Failed to download declaration status file.");
  }
};
