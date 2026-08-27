import { useEffect, useState } from "react";
import { getAuditAccess } from "@/api/audit";

/**
 * Current user's audit authoring access.
 * Defaults and API failures deny access so restricted UI never flashes.
 *
 * Honours `MOCK_AUDIT_AS_AUDITOR` from config via getAuditAccess.
 */
export function useAuditAccess() {
  const [state, setState] = useState({
    allowed: false,
    reason: null,
    viewer_role: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const loadAccess = async () => {
      try {
        const access = await getAuditAccess();
        if (!cancelled) {
          setState({
            allowed: access.allowed === true,
            reason: access.reason,
            viewer_role: access.viewer_role ?? null,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            allowed: false,
            reason: null,
            viewer_role: null,
            loading: false,
          });
        }
      }
    };

    loadAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
