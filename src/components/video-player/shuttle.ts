/** Reverse is seek-driven: HTMLMediaElement does not portably support negative rates. */
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
  let reversing = false;
  let timer: number | undefined;
  let previousTime = 0;
  let generation = 0;

  function stopReverse() {
    reversing = false;
    if (timer !== undefined) clock.cancel(timer);
    timer = undefined;
  }

  function pause() {
    generation++;
    stopReverse();
    video.pause();
    onChange(false, rate);
  }

  function tick() {
    if (!reversing) return;
    const now = clock.now();
    // Do not jump across the clip when a background tab is throttled.
    const elapsed = Math.min((now - previousTime) / 1000, 0.25);
    if (!video.seeking && video.readyState >= 2) {
      const next = Math.max(0, video.currentTime + rate * elapsed);
      video.currentTime = next;
      previousTime = now;
      if (next === 0) {
        pause();
        return;
      }
    }
    timer = clock.schedule(tick);
  }

  function play() {
    const attempt = ++generation;
    stopReverse();
    if (rate < 0) {
      if (video.currentTime <= 0) return pause();
      reversing = true;
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
    get reversing() {
      return reversing;
    },
    get playing() {
      return reversing || !video.paused;
    },
    get rate() {
      return rate;
    },
    pause,
    play,
    toggle() {
      if (reversing || !video.paused) pause();
      else play();
    },
    shuttle(direction: -1 | 1) {
      const sameDirection = (reversing || !video.paused) && Math.sign(rate) === direction;
      const nextSpeed = sameDirection
        ? ([1, 2, 4, 8].find((speed) => speed > Math.abs(rate)) ?? 8)
        : 1;
      rate = direction * nextSpeed;
      play();
    },
    setRate(next: number) {
      const playing = reversing || !video.paused;
      stopReverse();
      rate = next;
      video.playbackRate = next;
      if (playing) play();
      else onChange(false, rate);
    },
    step(direction: -1 | 1, frameRate = 30) {
      pause();
      const duration = Number.isFinite(video.duration) ? video.duration : Infinity;
      video.currentTime = Math.max(
        0,
        Math.min(duration, video.currentTime + direction / frameRate),
      );
    },
    dispose() {
      generation++;
      stopReverse();
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
  >,
  target: { closest: (selector: string) => unknown } | null,
  editor: boolean,
  paused: boolean,
) {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    target?.closest(INTERACTIVE)
  )
    return null;
  const key = event.key.toLowerCase();
  if (target?.closest("button, a[href]") && [" ", "arrowleft", "arrowright"].includes(key))
    return null;
  if (event.repeat && !["arrowleft", "arrowright", ",", "."].includes(key)) return null;
  if (key === " ") return "toggle";
  if (key === "k") return "pause";
  if (key === "f") return "fullscreen";
  if (key === "m") return "mute";
  if (editor && key === "j") return "reverse";
  if (editor && key === "l") return "forward";
  if (editor && paused && key === ",") return "stepBack";
  if (editor && paused && key === ".") return "stepForward";
  if (key === "arrowleft") return editor && paused ? "stepBack" : "seekBack";
  if (key === "arrowright") return editor && paused ? "stepForward" : "seekForward";
  return null;
}
