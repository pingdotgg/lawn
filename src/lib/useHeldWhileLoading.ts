import { useEffect, useState } from "react";

/**
 * While `value` is loading (undefined), keep returning the last loaded value for
 * up to `holdMs` so fast switches don't flash a loading state.
 */
export function useHeldWhileLoading<T>(value: T | undefined, holdMs = 250) {
  const [held, setHeld] = useState(value);
  const [expired, setExpired] = useState(false);
  const isLoading = value === undefined;

  if (!isLoading && value !== held) setHeld(value);
  if (!isLoading && expired) setExpired(false);

  useEffect(() => {
    if (!isLoading) return;
    const timeout = window.setTimeout(() => setExpired(true), holdMs);
    return () => window.clearTimeout(timeout);
  }, [isLoading, holdMs]);

  if (!isLoading) return value;
  return expired ? undefined : held;
}
