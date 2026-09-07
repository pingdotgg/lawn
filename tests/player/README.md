Run `bun run test:player` after `bunx playwright install chromium`.
The suite starts a separate Vite harness and drives the production VideoPlayer and
VideoEditorLayout through Chromium at localhost. It checks shortcuts, real reverse
seeking, shared-player behavior, and media identity/state across layout changes.
It requires no Clerk or Convex credentials and does not exercise the authenticated
route or Mux/HLS recovery. The harness is not a production app route.

The generated fixture is a 20-second, 30 fps H.264 test pattern with no audio:

```sh
ffmpeg -f lavfi -i testsrc2=size=320x180:rate=30 -t 20 -c:v libx264 -preset fast -crf 35 -pix_fmt yuv420p -movflags +faststart tests/player/sample.mp4
```

Editor shortcuts apply when the player frame has focus. J/L shuttle at 1, 2, 4,
and 8 times speed; K pauses; Space toggles playback. Paused arrows and comma/period
step by 1/30 second. Lawn currently has no source frame-rate metadata, so this is
an approximation for non-30-fps and variable-frame-rate media. Reverse uses paused
seeks and has no audio; smoothness depends on source seek/decode latency.
