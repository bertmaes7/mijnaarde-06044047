import { useEffect, useCallback, useState } from "react";

interface UseUnsavedChangesWarningProps {
  isDirty: boolean;
  onConfirmLeave?: () => void;
}

export function useUnsavedChangesWarning({ isDirty }: UseUnsavedChangesWarningProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Handle browser back/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleNavigate = useCallback(
    (navigateFn: () => void) => {
      if (isDirty) {
        setPendingNavigation(() => navigateFn);
        setShowDialog(true);
      } else {
        navigateFn();
      }
    },
    [isDirty]
  );

  const confirmNavigation = useCallback(() => {
    setShowDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);

  const cancelNavigation = useCallback(() => {
    setShowDialog(false);
    setPendingNavigation(null);
  }, []);

  return {
    showDialog,
    handleNavigate,
    confirmNavigation,
    cancelNavigation,
  };
}
