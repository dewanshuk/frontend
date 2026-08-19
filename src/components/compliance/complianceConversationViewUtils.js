const pickFirst = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue
    const text = String(value).trim()
    if (text) return text
  }
  return undefined
}

export const formatQueryTypeLabel = (value) => {
  if (!value) return "-"
  const raw = String(value).trim()
  if (!raw) return "-"
  const lower = raw.toLowerCase()
  if (lower === "other" || lower === "others") return "Other"
  if (lower === "complyshield" || lower === "comply shield") return "Complyshield"
  if (lower === "gift") return "Gift"
  if (lower === "r5.18" || lower === "r5_18") return "R5.18"
  if (lower === "cobce") return "COBCE"
  if (lower === "coi") return "COI"
  // Preserve prior uppercase display for other known codes / free text.
  return raw.toUpperCase()
}

export const formatComplaintTypeLabel = (value) => formatQueryTypeLabel(value)

export const mergeEntrySources = (entry = {}) => ({
  ...(entry?.data && typeof entry.data === "object" ? entry.data : {}),
  ...entry,
})

export const getQueryDetailsFromPayload = (payload = {}, firstEntry = {}) => {
  const merged = mergeEntrySources(firstEntry)
  return {
    title: pickFirst(payload.title, merged.title) ?? "-",
    queryType: formatQueryTypeLabel(
      pickFirst(
        payload.queryType,
        payload.query_type,
        merged.queryType,
        merged.query_type,
        payload.subType,
      ),
    ),
    description:
      pickFirst(
        payload.description,
        merged.description,
        merged.complaintDetails,
        merged.complaint_details,
      ) ?? "-",
  }
}

export const getComplaintDetailsFromPayload = (payload = {}, firstEntry = {}) => {
  const merged = mergeEntrySources(firstEntry)
  return {
    complaintType: formatComplaintTypeLabel(
      pickFirst(
        payload.complaintType,
        payload.complaint_type,
        merged.complaintType,
        merged.complaint_type,
        payload.subType,
      ),
    ),
    complaintDetails:
      pickFirst(
        payload.complaintDetails,
        payload.complaint_details,
        merged.complaintDetails,
        merged.complaint_details,
        merged.description,
      ) ?? "-",
  }
}

export const formatInitialQueryDetails = (data = {}) => {
  const details = getQueryDetailsFromPayload(data)
  return [
    `Query Type: ${details.queryType}`,
    `Title: ${details.title}`,
    `Description: ${details.description}`,
  ].join("\n")
}

export const formatInitialComplaintDetails = (data = {}) => {
  const details = getComplaintDetailsFromPayload(data)
  return [
    `Complaint Type: ${details.complaintType}`,
    `Details: ${details.complaintDetails}`,
  ].join("\n")
}

export const getConversationEntryMessageText = (entry) =>
  pickFirst(entry?.message, entry?.content, entry?.text, entry?.body, entry?.comment) ?? ""

export const getConversationEntryDetailsText = (entry, kind) => {
  const message = getConversationEntryMessageText(entry)
  if (message) return message

  const merged = mergeEntrySources(entry)
  if (kind === "query") {
    return formatInitialQueryDetails(merged)
  }
  if (kind === "complaint") {
    return formatInitialComplaintDetails(merged)
  }

  return (
    pickFirst(
      merged.description,
      merged.complaintDetails,
      merged.complaint_details,
      merged.title,
    ) ?? ""
  )
}

/** First history card body: structured payload details (not a free-text message). */
export const getInitialConversationDetailsText = (entry, kind) => {
  const merged = mergeEntrySources(entry)
  if (kind === "query") return formatInitialQueryDetails(merged)
  if (kind === "complaint") return formatInitialComplaintDetails(merged)
  if (kind === "gift") {
    const status = pickFirst(merged.status)
    const lines = [
      `Status: ${status ? String(status).replace(/_/g, " ") : "-"}`,
      `Person: ${pickFirst(merged.person) ?? "-"}`,
      `Organization: ${pickFirst(merged.organization) ?? "-"}`,
      `Approx Value (INR): ${pickFirst(merged.approxValueInr, merged.approxValueINR) ?? "-"}`,
      `Portal Approval Taken: ${pickFirst(merged.portalApprovalTaken) ?? "-"}`,
    ]
    const portalNumber = pickFirst(merged.portalNumber)
    if (portalNumber) lines.push(`Portal Number: ${portalNumber}`)
    const title = pickFirst(merged.title)
    if (title) lines.push(`Title: ${title}`)
    const description = pickFirst(merged.description)
    if (description) lines.push(`Description: ${description}`)
    return lines.join("\n")
  }

  return (
    pickFirst(
      merged.description,
      merged.natureOfViolation,
      merged.complaintDetails,
      merged.complaint_details,
      merged.title,
    ) ?? ""
  )
}

export const getConversationEntryActor = (entry) =>
  pickFirst(entry?.actorId, entry?.actor_id, entry?.actor, entry?.staffId, entry?.staff_id) ??
  "Unknown"

/** User names use a lighter purple; compliance team stays blue. */
export const getConversationActorNameClass = (actor) =>
  String(actor ?? "").toLowerCase().includes("user")
    ? "text-[#A78BFA]"
    : "text-[#1E40AF]"

export const getConversationEntryDateTime = (entry) =>
  pickFirst(entry?.dateTime, entry?.date_time, entry?.createdAt, entry?.created_at, entry?.timestamp)
