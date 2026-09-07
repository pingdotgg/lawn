import { expect, test, type Page } from "@playwright/test";

const mediaState = (page: Page) =>
  page.locator("video").evaluate((video: HTMLVideoElement) => ({
    time: video.currentTime,
    paused: video.paused,
    rate: video.playbackRate,
    source: video.currentSrc,
  }));
async function ready(page: Page, path = "/") {
  await page.goto(path);
  await expect
    .poll(() => page.locator("video").evaluate((video: HTMLVideoElement) => video.readyState))
    .toBeGreaterThanOrEqual(2);
  await page.locator("video").evaluate((video: HTMLVideoElement) => {
    video.currentTime = 10;
  });
  await expect
    .poll(() => page.locator("video").evaluate((video: HTMLVideoElement) => video.seeking))
    .toBe(false);
  await page.getByRole("region", { name: "Video player" }).focus();
}

test("J/K/L, held keys, frame steps, Space, mute, fullscreen and browser shortcut guards", async ({
  page,
}) => {
  await ready(page);
  await page.keyboard.press("k");
  expect((await mediaState(page)).paused).toBe(true);
  await page.keyboard.press("ArrowRight");
  expect((await mediaState(page)).time).toBeCloseTo(10 + 1 / 30, 3);
  await page.keyboard.press(",");
  expect((await mediaState(page)).time).toBeCloseTo(10, 3);
  await page.keyboard.press("l");
  await page.keyboard.press("l");
  await expect.poll(async () => (await mediaState(page)).rate).toBe(2);
  await page.keyboard.down("l");
  await page.keyboard.down("l");
  await page.keyboard.up("l");
  expect((await mediaState(page)).rate).toBe(4);
  await page.keyboard.press("k");
  const stopped = (await mediaState(page)).time;
  await page.keyboard.press("k");
  await page.waitForTimeout(150);
  expect((await mediaState(page)).time).toBeCloseTo(stopped, 3);
  await page.keyboard.press("j");
  await expect(page.getByRole("button", { name: "Playback speed -1x", exact: true })).toBeVisible();
  await expect.poll(async () => (await mediaState(page)).time).toBeLessThan(stopped - 0.1);
  expect((await mediaState(page)).rate).toBeGreaterThan(0);
  await page.keyboard.press("j");
  await expect(page.getByRole("button", { name: "Playback speed -2x", exact: true })).toBeVisible();
  await page.keyboard.press("Space");
  const reverseStopped = (await mediaState(page)).time;
  await page.waitForTimeout(150);
  expect((await mediaState(page)).time).toBeCloseTo(reverseStopped, 3);
  await page.keyboard.press("Control+l");
  await page.getByRole("region", { name: "Video player" }).focus();
  expect((await mediaState(page)).paused).toBe(true);
  await page.keyboard.press("m");
  expect(await page.locator("video").evaluate((video: HTMLVideoElement) => video.muted)).toBe(true);
  await page.keyboard.press("f");
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.keyboard.press("f");
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
});

test("editable fields and nested contenteditable leave media alone", async ({ page }) => {
  await ready(page);
  for (const label of ["Comment", "Rich comment", "Editable slider"]) {
    await page.getByLabel(label, { exact: true }).focus();
    await page.keyboard.press("l");
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowRight");
    expect((await mediaState(page)).paused).toBe(true);
    expect((await mediaState(page)).time).toBeCloseTo(10, 3);
  }
  // The volume slider lives inside the shared player's shortcut boundary.
  await page.locator('input[type="range"]').first().focus();
  await page.keyboard.press("ArrowRight");
  expect((await mediaState(page)).time).toBeCloseTo(10, 3);
});

for (const mode of ["paused", "forward", "reverse"] as const) {
  test(`theater and comments preserve media identity, source, position and ${mode} playback`, async ({
    page,
  }) => {
    await ready(page);
    await page.getByRole("button", { name: /Quality/ }).click();
    await page.getByRole("button", { name: "Original", exact: true }).click();
    await expect.poll(async () => (await mediaState(page)).source).toContain("source=original");
    await expect
      .poll(() => page.locator("video").evaluate((video: HTMLVideoElement) => video.readyState))
      .toBeGreaterThanOrEqual(2);
    await page.locator("video").evaluate((video: HTMLVideoElement) => {
      video.currentTime = 10;
    });
    await expect
      .poll(() => page.locator("video").evaluate((video: HTMLVideoElement) => video.seeking))
      .toBe(false);
    const video = await page.locator("video").elementHandle();
    const region = page.getByRole("region", { name: "Video player" });
    const initialBox = await region.boundingBox();
    await region.focus();
    if (mode !== "paused") {
      await page.keyboard.press(mode === "forward" ? "l" : "j");
      await page.keyboard.press(mode === "forward" ? "l" : "j");
    } else {
      await page.getByRole("button", { name: "Playback speed 1x", exact: true }).click();
    }
    const before = await mediaState(page);
    const changes: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("sample.mp4")) changes.push(request.url());
    });
    await page.getByRole("button", { name: "Enter theater mode" }).click();
    await page.getByRole("button", { name: "Toggle comments" }).click();
    const expandedBox = await region.boundingBox();
    expect(expandedBox!.width).toBeGreaterThan(initialBox!.width);
    expect(expandedBox!.height).toBeGreaterThan(initialBox!.height);
    await page.getByRole("button", { name: "Toggle comments" }).click();
    await page.getByRole("button", { name: "Exit theater mode" }).click();
    expect(await video!.evaluate((element) => element === document.querySelector("video"))).toBe(
      true,
    );
    const after = await mediaState(page);
    expect(after.source).toBe(before.source);
    expect(after.rate).toBe(before.rate);
    expect(after.paused).toBe(before.paused);
    expect(Math.abs(after.time - before.time)).toBeLessThan(5);
    expect(changes).toEqual([]);
    if (mode === "paused") expect(after.time).toBeCloseTo(before.time, 3);
    if (mode === "forward")
      await expect.poll(async () => (await mediaState(page)).time).toBeGreaterThan(after.time);
    if (mode === "reverse") {
      await expect(
        page.getByRole("button", { name: "Playback speed -2x", exact: true }),
      ).toBeVisible();
      await expect.poll(async () => (await mediaState(page)).time).toBeLessThan(after.time);
    }
  });
}

test("public player retains arrow seeking without editor shuttle shortcuts", async ({ page }) => {
  await ready(page, "/?public");
  await page.keyboard.press("j");
  await page.keyboard.press("l");
  expect((await mediaState(page)).paused).toBe(true);
  await page.keyboard.press("ArrowLeft");
  expect((await mediaState(page)).time).toBeCloseTo(5, 3);
  await page.keyboard.press("k");
  expect((await mediaState(page)).paused).toBe(true);
});

test("focused player buttons retain native Space activation and K always pauses", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Play", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect.poll(async () => (await mediaState(page)).paused).toBe(false);
  await page.keyboard.press("k");
  await expect.poll(async () => (await mediaState(page)).paused).toBe(true);
  await page.getByRole("button", { name: "Enter theater mode" }).click();
  await page.keyboard.press("j");
  await expect(page.getByRole("button", { name: "Playback speed -1x", exact: true })).toBeVisible();
  await page.keyboard.press("k");
  const stopped = (await mediaState(page)).time;
  await page.waitForTimeout(150);
  expect((await mediaState(page)).time).toBeCloseTo(stopped, 3);
});

test("speed button cycles from the reverse shuttle magnitude instead of a stale native rate", async ({
  page,
}) => {
  await ready(page);
  await page.keyboard.press("j");
  await page.keyboard.press("j");
  await page.getByRole("button", { name: "Playback speed -2x", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Playback speed 0.5x", exact: true }),
  ).toBeVisible();
  await expect.poll(async () => (await mediaState(page)).rate).toBe(0.5);
  await expect.poll(async () => (await mediaState(page)).paused).toBe(false);
  const time = (await mediaState(page)).time;
  await expect.poll(async () => (await mediaState(page)).time).toBeGreaterThan(time);
});
