const STORAGE_KEY = "lawn.guest_name";
export const MAX_GUEST_NAME_LENGTH = 40;

export function readStoredGuestName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeStoredGuestName(name: string) {
  if (typeof window === "undefined") return;
  const trimmed = name.trim().slice(0, MAX_GUEST_NAME_LENGTH);
  try {
    if (trimmed) {
      window.localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore quota / private mode failures.
  }
}
