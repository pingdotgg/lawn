import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "lawn:discussion-collapsed";

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // ignore storage failures
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }, []);

  return [collapsed, toggle] as const;
}
