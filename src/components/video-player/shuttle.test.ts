import assert from "node:assert/strict";
import test from "node:test";
import { createShuttleController, playbackShortcut } from "./shuttle";

function fixture() {
  let now = 0;
  let callback: (() => void) | undefined;
  const media = {
    currentTime: 10,
    duration: 20,
    playbackRate: 1,
    paused: true,
    seeking: false,
    readyState: 4,
    pause() {
      this.paused = true;
    },
    play() {
      this.paused = false;
      return Promise.resolve();
    },
  };
  let state = { playing: false, rate: 1 };
  const controller = createShuttleController(
    media as unknown as HTMLVideoElement,
    (playing, rate) => {
      state = { playing, rate };
    },
    {
      now: () => now,
      schedule: (next) => {
        callback = next;
        return 1;
      },
      cancel: () => {
        callback = undefined;
      },
    },
  );
  return {
    media,
    controller,
    state: () => state,
    advance(ms: number) {
      now += ms;
      const next = callback;
      callback = undefined;
      next?.();
    },
  };
}

test("shuttle speeds escalate, cap and reset on direction changes or pause", () => {
  const { controller, media } = fixture();
  for (const speed of [1, 2, 4, 8, 8]) {
    controller.shuttle(1);
    assert.equal(media.playbackRate, speed);
  }
  controller.shuttle(-1);
  assert.equal(controller.rate, -1);
  for (const speed of [-2, -4, -8, -8]) {
    controller.shuttle(-1);
    assert.equal(controller.rate, speed);
  }
  assert.equal(media.paused, true);
  assert.ok(media.playbackRate > 0);
  controller.pause();
  controller.shuttle(-1);
  assert.equal(controller.rate, -1);
  controller.shuttle(1);
  assert.equal(media.playbackRate, 1);
});

test("reverse seeks, waits for pending seeks, stops at zero and cancels on pause/dispose", () => {
  const f = fixture();
  f.controller.shuttle(-1);
  f.advance(100);
  assert.equal(f.media.currentTime, 9.9);
  f.media.seeking = true;
  f.advance(100);
  assert.equal(f.media.currentTime, 9.9);
  f.media.seeking = false;
  f.advance(100);
  assert.ok(Math.abs(f.media.currentTime - 9.7) < 1e-8);
  f.controller.pause();
  f.advance(100);
  assert.ok(Math.abs(f.media.currentTime - 9.7) < 1e-8);
  f.controller.play();
  f.media.currentTime = 0.05;
  f.advance(100);
  assert.equal(f.media.currentTime, 0);
  assert.equal(f.state().playing, false);
  f.media.currentTime = 10;
  f.controller.play();
  f.controller.dispose();
  f.advance(100);
  assert.equal(f.media.currentTime, 10);
});

test("pause/resume preserves reverse speed and frame stepping stays paused at boundaries", () => {
  const f = fixture();
  f.controller.shuttle(-1);
  f.controller.shuttle(-1);
  f.controller.pause();
  f.controller.play();
  assert.equal(f.controller.rate, -2);
  assert.equal(f.controller.playing, true);
  f.controller.step(1);
  assert.equal(f.controller.playing, false);
  assert.ok(Math.abs(f.media.currentTime - (10 + 1 / 30)) < 1e-8);
  f.media.currentTime = 0;
  f.controller.step(-1);
  assert.equal(f.media.currentTime, 0);
  f.media.currentTime = 20;
  f.controller.step(1);
  assert.equal(f.media.currentTime, 20);
});

const event = {
  key: "k",
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  repeat: false,
  isComposing: false,
  defaultPrevented: false,
};
test("K always pauses; editor arrows step only while paused; public arrows retain five-second seeks", () => {
  for (const paused of [true, false])
    assert.equal(playbackShortcut(event, null, true, paused), "pause");
  assert.equal(playbackShortcut({ ...event, key: " " }, null, true, true), "toggle");
  assert.equal(playbackShortcut({ ...event, key: "ArrowLeft" }, null, true, true), "stepBack");
  assert.equal(playbackShortcut({ ...event, key: "ArrowRight" }, null, true, false), "seekForward");
  assert.equal(playbackShortcut({ ...event, key: "ArrowLeft" }, null, false, true), "seekBack");
  assert.equal(playbackShortcut({ ...event, key: "j" }, null, false, true), null);
});

test("modifiers, composition, editable controls, handled events and held shuttle keys are ignored", () => {
  for (const flag of [
    "altKey",
    "ctrlKey",
    "metaKey",
    "shiftKey",
    "isComposing",
    "defaultPrevented",
    "repeat",
  ])
    assert.equal(playbackShortcut({ ...event, key: "l", [flag]: true }, null, true, false), null);
  assert.equal(playbackShortcut(event, { closest: () => ({}) }, true, false), null);
  assert.equal(
    playbackShortcut({ ...event, key: "ArrowLeft", repeat: true }, null, true, true),
    "stepBack",
  );
});

test("shuttling from a custom forward rate uses the standard speed ladder", () => {
  const f = fixture();
  f.controller.setRate(1.25);
  f.controller.play();
  f.controller.shuttle(1);
  assert.equal(f.controller.rate, 2);
});

test("a stale rejected play does not overwrite subsequent reverse playback", async () => {
  const f = fixture();
  let rejectPlay: (reason: Error) => void = () => {};
  f.media.play = () =>
    new Promise<void>((_resolve, reject) => {
      rejectPlay = reject;
    });
  f.controller.play();
  f.controller.shuttle(-1);
  rejectPlay(new Error("Interrupted"));
  await Promise.resolve();
  assert.deepEqual(f.state(), { playing: true, rate: -1 });
});
