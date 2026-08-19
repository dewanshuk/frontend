import { ChevronRight, Home as HomeIcon } from "lucide-react";
import { Link } from "react-router-dom";

export default function AuditBreadcrumb({
  currentPage,
  parentPage,
  parentPath,
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-500"
    >
      <Link
        to="/"
        className="inline-flex items-center gap-2 transition-colors hover:text-blue-600"
      >
        <HomeIcon className="h-4 w-4" />
        <span>Home</span>
      </Link>
      <ChevronRight className="h-4 w-4 text-gray-400" />
      <span className="text-gray-400">Audit</span>
      {parentPage && parentPath ? (
        <>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <Link
            to={parentPath}
            className="transition-colors hover:text-blue-600"
          >
            {parentPage}
          </Link>
        </>
      ) : null}
      <ChevronRight className="h-4 w-4 text-gray-400" />
      <span className="font-medium text-gray-700">{currentPage}</span>
    </nav>
  );
}
