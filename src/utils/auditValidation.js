import * as yup from "yup";

import {
  isCheckpointRowPopulated,
  parseAuditDateRange,
  MAX_CHECKPOINT_TEXT_LENGTH,
} from "@/utils/auditHelpers";

/**
 * Shared detail fields required for both Save as Draft and Publish.
 * Audit Name is always required for either action.
 */
const auditNameField = yup
  .string()
  .transform((value) => String(value ?? "").trim())
  .required("Audit Name is required.");

/**
 * Yup schema for Save as Draft (details tab).
 * Audit name only — draft can be incomplete otherwise.
 */
export const auditDetailsDraftSchema = yup.object({
  audit_name: auditNameField,
});

/**
 * Yup schema for Publish — details tab required fields.
 * Audit Name + Department + Start & End date range.
 */
export const auditDetailsPublishSchema = yup.object({
  audit_name: auditNameField,
  vertical_div_deptt: yup
    .string()
    .transform((value) => String(value ?? "").trim())
    .required("Department is required."),
  date_range: yup
    .string()
    .transform((value) => String(value ?? "").trim())
    .required("Start & End dates are required.")
    .test(
      "full-date-range",
      "Select a valid start and end date.",
      (value) => {
        if (!value) return false;
        const { start_date, end_date } = parseAuditDateRange(value);
        return Boolean(start_date && end_date);
      },
    ),
});

/** Normalize audit form values for Yup detail schemas. */
export const toAuditDetailsFormValues = (audit) => ({
  audit_name: audit?.audit_name ?? "",
  vertical_div_deptt:
    audit?.vertical_div_deptt || audit?.department || "",
  date_range: audit?.date_range ?? "",
});

/** @deprecated Prefer toAuditDetailsFormValues */
export const toAuditDetailsPublishValues = toAuditDetailsFormValues;

async function runYupSchema(schema, values) {
  try {
    await schema.validate(values, { abortEarly: false });
    return { ok: true, errors: {} };
  } catch (error) {
    if (error?.name === "ValidationError") {
      const errors = {};
      (error.inner?.length ? error.inner : [error]).forEach((entry) => {
        const path = entry?.path;
        if (!path || errors[path]) return;
        errors[path] = entry.message;
      });
      return { ok: false, errors };
    }
    throw error;
  }
}

/**
 * Validate Audit Details for Save as Draft (audit name).
 */
export async function validateAuditDetailsForDraft(audit) {
  return runYupSchema(auditDetailsDraftSchema, toAuditDetailsFormValues(audit));
}

/**
 * Validate Audit Details for Publish (name, department, date range).
 */
export async function validateAuditDetailsForPublish(audit) {
  return runYupSchema(
    auditDetailsPublishSchema,
    toAuditDetailsFormValues(audit),
  );
}

/** @deprecated Prefer validateAuditDetailsForPublish */
export const auditPublishSchema = auditDetailsPublishSchema;
export const toAuditPublishValues = toAuditDetailsFormValues;
export const validateAuditForPublish = validateAuditDetailsForPublish;

const REQUIRED_CHECKPOINT_MSG = {
  checkpoint: "Audit Observation is required.",
  judgement_criteria: "Legal Provision is required.",
  planned_closure_date: "Planned Closure Date is required.",
};

const CHECKPOINT_MAX_LEN_MSG = {
  checkpoint: `Audit Observation cannot exceed ${MAX_CHECKPOINT_TEXT_LENGTH} characters.`,
  judgement_criteria: `Legal Provision cannot exceed ${MAX_CHECKPOINT_TEXT_LENGTH} characters.`,
};

/**
 * True when a row has any of the three publish-required fields partially set.
 * Completely blank rows are ignored (except the "need at least one" rule).
 */
export const isCheckpointPartiallyFilled = (row) => {
  if (!row) return false;
  if (String(row.checkpoint || "").trim()) return true;
  if (String(row.judgement_criteria || row.judgementCriteria || "").trim()) {
    return true;
  }
  if (String(row.planned_closure_date || "").trim()) return true;
  return false;
};

/**
 * Validate checkpoints for publish.
 * - Blank rows are ignored until none complete — then first row shows inline errors.
 * - Any partial row must complete Checkpoint, Judgement Criteria, Planned Closure Date.
 * - At least one fully complete checkpoint is required for publish.
 */
export function validateCheckpointsForPublish(checkpoints = []) {
  const list = Array.isArray(checkpoints) ? checkpoints : [];
  const errorsByRowId = {};
  const incompleteRowIds = [];
  let completeCount = 0;
  let consideredCount = 0;

  list.forEach((row) => {
    const rowId = String(row?.id ?? row?.checkpoint_id ?? "");
    if (!rowId) return;

    const checkpoint = String(row.checkpoint || "").trim();
    const criteria = String(
      row.judgement_criteria || row.judgementCriteria || "",
    ).trim();
    const planned = String(row.planned_closure_date || "").trim();

    const hasRequiredField = Boolean(checkpoint || criteria || planned);
    const hasOtherContent = isCheckpointRowPopulated(row) && !hasRequiredField;

    // Completely empty default row — skip for partial checks
    if (!hasRequiredField && !hasOtherContent) return;

    consideredCount += 1;

    const rowErrors = {};
    if (!checkpoint) rowErrors.checkpoint = REQUIRED_CHECKPOINT_MSG.checkpoint;
    else if (checkpoint.length > MAX_CHECKPOINT_TEXT_LENGTH) {
      rowErrors.checkpoint = CHECKPOINT_MAX_LEN_MSG.checkpoint;
    }
    if (!criteria) {
      rowErrors.judgement_criteria = REQUIRED_CHECKPOINT_MSG.judgement_criteria;
    } else if (criteria.length > MAX_CHECKPOINT_TEXT_LENGTH) {
      rowErrors.judgement_criteria = CHECKPOINT_MAX_LEN_MSG.judgement_criteria;
    }
    if (!planned) {
      rowErrors.planned_closure_date =
        REQUIRED_CHECKPOINT_MSG.planned_closure_date;
    }

    if (Object.keys(rowErrors).length > 0) {
      errorsByRowId[rowId] = rowErrors;
      incompleteRowIds.push(rowId);
    } else {
      completeCount += 1;
    }
  });

  if (consideredCount === 0 || completeCount === 0) {
    // No complete checkpoint — surface inline errors on first empty/incomplete row.
    if (Object.keys(errorsByRowId).length === 0 && list.length > 0) {
      const first = list[0];
      const firstId = String(first?.id ?? first?.checkpoint_id ?? "");
      if (firstId) {
        errorsByRowId[firstId] = { ...REQUIRED_CHECKPOINT_MSG };
        incompleteRowIds.push(firstId);
      }
    }
    return {
      ok: false,
      errorsByRowId,
      incompleteRowIds,
      completeCount,
      // client-side: no toast — inline only
      message: null,
    };
  }

  if (incompleteRowIds.length > 0) {
    return {
      ok: false,
      errorsByRowId,
      incompleteRowIds,
      completeCount,
      message: null,
    };
  }

  return {
    ok: true,
    errorsByRowId: {},
    incompleteRowIds: [],
    completeCount,
  };
}

/**
 * Full publish validation: details + checkpoints.
 * Prefer details tab when detail errors exist (even if calling from checkpoints).
 * `message` is null for client validation (inline only); callers must not toast it.
 */
export async function validateAuditPublishFull(audit, checkpoints = []) {
  const details = await validateAuditDetailsForPublish(audit);

  if (!details.ok) {
    return {
      ok: false,
      detailErrors: details.errors || {},
      checkpointErrors: {},
      focusTab: "details",
      message: null,
    };
  }

  const checkpointResult = validateCheckpointsForPublish(checkpoints);

  if (!checkpointResult.ok) {
    return {
      ok: false,
      detailErrors: {},
      checkpointErrors: checkpointResult.errorsByRowId || {},
      focusTab: "checkpoints",
      message: null,
      incompleteRowIds: checkpointResult.incompleteRowIds,
    };
  }

  return {
    ok: true,
    detailErrors: {},
    checkpointErrors: {},
    focusTab: null,
  };
}

/** Where to focus after a failed publish/draft validation. */
export function resolvePublishFocusTab(result) {
  if (!result || result.ok) return null;
  const detailErrors = result.detailErrors || {};
  if (
    result.focusTab === "details" ||
    Object.keys(detailErrors).length > 0
  ) {
    return "details";
  }
  if (result.focusTab === "checkpoints") return "checkpoints";
  return "details";
}
