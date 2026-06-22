export const VIDEO_FREEZE_GRACE_MS = 8_000;

export type VideoPlaybackHealthState = {
  lastMediaTime: number | null;
  lastPresentedFrames: number | null;
  frozenSinceMs: number | null;
  issueReported: boolean;
  hasSeenPresentedFrame: boolean;
  monitoringComplete: boolean;
};

export type VideoPlaybackObservation = {
  nowMs: number;
  mediaTime: number;
  presentedFrames: number;
  playing: boolean;
  seeking: boolean;
  buffering: boolean;
  visible: boolean;
};

export function createVideoPlaybackHealthState(): VideoPlaybackHealthState {
  return {
    lastMediaTime: null,
    lastPresentedFrames: null,
    frozenSinceMs: null,
    issueReported: false,
    hasSeenPresentedFrame: false,
    monitoringComplete: false,
  };
}

export function resetVideoPlaybackHealthWindow(
  state: VideoPlaybackHealthState,
  mediaTime: number | null = null,
  presentedFrames: number | null = null,
) {
  return {
    lastMediaTime: mediaTime,
    lastPresentedFrames: presentedFrames,
    frozenSinceMs: null,
    issueReported: state.issueReported,
    hasSeenPresentedFrame: state.hasSeenPresentedFrame,
    monitoringComplete: state.monitoringComplete,
  };
}

export function markVideoPlaybackIssueReported(state: VideoPlaybackHealthState) {
  return {
    ...state,
    frozenSinceMs: null,
    issueReported: true,
  };
}

export function observeVideoPlayback(
  state: VideoPlaybackHealthState,
  observation: VideoPlaybackObservation,
  freezeGraceMs = VIDEO_FREEZE_GRACE_MS,
) {
  const baseline = {
    lastMediaTime: observation.mediaTime,
    lastPresentedFrames: observation.presentedFrames,
  };

  if (
    state.monitoringComplete ||
    !observation.visible ||
    !observation.playing ||
    observation.seeking ||
    observation.buffering
  ) {
    return {
      state: {
        ...state,
        ...baseline,
        frozenSinceMs: null,
      },
      issueDetected: false,
    };
  }

  if (state.lastMediaTime === null || state.lastPresentedFrames === null) {
    return {
      state: {
        ...state,
        ...baseline,
        hasSeenPresentedFrame: state.hasSeenPresentedFrame || observation.presentedFrames > 0,
        monitoringComplete: state.monitoringComplete || observation.presentedFrames > 1,
      },
      issueDetected: false,
    };
  }

  const mediaAdvanced = observation.mediaTime > state.lastMediaTime + 0.01;
  const framesAdvanced = observation.presentedFrames > state.lastPresentedFrames;
  const presentedFrameDelta = observation.presentedFrames - state.lastPresentedFrames;
  const monitoringComplete =
    framesAdvanced && mediaAdvanced && (state.hasSeenPresentedFrame || presentedFrameDelta > 1);
  const hasSeenPresentedFrame =
    state.hasSeenPresentedFrame || observation.presentedFrames > state.lastPresentedFrames;
  const frozenSinceMs =
    monitoringComplete || framesAdvanced || !mediaAdvanced
      ? null
      : (state.frozenSinceMs ?? observation.nowMs);
  const issueDetected =
    !state.issueReported &&
    frozenSinceMs !== null &&
    observation.nowMs - frozenSinceMs >= freezeGraceMs;

  return {
    state: {
      ...state,
      ...baseline,
      frozenSinceMs: issueDetected ? null : frozenSinceMs,
      issueReported: state.issueReported || issueDetected,
      hasSeenPresentedFrame,
      monitoringComplete,
    },
    issueDetected,
  };
}
