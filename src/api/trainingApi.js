import { trainingApi } from "./axiosInstance"

const extractValidationMessage = (detail) => {
  if (typeof detail === "string" && detail.trim()) return detail

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0]
    if (typeof first === "string" && first.trim()) return first
    if (first?.msg) return first.msg
  }

  return null
}

const buildApiError = (error, fallbackMessage) => {
  const detail = error?.payload?.detail
  const parsedMessage = extractValidationMessage(detail)

  const enhancedError = new Error(parsedMessage || error?.message || fallbackMessage)
  enhancedError.status = error?.status
  enhancedError.payload = error?.payload
  return enhancedError
}

const normalizeDateValue = (value) => {
  if (typeof value !== "string") return undefined

  const trimmedValue = value.trim()
  if (!trimmedValue) return undefined

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return trimmedValue
  }

  // Accept DD/MM/YYYY or DD/MMM/YYYY (e.g., 11/06/2026 or 11/Jun/2026)
  const parts = trimmedValue.split("/").map((p) => p.trim())
  if (parts.length === 3) {
    let [day, monthPart, year] = parts
    if (!day || !monthPart || !year) return undefined

    // If month is numeric
    if (/^\d+$/.test(monthPart)) {
      const monthNum = String(Number(monthPart)).padStart(2, "0")
      return `${year}-${monthNum}-${String(Number(day)).padStart(2, "0")}`
    }

    // Try parse short month names (Jan, Feb, Mar, ...)
    const normalizedMonth = monthPart.replace(/[^a-zA-Z]/g, "").slice(0,3).toLowerCase()
    const monthIndex = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(normalizedMonth)
    if (monthIndex >= 0) {
      const monthNum = String(monthIndex + 1).padStart(2, "0")
      return `${year}-${monthNum}-${String(Number(day)).padStart(2, "0")}`
    }
  }

  // Fallback: attempt Date parse
  const parsed = new Date(trimmedValue)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return undefined
}

const extractDateRange = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return {}
  }

  const [fromValue, toValue] = value.split(" - ").map((item) => item?.trim())

  return {
    from: normalizeDateValue(fromValue),
    to: normalizeDateValue(toValue || fromValue),
  }
}

export const buildCreateTrainingPayload = (payload = {}) => {
  const requestPayload = {
    training_name: payload.training_name ?? payload.trainingName,
    financial_year: payload.financial_year ?? payload.financialYear,
    training_assigned_date:
      payload.training_assigned_date ??
      payload.assigned_date ??
      payload.assignedDate,
    training_due_date:
      payload.training_due_date ?? payload.due_date ?? payload.dueDate,
    activity_closure_date:
      payload.activity_closure_date ??
      payload.closure_date ??
      payload.closureDate,
    training_link: payload.training_link ?? payload.link ?? payload.trainingLink,
  }

  const normalizedPayload = {
    training_name: requestPayload.training_name,
    financial_year: requestPayload.financial_year,
    training_assigned_date: normalizeDateValue(
      requestPayload.training_assigned_date,
    ),
    training_due_date: normalizeDateValue(requestPayload.training_due_date),
    activity_closure_date: normalizeDateValue(
      requestPayload.activity_closure_date,
    ),
    training_link: requestPayload.training_link,
  }

  return Object.entries(normalizedPayload).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === "") {
      return acc
    }

    acc[key] = value
    return acc
  }, {})
}

export const buildUpdateTrainingPayload = (payload = {}) => {
  const base = buildCreateTrainingPayload(payload)
  if (payload.change_remarks) {
    base.change_remarks = payload.change_remarks
  }
  return base
}

export const buildTrainingListPayload = (queryParams = {}) => {
  const assignedRange = extractDateRange(queryParams.assigned_date)
  const dueRange = extractDateRange(queryParams.due_date)
  const closureRange = extractDateRange(queryParams.closure_date)

  const limit =
    Number.isFinite(queryParams.limit) && queryParams.limit >= 0
      ? queryParams.limit
      : Number.isFinite(queryParams.page_size) && queryParams.page_size >= 0
        ? queryParams.page_size
        : undefined

  const offset =
    Number.isFinite(queryParams.offset) && queryParams.offset >= 0
      ? queryParams.offset
      : Number.isFinite(queryParams.page) &&
          Number.isFinite(queryParams.page_size) &&
          queryParams.page > 0 &&
          queryParams.page_size >= 0
        ? (queryParams.page - 1) * queryParams.page_size
        : Number.isFinite(queryParams.pageNo) &&
            Number.isFinite(queryParams.limit) &&
            queryParams.pageNo > 0 &&
            queryParams.limit >= 0
          ? (queryParams.pageNo - 1) * queryParams.limit
          : undefined

  const payload = {
    training_name: queryParams.training_name ?? queryParams.TrainingName,
    financial_year: queryParams.financial_year ?? queryParams.FinancialYear,
    training_assigned_date_from:
      queryParams.training_assigned_date_from ??
      queryParams.TrainingAssignedStartDate ??
      assignedRange.from,
    training_assigned_date_to:
      queryParams.training_assigned_date_to ??
      queryParams.TrainingAssignedEndDate ??
      assignedRange.to,
    training_due_date_from:
      queryParams.training_due_date_from ??
      queryParams.TrainingDueStartDate ??
      dueRange.from,
    training_due_date_to:
      queryParams.training_due_date_to ??
      queryParams.TrainingDueEndDate ??
      dueRange.to,
    activity_closure_date_from:
      queryParams.activity_closure_date_from ??
      queryParams.ActivityClosureStartDate ??
      closureRange.from,
    activity_closure_date_to:
      queryParams.activity_closure_date_to ??
      queryParams.ActivityClosureEndDate ??
      closureRange.to,
    limit,
    page_number: queryParams?.page_number,
    limit: queryParams?.limit,
    search: queryParams?.search,
    order_by: Array.isArray(queryParams.order_by) ? queryParams.order_by : [],
  }

  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0 && key !== "order_by")
    ) {
      return acc
    }

    acc[key] = value
    return acc
  }, {})
}

const normalizeArrayParam = (value) => {
  if (value === undefined || value === null) return undefined

  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => (typeof item === "string" ? item.trim() : item))
      .filter((item) => item !== undefined && item !== null && item !== "")

    return normalized.length > 0 ? normalized : undefined
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : undefined
  }

  return undefined
}

const normalizePageNumber = (queryParams = {}, limit) => {
  if (Number.isFinite(queryParams.page_number) && queryParams.page_number >= 1) {
    return queryParams.page_number
  }

  if (Number.isFinite(queryParams.page) && queryParams.page >= 1) {
    return queryParams.page
  }

  if (Number.isFinite(queryParams.pageNo) && queryParams.pageNo >= 1) {
    return queryParams.pageNo
  }

  if (
    Number.isFinite(queryParams.offset) &&
    queryParams.offset >= 0 &&
    Number.isFinite(limit) &&
    limit > 0
  ) {
    return Math.floor(queryParams.offset / limit) + 1
  }

  return undefined
}

export const buildUserTrainingListPayload = (queryParams = {}) => {
  const assignedRange = extractDateRange(
    queryParams.training_assigned_date ?? queryParams.assigned_date,
  )
  const dueRange = extractDateRange(
    queryParams.training_due_date ?? queryParams.due_date,
  )
  const completionRange = extractDateRange(
    queryParams.actual_completion_date ?? queryParams.actualCompletionDate,
  )

  const limit =
    Number.isFinite(queryParams.limit) && queryParams.limit >= 0
      ? queryParams.limit
      : Number.isFinite(queryParams.page_size) && queryParams.page_size >= 0
        ? queryParams.page_size
        : undefined

  const page_number = normalizePageNumber(queryParams, limit)

  const payload = {
    status: normalizeArrayParam(queryParams.status ?? queryParams.Status),
    training_name: normalizeArrayParam(
      queryParams.training_name ?? queryParams.TrainingName ?? queryParams.search,
    ),
    financial_year: normalizeArrayParam(queryParams.financial_year ?? queryParams.FinancialYear),
    training_assigned_date_from:
      queryParams.training_assigned_date_from ??
      queryParams.TrainingAssignedStartDate ??
      assignedRange.from,
    training_assigned_date_to:
      queryParams.training_assigned_date_to ??
      queryParams.TrainingAssignedEndDate ??
      assignedRange.to,
    training_due_date_from:
      queryParams.training_due_date_from ??
      queryParams.TrainingDueStartDate ??
      dueRange.from,
    training_due_date_to:
      queryParams.training_due_date_to ??
      queryParams.TrainingDueEndDate ??
      dueRange.to,
    actual_completion_date_from:
      queryParams.actual_completion_date_from ??
      queryParams.ActualCompletionStartDate ??
      completionRange.from,
    actual_completion_date_to:
      queryParams.actual_completion_date_to ??
      queryParams.ActualCompletionEndDate ??
      completionRange.to,
    limit,
    page_number,
  }

  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return acc
    }

    acc[key] = value
    return acc
  }, {})
}

export const buildUserTrainingExportPayload = (queryParams = {}) => {
  const assignedRange = extractDateRange(
    queryParams.training_assigned_date ?? queryParams.assigned_date,
  )
  const dueRange = extractDateRange(
    queryParams.training_due_date ?? queryParams.due_date,
  )
  const closureRange = extractDateRange(
    queryParams.activity_closure_date ?? queryParams.activityClosureDate ?? queryParams.actual_completion_date ?? queryParams.actualCompletionDate,
  )

  const limit =
    Number.isFinite(queryParams.limit) && queryParams.limit >= 0
      ? queryParams.limit
      : Number.isFinite(queryParams.page_size) && queryParams.page_size >= 0
        ? queryParams.page_size
        : undefined

  const page_number = normalizePageNumber(queryParams, limit)

  const payload = {
    training_name: normalizeArrayParam(
      queryParams.training_name ?? queryParams.TrainingName ?? queryParams.search,
    ),
    financial_year: normalizeArrayParam(queryParams.financial_year ?? queryParams.FinancialYear),
    status: normalizeArrayParam(queryParams.status ?? queryParams.Status),
    training_assigned_date_from:
      queryParams.training_assigned_date_from ??
      queryParams.TrainingAssignedStartDate ??
      assignedRange.from,
    training_assigned_date_to:
      queryParams.training_assigned_date_to ??
      queryParams.TrainingAssignedEndDate ??
      assignedRange.to,
    training_due_date_from:
      queryParams.training_due_date_from ??
      queryParams.TrainingDueStartDate ??
      dueRange.from,
    training_due_date_to:
      queryParams.training_due_date_to ??
      queryParams.TrainingDueEndDate ??
      dueRange.to,
    actual_completion_date_from:
      queryParams.actual_completion_date_from ??
      queryParams.ActualCompletionStartDate ??
      closureRange.from,
    actual_completion_date_to:
      queryParams.actual_completion_date_to ??
      queryParams.ActualCompletionEndDate ??
      closureRange.to,
    order_by: normalizeArrayParam(queryParams.order_by),
    limit,
    page_number,
  }

  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return acc
    }

    acc[key] = value
    return acc
  }, {})
}

export const exportUserTrainings = async (queryParams = {}) => {
  try {
    const payload = buildUserTrainingExportPayload(queryParams)
    const response = await trainingApi.post(
      "/api/training/user/exportUserTrainings",
      Object.keys(payload).length ? payload : {},
      {
        responseType: "blob",
      },
    )
    return response
  } catch (error) {
    throw buildApiError(error, "Failed to export trainings.")
  }
}

export const buildTrainingExportPayload = (filters = {}) => {
  const assignedRange = extractDateRange(filters.assigned_date)
  const dueRange = extractDateRange(filters.due_date)
  const closureRange = extractDateRange(filters.closure_date)

  const payload = {
    training_name: normalizeArrayParam(
      Array.isArray(filters.training_name)
        ? filters.training_name.map((t) => t?.name ?? t)
        : filters.training_name
    ),
    financial_year: normalizeArrayParam(filters.financial_year),
    search: filters.search || undefined,
    training_assigned_date_from: assignedRange.from,
    training_assigned_date_to: assignedRange.to,
    training_due_date_from: dueRange.from,
    training_due_date_to: dueRange.to,
    activity_closure_date_from: closureRange.from,
    activity_closure_date_to: closureRange.to,
    order_by: normalizeArrayParam(filters.order_by),
  }

  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return acc
    }
    acc[key] = value
    return acc
  }, {})
}

export const exportTrainings = async (filters = {}) => {
  try {
    const payload = buildTrainingExportPayload(filters)
    const response = await trainingApi.post(
      "/api/training/training-export",
      payload,
      { responseType: "blob" },
    )
    return response
  } catch (error) {
    throw buildApiError(error, "Failed to export trainings.")
  }
}

export const createTraining = async (payload) => {
  try {
    const response = await trainingApi.post(
      "/api/training/createTraining",
      buildCreateTrainingPayload(payload),
    )
    return response.data
  } catch (error) {
    throw buildApiError(error, "Failed to create training.")
  }
}

export const getTrainings = async (queryParams = {}) => {
  try {
    const response = await trainingApi.post(
      "/api/training/listtrainings",
      buildTrainingListPayload(queryParams),
    )
    return response.data
  } catch (error) {
    throw buildApiError(error, "Failed to fetch trainings.")
  }
}

export const getUserTrainings = async (queryParams = {}) => {
  try {
    const response = await trainingApi.post(
      "/api/training/user/list",
      buildUserTrainingListPayload(queryParams),
    )
    return response.data
  } catch (error) {
    throw buildApiError(error, "Failed to fetch user trainings.")
  }
}

export const getUserTrainingMetadata = async () => {
  try {
    const response = await trainingApi.get("/api/training/user/metadata")
    return response.data
  } catch (error) {
    throw buildApiError(error, "Failed to fetch user training metadata.")
  }
}

export const uploadTrainingData = async (trainingId, file) => {
  try {
    const formData = new FormData()
    formData.append("file", file)

    const response = await trainingApi.post(`/api/training/${trainingId}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })

    return response.data
  } catch (error) {
    throw buildApiError(error, "Failed to upload training data.")
  }
}

export const updateTraining = async (trainingId, payload) => {
  try {
    const response = await trainingApi.put(
      `/api/training/${trainingId}`,
      buildUpdateTrainingPayload(payload),
    )
    return response.data
  } catch (error) {
    throw buildApiError(error, "Failed to update training.")
  }
}

export const downloadTrainingTemplate = async () => {
  try {
    const response = await trainingApi.get("/api/training/template/download", {
      responseType: "blob",
    })
    return response
  } catch (error) {
    throw buildApiError(error, "Failed to download template.")
  }
}

export const downloadTrainingFile = async (trainingId) => {
  try {
    const response = await trainingApi.get(`/api/training/${trainingId}/file`, {
      responseType: "blob",
    })
    return response
  } catch (error) {
    throw buildApiError(error, "Failed to download training file.")
  }
}
