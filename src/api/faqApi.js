import { docEventsApi } from "./axiosInstance";

let faqInFlightRequest = null;

/**
 * Fetch FAQs from the API.
 * Always hits the network (no long-lived cache) so returning to the FAQ page
 * after creating/updating FAQs shows fresh data without a hard browser reload.
 * Concurrent callers share the same in-flight request.
 */
export const getFaq = async () => {
  if (faqInFlightRequest) return faqInFlightRequest;

  faqInFlightRequest = docEventsApi
    .get("/api/doc-events/faq")
    .then((response) => response.data)
    .finally(() => {
      faqInFlightRequest = null;
    });

  return faqInFlightRequest;
};
