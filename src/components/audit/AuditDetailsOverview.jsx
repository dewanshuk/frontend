import { AuditStatusBadge } from "./auditStatusStyles";

function DetailField({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-5 py-4">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-gray-900">{value || "—"}</p>
    </div>
  );
}

function SummaryStat({ label, value, accentClass }) {
  return (
    <div className="rounded-xl border bg-white px-5 py-4 shadow-sm">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${accentClass}`}>{value}</p>
    </div>
  );
}

export default function AuditDetailsOverview({ audit }) {
  if (!audit) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <SummaryStat label="Total" value={audit.checkpoints_total} accentClass="text-gray-900" />
        <SummaryStat label="Closed" value={audit.checkpoints_closed} accentClass="text-green-700" />
        <SummaryStat label="Open" value={audit.checkpoints_open} accentClass="text-blue-700" />
        <SummaryStat label="Due for me" value={audit.checkpoints_due_for_me} accentClass="text-amber-700" />
        <SummaryStat
          label="Overdue for me"
          value={audit.checkpoints_overdue_for_me}
          accentClass="text-red-700"
        />
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Audit Information</h2>
            <p className="mt-1 text-sm text-gray-500">
              Overview of audit metadata and ownership details.
            </p>
          </div>
          <AuditStatusBadge status={audit.status} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DetailField label="Audit ID" value={audit.audit_id} />
          <DetailField label="Audit Name" value={audit.audit_name} />
          <DetailField label="Audit Type" value={audit.audit_type} />
          <DetailField label="Department" value={audit.department} />
          <DetailField label="Start Date" value={audit.start_date} />
          <DetailField label="End Date" value={audit.end_date} />
          <DetailField label="Audit Lead" value={audit.audit_lead} />
          <DetailField label="Created By" value={audit.created_by} />
        </div>

        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4">
          <p className="text-sm font-medium text-gray-500">Description</p>
          <p className="mt-2 text-sm leading-6 text-gray-800">{audit.description}</p>
        </div>
      </div>
    </div>
  );
}
