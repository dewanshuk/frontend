const firstNonEmpty = (...values) =>
  values.map((value) => String(value ?? "").trim()).find(Boolean) || "";

/** Recent-activity payloads name the request id differently per compliance type. */
export const getActivityRequestId = (activity) =>
  firstNonEmpty(
    activity?.requestId,
    activity?.request_id,
    activity?.recordId,
    activity?.record_id,
    activity?.queryId,
    activity?.query_id,
    activity?.id,
  );

export const getActivityType = (activity) =>
  firstNonEmpty(
    activity?.type,
    activity?.requestType,
    activity?.request_type,
    activity?.category,
    // Falls back to the title, which usually carries the type keyword
    // ("Gift Declaration", "Annual Declaration FY 25-26", ...).
    activity?.name,
    activity?.title,
  );

export const getActivitySubType = (activity) =>
  firstNonEmpty(activity?.subType, activity?.sub_type);

/**
 * Build a Compliance Helpdesk path that deep-links straight into the respond
 * modal of a single activity. Falls back to the plain listing when the payload
 * carries no usable id.
 */
export const buildComplianceActivityPath = (activity, basePath = "/compliance") => {
  const requestId = getActivityRequestId(activity);
  if (!requestId) return basePath;

  const params = new URLSearchParams({ requestId });
  const type = getActivityType(activity);
  if (type) params.set("type", type);
  const subType = getActivitySubType(activity);
  if (subType) params.set("subType", subType);

  return `${basePath}?${params.toString()}`;
};
