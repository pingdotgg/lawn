import test from "node:test";
import assert from "node:assert/strict";
import { createAsyncTaskQueue, createFrameCoalescedPublisher } from "@/lib/videoUpload";

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test("the upload queue starts at most two files at a time", async () => {
  const queue = createAsyncTaskQueue(2);
  const gates = Array.from({ length: 5 }, deferred);
  const started: number[] = [];
  let active = 0;
  let maxActive = 0;

  const uploads = gates.map((gate, index) =>
    queue.add(async () => {
      started.push(index);
      active += 1;
      maxActive = Math.max(maxActive, active);
      await gate.promise;
      active -= 1;
      return index;
    }),
  );

  await flushMicrotasks();
  assert.deepEqual(started, [0, 1]);

  gates[0].resolve();
  await flushMicrotasks();
  await flushMicrotasks();
  assert.deepEqual(started, [0, 1, 2]);

  for (const gate of gates) gate.resolve();
  assert.deepEqual(await Promise.all(uploads), [0, 1, 2, 3, 4]);
  assert.equal(maxActive, 2);
});

test("a failed queued upload releases its slot for the next file", async () => {
  const queue = createAsyncTaskQueue(1);
  const first = queue.add(async () => {
    throw new Error("failed");
  });
  const second = queue.add(async () => "uploaded");

  await assert.rejects(first, /failed/);
  assert.equal(await second, "uploaded");
});

test("progress publication coalesces updates and flushes the final value", () => {
  const published: number[] = [];
  const scheduledFrames: Array<() => void> = [];
  const publisher = createFrameCoalescedPublisher(
    (progress: number) => published.push(progress),
    (callback) => {
      let active = true;
      scheduledFrames.push(() => {
        if (active) callback();
      });
      return () => {
        active = false;
      };
    },
  );

  publisher.publish(10);
  publisher.publish(25);
  assert.deepEqual(published, []);
  assert.equal(scheduledFrames.length, 1);

  scheduledFrames[0]();
  assert.deepEqual(published, [25]);

  publisher.publish(60);
  const supersededFrame = scheduledFrames[1];
  publisher.flush(100);
  supersededFrame();
  assert.deepEqual(published, [25, 100]);

  publisher.publish(50);
  const cancelledFrame = scheduledFrames[2];
  publisher.cancel();
  cancelledFrame();
  assert.deepEqual(published, [25, 100]);
});
