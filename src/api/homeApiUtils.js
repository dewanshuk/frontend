const toArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
};

const formatDueLabel = (days, isOverdue) => {
    if (days === null || days === undefined || days === "") {
        return isOverdue ? "Overdue" : "Due";
    }

    const numericDays = toNumber(days);
    if (!numericDays) {
        return isOverdue ? "Overdue" : "Due";
    }

    const suffix = numericDays === 1 ? "day" : "days";
    return isOverdue ? `Overdue by ${numericDays} ${suffix}` : `Due in ${numericDays} ${suffix}`;
};

const normalizeAuditItems = (auditData, section) => {
    const rawItems = section === "due"
        ? toArray(auditData?.due_audits ?? auditData?.dueAudits ?? auditData?.due ?? auditData?.["due_audits"])
        : toArray(auditData?.overdue_audits ?? auditData?.overdueAudits ?? auditData?.overdue ?? auditData?.["overdue-audits"]);

    return rawItems
        .filter(Boolean)
        .map((item, index) => ({
            id: item?.audit_id ?? `audit-${section}-${index + 1}`,
            name: item?.audit_name ?? `Audit ${index + 1}`,
            status: item?.overdue_text ?? formatDueLabel(item?.overdue_by_days ?? item?.due_in_days, section === "overdue"),
            days: item?.overdue_by_days ?? item?.due_in_days,
            source: "audit",
        }));
};

const normalizeTrainingItems = (trainingData, section) => {
    const rawItems = section === "due"
        ? toArray(trainingData?.top_due ?? trainingData?.due_items ?? trainingData?.due)
        : toArray(trainingData?.top_overdue ?? trainingData?.overdue_items ?? trainingData?.overdue);

    return rawItems
        .filter(Boolean)
        .map((item, index) => ({
            id: item?.training_id ?? item?.training_link ?? `training-${section}-${index + 1}`,
            name: item?.training_name ?? `Training ${index + 1}`,
            status: item?.overdue_text ?? formatDueLabel(section === "overdue" ? item?.overdue_days : item?.due_days, section === "overdue"),
            days: section === "overdue" ? item?.overdue_days : item?.due_days,
            link: item?.training_link ?? item?.trainingLink ?? "",
            source: "training",
        }));
};

const normalizeDeclarationItem = (declarationData) => {
    if (!declarationData || typeof declarationData !== "object") {
        return [];
    }

    const id =
        declarationData?.annual_declaration_id ??
        declarationData?.user_annual_declaration_id ??
        declarationData?.declaration_id ??
        declarationData?.id;
    const name = declarationData?.name ?? declarationData?.declaration_name;
    const hasDueSignal =
        declarationData?.overdue !== undefined ||
        declarationData?.days !== undefined ||
        declarationData?.overdue_days !== undefined ||
        declarationData?.due_days !== undefined;

    // Ignore empty API payloads so we do not invent placeholder rows.
    if (!id && !name && !hasDueSignal) {
        return [];
    }

    const isOverdue = declarationData?.overdue === true;
    const days = declarationData?.days ?? declarationData?.overdue_days ?? declarationData?.due_days;

    const requestId =
        declarationData?.request_id ??
        declarationData?.requestId ??
        id;

    return [
        {
            id: id ?? "declaration-1",
            name: name || "Annual Declaration",
            status: formatDueLabel(days, isOverdue),
            days,
            requestId: requestId ?? "",
            type: declarationData?.type || "Annual Declaration",
            subType: declarationData?.sub_type ?? declarationData?.subType ?? "",
            source: "declaration",
        },
    ];
};

export const normalizeHeadKpiData = ({ trainingSummary = {}, auditSummary = {}, declarationSummary = {} } = {}) => {
    const trainingItems = toArray(trainingSummary?.summary)
        .map((group, index) => {
            const totalPending = toArray(group?.trainings).reduce((sum, item) => sum + toNumber(item?.pending_count), 0);
            return {
                label: group?.group || `Training Group ${index + 1}`,
                value: totalPending,
            };
        })
        .filter((item) => item.value > 0 || item.label !== "Training Group 1");

    const auditItems = toArray(auditSummary?.summary)
        .map((item) => ({
            label: item?.group_name || item?.grouping_label || item?.group || "Unassigned",
            value: toNumber(item?.pending_checkpoints),
        }))
        .filter((item) => item.value > 0 || item.label !== "Unassigned");

    const declarationItems = toArray(declarationSummary?.summary).map((item) => ({
        label:
            item?.division_cluster ||
            item?.grouping_label ||
            item?.group_name ||
            item?.group ||
            "Unassigned",
        value: toNumber(item?.cobce_coi_completion_percentage),
    }));

    return {
        "Training Summary": trainingItems,
        "Audit Summary": auditItems,
        "Declaration Summary": declarationItems,
    };
};

/**
 * Build one KPI subcategory per applicable training. Bars are loaded on demand
 * from the training completion summary endpoint, so no series is set here.
 */
export const normalizeTrainingSubcategories = ({ applicableTrainings = {} } = {}) => {
    const trainings = toArray(applicableTrainings?.trainings);
    if (trainings.length === 0) return [];

    return trainings
        .map((training, index) => {
            const trainingId = training?.training_id ?? training?.trainingId;
            const trainingName = training?.training_name ?? training?.trainingName;
            if (!trainingId && !trainingName) return null;

            return {
                id: String(trainingId || trainingName || `training-${index + 1}`),
                label: trainingName || trainingId || `Training ${index + 1}`,
                trainingId: trainingId || "",
                series: [],
            };
        })
        .filter(Boolean);
};

/** Map a training completion summary payload onto chart-ready bars. */
export const mapTrainingCompletionSeries = (payload = {}) =>
    toArray(payload?.summary).map((item, index) => ({
        label: item?.group || item?.grouping_label || `Group ${index + 1}`,
        value: toNumber(item?.completion_percentage),
    }));

export const normalizeDueForMeData = ({ auditData = {}, trainingData = {}, declarationData = {} } = {}) => {
    const auditDueItems = normalizeAuditItems(auditData, "due");
    const auditOverdueItems = normalizeAuditItems(auditData, "overdue");
    const trainingDueItems = normalizeTrainingItems(trainingData, "due");
    const trainingOverdueItems = normalizeTrainingItems(trainingData, "overdue");
    const declarationDueItems = !declarationData?.overdue
        ? normalizeDeclarationItem(declarationData)
        : [];
    const declarationOverdueItems = declarationData?.overdue
        ? normalizeDeclarationItem(declarationData)
        : [];

    const dueItems = [...auditDueItems, ...trainingDueItems, ...declarationDueItems];
    const overdueItems = [
        ...auditOverdueItems,
        ...trainingOverdueItems,
        ...declarationOverdueItems,
    ];

    return {
        dueItems,
        overdueItems,
        dueCount:
            (toNumber(trainingData?.due_count) || trainingDueItems.length) +
            auditDueItems.length +
            declarationDueItems.length,
        overdueCount:
            (toNumber(trainingData?.overdue_count) || trainingOverdueItems.length) +
            auditOverdueItems.length +
            declarationOverdueItems.length,
    };
};
