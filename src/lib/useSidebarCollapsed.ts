import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "lawn:discussion-collapsed";
const listeners = new Set<() => void>();

let collapsed = false;
let initialized = false;

function initializeCollapsed() {
  if (initialized || typeof window === "undefined") return;

  initialized = true;
  try {
    collapsed = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Keep using the in-memory value when storage is unavailable.
  }
}

function getSnapshot() {
  initializeCollapsed();
  return collapsed;
}

function getServerSnapshot() {
  return false;
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function handleStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY && event.key !== null) return;

  initialized = true;
  collapsed = event.key === STORAGE_KEY && event.newValue === "1";
  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      initialized = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
      }
    }
  };
}

export function useSidebarCollapsed() {
  const sidebarCollapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    initializeCollapsed();
    collapsed = !collapsed;
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // The in-memory value remains usable when storage writes fail.
    }
    emitChange();
  }, []);

  return [sidebarCollapsed, toggle] as const;
}
