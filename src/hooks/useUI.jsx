import { useCallback, useState } from "react";
import CenterToast from "@/components/shared/CenterToast";

const TOAST_DURATION_MS = 3500;

export default function useUI() {
  const [toast, setToast] = useState({
    open: false,
    variant: "success",
    message: "",
  });

  const closeToast = useCallback(() => {
    setToast((prev) => ({ ...prev, open: false }));
  }, []);

  const showToast = useCallback((variant, message) => {
    setToast({ open: true, variant, message });
    window.setTimeout(() => {
      setToast((prev) => (prev.open ? { ...prev, open: false } : prev));
    }, TOAST_DURATION_MS);
  }, []);

  const success = useCallback((message) => {
    showToast("success", message);
  }, [showToast]);

  const error = useCallback((message) => {
    showToast("error", message);
  }, [showToast]);

  const warning = useCallback((message) => {
    showToast("warning", message);
  }, [showToast]);

  const Toast = useCallback(
    () => (
      <CenterToast
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={closeToast}
      />
    ),
    [toast, closeToast],
  );

  return {
    success,
    error,
    warning,
    closeToast,
    toast,
    Toast,
  };
}