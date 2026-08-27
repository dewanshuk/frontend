import { auditApi, complianceApi, docEventsApiGet, trainingApi } from "./axiosInstance";
import {
  normalizeDueForMeData,
  normalizeHeadKpiData,
  normalizeTrainingSubcategories,
} from "./homeApiUtils";

export const getWhatsNew = async ({ page = 1, page_size = 10 } = {}) => {
  const response = await docEventsApiGet("/api/doc-events/home/whats-new", {
    query: {
      page,
      page_size,
    },
  });

  return response.data;
};

export const getDocumentGallery = async ({
  document_type,
  page = 1,
  page_size = 10,
} = {}) => {
  const response = await docEventsApiGet("/api/doc-events/home/document-gallery", {
    query: {
      document_type,
      page,
      page_size,
    },
  });

  return response.data;
};

export const getRecentActivity = async () => {
  const response = await complianceApi.get("/api/compliance/recent-activity");
  return response?.data ?? {};
};

export const getDueOverdueAudits = async () => {
  const response = await auditApi.get("/api/audit/due-overdue-audits");
  return response?.data ?? {};
};

export const getTrainingStatus = async () => {
  const response = await trainingApi.get("/api/training/user/training-status");
  return response?.data ?? {};
};

export const getUserDeclarationStatus = async () => {
  const response = await complianceApi.get(
    "/api/compliance/declarations/user-declaration-status",
  );
  return response?.data ?? {};
};

export const getTrainingStatusSummary = async () => {
  const response = await trainingApi.get("/api/training/user/training-status-summary");
  return response?.data ?? { summary: [] };
};

export const getApplicableTrainings = async () => {
  const response = await trainingApi.get("/api/training/user/applicable-trainings");
  return response?.data ?? { trainings: [] };
};

export const getTrainingCompletionSummary = async (trainingId) => {
  const response = await trainingApi.get(
    "/api/training/user/training-completion-summary",
    { params: { training_id: trainingId } },
  );
  return response?.data ?? { summary: [] };
};

export const exportTrainingCompletionSummary = async (trainingId) => {
  const response = await trainingApi.get(
    "/api/training/user/training-completion-summary/export",
    {
      params: { training_id: trainingId },
      responseType: "blob",
    },
  );
  return response;
};

export const getAuditHeadSummary = async () => {
  const response = await auditApi.get("/api/audit/audit-head-summary");
  return response?.data ?? { summary: [] };
};

export const exportAuditHeadSummary = async () => {
  const response = await auditApi.get("/api/audit/audit-head-summary/export", {
    responseType: "blob",
  });
  return response;
};

export const getDeclarationHeadSummary = async () => {
  const response = await complianceApi.get("/api/compliance/declarations/head-summary");
  return response?.data ?? { summary: [] };
};

export const exportDeclarationHeadSummary = async () => {
  const response = await complianceApi.get(
    "/api/compliance/declarations/head-summary/export",
    { responseType: "blob" },
  );
  return response;
};

export const getHeadKpiData = async () => {
  const [
    trainingSummaryResponse,
    auditSummaryResponse,
    declarationSummaryResponse,
    applicableTrainingsResponse,
  ] = await Promise.all([
    // Keep categories independent: one unavailable service must not erase the
    // valid summaries returned by the other services.
    getTrainingStatusSummary().catch(() => ({ summary: [] })),
    getAuditHeadSummary().catch(() => ({ summary: [] })),
    getDeclarationHeadSummary().catch(() => ({ summary: [] })),
    // Fetched up front so the Trainings KPI subcategories are ready on first paint.
    getApplicableTrainings().catch(() => ({ trainings: [] })),
  ]);

  return {
    sections: normalizeHeadKpiData({
      trainingSummary: trainingSummaryResponse,
      auditSummary: auditSummaryResponse,
      declarationSummary: declarationSummaryResponse,
    }),
    trainingSubcategories: normalizeTrainingSubcategories({
      applicableTrainings: applicableTrainingsResponse,
    }),
  };
};

export const getDueForMeData = async () => {
  const [auditResponse, trainingResponse, declarationResponse] = await Promise.all([
    // Keep sources independent: one unavailable service must not erase the due
    // and overdue items returned by the other services.
    getDueOverdueAudits().catch(() => ({})),
    getTrainingStatus().catch(() => ({})),
    getUserDeclarationStatus().catch(() => ({})),
  ]);

  return normalizeDueForMeData({
    auditData: auditResponse,
    trainingData: trainingResponse,
    declarationData: declarationResponse,
  });
};

export const extractRecentActivityItems = (payload) => {
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};
