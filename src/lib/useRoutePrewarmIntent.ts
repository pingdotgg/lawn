import { useEffect, useMemo, useRef } from "react";
import { PREWARM_DEBOUNCE_MS } from "@/lib/convexRouteData";

type PrewarmFn = () => void | Promise<void>;

type UseRoutePrewarmIntentOptions = {
  debounceMs?: number;
};

type RoutePrewarmIntentHandlers = {
  onMouseEnter: () => void;
  onFocus: () => void;
  onTouchStart: () => void;
  onMouseLeave: () => void;
  onBlur: () => void;
};

export function createRoutePrewarmIntent(
  prewarmFn: PrewarmFn,
  options: UseRoutePrewarmIntentOptions = {},
) {
  const debounceMs = options.debounceMs ?? PREWARM_DEBOUNCE_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = undefined;
  };

  const schedule = () => {
    if (timer) return;

    timer = setTimeout(() => {
      timer = undefined;
      Promise.resolve(prewarmFn()).catch((error) => {
        console.warn("Route prewarm intent failed", error);
      });
    }, debounceMs);
  };

  const handlers: RoutePrewarmIntentHandlers = {
    onMouseEnter: schedule,
    onFocus: schedule,
    onTouchStart: schedule,
    onMouseLeave: cancel,
    onBlur: cancel,
  };

  return { handlers, cancel };
}

export function useRoutePrewarmIntent(
  prewarmFn: PrewarmFn,
  options: UseRoutePrewarmIntentOptions = {},
): RoutePrewarmIntentHandlers {
  const prewarmRef = useRef(prewarmFn);
  prewarmRef.current = prewarmFn;

  const controller = useMemo(
    () =>
      createRoutePrewarmIntent(
        () => prewarmRef.current(),
        options,
      ),
    [options.debounceMs],
  );

  useEffect(() => {
    return () => {
      controller.cancel();
    };
  }, [controller]);

  return controller.handlers;
}
