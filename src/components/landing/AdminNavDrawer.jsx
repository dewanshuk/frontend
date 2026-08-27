import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ChevronDown, X } from "lucide-react";
import { MARUTI_BLUE } from "./landingTheme";
import { cn } from "@/lib/utils";

/**
 * Left slide-out drawer opened from the header grid icon.
 * Lists admin / non-v2 app links, including nested children (e.g. Orchestration).
 */
export default function AdminNavDrawer({
  open,
  onClose,
  links = [],
  isLinkActive,
  requireLogin,
  isAuthenticated,
  onNavigate,
}) {
  const [openGroups, setOpenGroups] = useState({});

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const supportsStableGutter =
      typeof CSS !== "undefined" && CSS.supports?.("scrollbar-gutter", "stable");

    document.body.style.overflow = "hidden";
    // Only pad when scrollbar-gutter isn't already reserving space (avoids double shift).
    if (scrollbarWidth > 0 && !supportsStableGutter) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setOpenGroups((prev) => {
      const next = { ...prev };
      links.forEach((link) => {
        if (!link.children?.length) return;
        const childActive = link.children.some((child) => isLinkActive?.(child.to, child.exact));
        if (childActive) next[link.id ?? link.label] = true;
      });
      return next;
    });
  }, [open, links, isLinkActive]);

  if (typeof document === "undefined") return null;

  const renderLeaf = (link, { nested = false } = {}) => {
    const active = isLinkActive?.(link.to, link.exact);
    const baseClass = cn(
      "flex w-full items-center rounded-xl text-left font-medium transition",
      nested ? "px-4 py-2.5 text-sm" : "px-4 py-3 text-base",
      active ? "bg-[#171c8f]/10 text-[#171c8f]" : "text-[#171c4d] hover:bg-[#f4f6fb]",
      link.disabled && "cursor-default opacity-40 hover:bg-transparent",
    );

    if (link.disabled || !link.to?.startsWith("/")) {
      return (
        <span className={baseClass} aria-disabled="true">
          {link.label}
        </span>
      );
    }

    if (requireLogin && !isAuthenticated) {
      return (
        <button
          type="button"
          className={baseClass}
          onClick={() => {
            onNavigate?.(link);
            onClose();
          }}
        >
          {link.label}
        </button>
      );
    }

    return (
      <Link
        to={link.to}
        className={baseClass}
        aria-current={active ? "page" : undefined}
        onClick={onClose}
      >
        {link.label}
      </Link>
    );
  };

  return createPortal(
    <>
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300",
          open ? "visible opacity-100" : "invisible opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[70] flex h-full w-full max-w-[320px] flex-col border-r border-[#d9d9d9] bg-white shadow-[0_24px_60px_rgba(23,28,143,0.16)] transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Admin menu"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-[#d9d9d9]/60 px-5 py-5">
          <div className="min-w-0">
            <p
              className="text-xs font-bold uppercase tracking-[0.18em]"
              style={{ color: MARUTI_BLUE }}
            >
              Compliance Connect
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#737373] transition hover:bg-[#f4f4f4] hover:text-[#262626]"
            aria-label="Close admin menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {links.map((link) => {
              const groupKey = link.id ?? link.label;
              const hasChildren = Array.isArray(link.children) && link.children.length > 0;

              if (!hasChildren) {
                return <li key={groupKey}>{renderLeaf(link)}</li>;
              }

              const groupOpen = Boolean(openGroups[groupKey]);
              const groupActive = link.children.some((child) => isLinkActive?.(child.to, child.exact));

              return (
                <li key={groupKey}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-base font-medium transition",
                      groupActive
                        ? "bg-[#171c8f]/10 text-[#171c8f]"
                        : "text-[#171c4d] hover:bg-[#f4f6fb]",
                    )}
                    aria-expanded={groupOpen}
                    onClick={() =>
                      setOpenGroups((prev) => ({
                        ...prev,
                        [groupKey]: !prev[groupKey],
                      }))
                    }
                  >
                    <span>{link.label}</span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-[#737373] transition-transform",
                        groupOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {groupOpen ? (
                    <ul className="mt-1 space-y-0.5 border-l border-[#d9d9d9] ml-4 pl-2">
                      {link.children.map((child) => (
                        <li key={child.id ?? child.label}>
                          {renderLeaf(child, { nested: true })}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>,
    document.body,
  );
}
