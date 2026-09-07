/** Reverse and 32x use timed seeks; native playback rates stay positive and at most 16x. */
export function createShuttleController(
  video: HTMLVideoElement,
  onChange: (playing: boolean, rate: number) => void,
  clock = {
    now: () => performance.now(),
    schedule: (callback: () => void) => window.setTimeout(callback, 1000 / 30),
    cancel: (id: number) => window.clearTimeout(id),
  },
) {
  let rate = video.playbackRate || 1;
  let seekingPlayback = false;
  let timer: number | undefined;
  let previousTime = 0;
  let generation = 0;

  function stopSeeking() {
    seekingPlayback = false;
    if (timer !== undefined) clock.cancel(timer);
    timer = undefined;
  }

  function pause() {
    generation++;
    stopSeeking();
    video.pause();
    onChange(false, rate);
  }

  function tick() {
    if (!seekingPlayback) return;
    const now = clock.now();
    // Do not jump across the clip when a background tab is throttled.
    const elapsed = Math.min((now - previousTime) / 1000, 0.25);
    if (!video.seeking && video.readyState >= 2) {
      const end = Number.isFinite(video.duration) ? video.duration : Infinity;
      const next = Math.min(end, Math.max(0, video.currentTime + rate * elapsed));
      video.currentTime = next;
      previousTime = now;
      if (next === 0 || next === end) {
        pause();
        return;
      }
    }
    timer = clock.schedule(tick);
  }

  function play() {
    const attempt = ++generation;
    stopSeeking();
    if (rate < 0 || rate > 16) {
      if (rate < 0 && video.currentTime <= 0) return pause();
      if (rate > 0 && video.ended) video.currentTime = 0;
      seekingPlayback = true;
      video.pause();
      previousTime = clock.now();
      timer = clock.schedule(tick);
      onChange(true, rate);
    } else {
      video.playbackRate = rate;
      void video.play().catch(() => {
        if (attempt === generation) onChange(false, rate);
      });
      onChange(true, rate);
    }
  }

  return {
    get seekingPlayback() {
      return seekingPlayback;
    },
    get playing() {
      return seekingPlayback || !video.paused;
    },
    get rate() {
      return rate;
    },
    pause,
    play,
    toggle() {
      if (seekingPlayback || !video.paused) pause();
      else play();
    },
    shuttle(direction: -1 | 1) {
      const sameDirection = (seekingPlayback || !video.paused) && Math.sign(rate) === direction;
      const nextSpeed = sameDirection
        ? ([1, 2, 4, 8, 16, 32].find((speed) => speed > Math.abs(rate)) ?? 32)
        : 1;
      rate = direction * nextSpeed;
      play();
    },
    setRate(next: number) {
      const playing = seekingPlayback || !video.paused;
      stopSeeking();
      rate = next;
      video.playbackRate = Math.min(Math.abs(next), 16);
      if (playing) play();
      else onChange(false, rate);
    },
    playAt(next: number) {
      rate = next;
      play();
    },
    step(frames: number, frameRate = 30) {
      pause();
      const duration = Number.isFinite(video.duration) ? video.duration : Infinity;
      video.currentTime = Math.max(0, Math.min(duration, video.currentTime + frames / frameRate));
    },
    dispose() {
      generation++;
      stopSeeking();
    },
  };
}

const INTERACTIVE =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="slider"], [role="spinbutton"], [role="menu"], [role="listbox"], [role="dialog"]';

export function playbackShortcut(
  event: Pick<
    KeyboardEvent,
    | "key"
    | "altKey"
    | "ctrlKey"
    | "metaKey"
    | "shiftKey"
    | "repeat"
    | "isComposing"
    | "defaultPrevented"
  > & { code?: string },
  target: { closest: (selector: string) => unknown } | null,
  editor: boolean,
  paused: boolean,
  pointerFocused = false,
) {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    target?.closest(INTERACTIVE)
  )
    return null;
  const key = event.key.toLowerCase();
  if (event.altKey) {
    if (!editor || event.shiftKey) return null;
    const code = event.code || `Key${key.toUpperCase()}`;
    if (code === "KeyJ" || code === "KeyL") {
      if (event.repeat) return "handled";
      return code === "KeyJ" ? "slowReverse" : "slowForward";
    }
    return null;
  }
  if (editor && event.shiftKey && key === " ") return event.repeat ? "handled" : "reverseNormal";
  if (event.shiftKey && !(editor && ["arrowleft", "arrowright"].includes(key))) return null;
  if (
    !pointerFocused &&
    target?.closest("button, a[href]") &&
    [" ", "arrowleft", "arrowright"].includes(key)
  )
    return null;
  if (event.repeat && [" ", "k", "f", "m", ...(editor ? ["j", "l"] : [])].includes(key))
    return "handled";
  if (key === " ") return "toggle";
  if (key === "k") return "pause";
  if (key === "f") return "fullscreen";
  if (key === "m") return "mute";
  if (editor && key === "j") return "reverse";
  if (editor && key === "l") return "forward";
  if (editor && paused && key === ",") return "stepBack";
  if (editor && paused && key === ".") return "stepForward";
  if (key === "arrowleft")
    return editor ? (event.shiftKey ? "stepBackTen" : "stepBack") : "seekBack";
  if (key === "arrowright")
    return editor ? (event.shiftKey ? "stepForwardTen" : "stepForward") : "seekForward";
  return null;
}

export type PlaybackAction = NonNullable<ReturnType<typeof playbackShortcut>>;

/** Editor shortcuts span its layout; public players retain their local focus boundary. */
export function bindPlaybackShortcuts(
  root: HTMLElement,
  editor: boolean,
  isPaused: () => boolean,
  dispatch: (action: PlaybackAction) => void,
) {
  const boundary = root.closest("[data-video-editor]") ?? root;
  const listenerTarget = editor ? document : root;
  let pointerFocused = false;
  let heldK = false;
  let direction: "j" | "l" | null = null;
  let chord = false;
  let holdTimer: number | undefined;

  function stopChord() {
    if (holdTimer !== undefined) window.clearTimeout(holdTimer);
    holdTimer = undefined;
    if (chord) dispatch("pause");
    chord = false;
  }
  function reset() {
    stopChord();
    heldK = false;
    direction = null;
  }
  function inScope(target: EventTarget | null) {
    return (
      target instanceof Element &&
      (boundary.contains(target) || (editor && target === document.body))
    );
  }
  function pointerDown(event: PointerEvent) {
    pointerFocused = inScope(event.target);
  }
  function focusIn(event: FocusEvent) {
    if (
      !inScope(event.target) ||
      (event.target instanceof Element && event.target.closest(INTERACTIVE))
    )
      reset();
  }
  function keyDown(event: Event) {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.key === "Tab") {
      pointerFocused = false;
      reset();
    }
    if (!inScope(event.target)) return;
    const target = event.target instanceof Element ? event.target : null;
    const action = playbackShortcut(event, target, editor, isPaused(), editor && pointerFocused);
    if (!action) {
      reset();
      return;
    }
    event.preventDefault();
    if (action === "handled") return;
    if (editor) {
      const key = event.key.toLowerCase();
      if (event.altKey || event.shiftKey) reset();
      else if (key === "k") heldK = true;
      else if (key === "j" || key === "l") direction = key;
      else reset();
      if (heldK && direction) {
        stopChord();
        chord = true;
        dispatch(direction === "j" ? "stepBack" : "stepForward");
        holdTimer = window.setTimeout(() => {
          holdTimer = undefined;
          dispatch(direction === "j" ? "slowReverse" : "slowForward");
        }, 200);
        return;
      }
    }
    dispatch(action);
  }
  function keyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (key === "k") {
      stopChord();
      heldK = false;
    }
    if (key === direction) {
      stopChord();
      direction = null;
    }
  }
  function visibilityChange() {
    if (document.hidden) reset();
  }
  listenerTarget.addEventListener("keydown", keyDown);
  document.addEventListener("keyup", keyUp);
  document.addEventListener("pointerdown", pointerDown);
  document.addEventListener("focusin", focusIn);
  document.addEventListener("visibilitychange", visibilityChange);
  window.addEventListener("blur", reset);
  return () => {
    reset();
    listenerTarget.removeEventListener("keydown", keyDown);
    document.removeEventListener("keyup", keyUp);
    document.removeEventListener("pointerdown", pointerDown);
    document.removeEventListener("focusin", focusIn);
    document.removeEventListener("visibilitychange", visibilityChange);
    window.removeEventListener("blur", reset);
  };
}
