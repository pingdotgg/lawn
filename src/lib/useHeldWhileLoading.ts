import { useEffect, useState } from "react";

/**
 * While `value` is loading (undefined), keep returning the last loaded value for
 * up to `holdMs` so fast switches don't flash a loading state. `isHeld` is true
 * while that stale value is shown; use it only for rendering, never for side effects.
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

  if (!isLoading) return { value, isHeld: false };
  if (expired || held === undefined) return { value: undefined, isHeld: false };
  return { value: held, isHeld: true };
}
