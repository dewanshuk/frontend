import { useState, useEffect } from "react";
import { getOrchestrationKPIs } from "../api/orchestration";

export const useOrchestrationKPIs = (refreshKey) => {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getOrchestrationKPIs();
        
        // Extract data from the API response structure
        const kpiData = response.data || response;
        setKpis(kpiData);
      } catch (err) {
        console.error("Error fetching KPIs:", err);
        setError(err.message || "Failed to fetch KPIs");
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  // Re-fetch when refreshKey changes (e.g., after a retry/refresh elsewhere)
  }, [refreshKey]);

  return { kpis, loading, error };
};
