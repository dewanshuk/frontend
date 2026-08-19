import { ChevronRight, Home as HomeIcon } from "lucide-react";
import { Link } from "react-router-dom";

export default function OrchestrationBreadcrumb({ currentPage }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 font-sans text-sm leading-[1.4]"
    >
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-[#2563eb] transition-colors hover:text-blue-700"
      >
        <HomeIcon className="h-4 w-4 shrink-0" />
        <span>Home</span>
      </Link>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#b3b3b3]" aria-hidden="true" />
      <span className="text-[#757575]">Orchestration</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#b3b3b3]" aria-hidden="true" />
      <span className="font-medium text-[#1e1e1e]">{currentPage}</span>
    </nav>
  );
}
