import { docEventsApiGet } from "./axiosInstance";

export const getHub = async ({
  doc_types, // array<string> for filter by document types
  page = 1, // page number
  page_size = 10, // page size max size 100
  document_type, // string for getting more contents of specific document type upon scroll down
  applicability, // string for filter by applicability (ALL | DIVISION | EMPLOYEE)
  search, // Search name, summary, tags
} = {}) => {
  const response = await docEventsApiGet('/api/doc-events/documents/hub', {
    query: {
      doc_types,
      page,
      page_size,
      document_type,
      applicability,
      search,
    },
  })

  return response.data
}

export const getDocumentHubDetail = async (id) => {
  const response = await docEventsApiGet(`/api/doc-events/documents/hub/${id}`)
  return response.data
}

export const getKnowledgeItemDetail = async (id, itemType = "document") => {
  const normalizedItemType =
    typeof itemType === "string" && itemType.trim().length > 0
      ? itemType.trim().toLowerCase()
      : "document"

  const response = await docEventsApiGet(
    `/api/doc-events/documents/hub/${id}`
  )

  return response.data
}
