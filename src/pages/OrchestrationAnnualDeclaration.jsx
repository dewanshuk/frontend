import OrchestrationBreadcrumb from "../components/shared/OrchestrationBreadcrumb";
import AnnualDeclarationTable from "@/components/orchestration/annual-declaration/AnnualDeclarationTable";

export default function OrchestrationAnnualDeclaration() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden bg-[var(--sds-bg-subtle)]">
      <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden py-6 md:py-8">
        <OrchestrationBreadcrumb currentPage="Annual Declarations" />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <AnnualDeclarationTable />
        </div>
      </div>
    </div>
  );
}
