import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";
import ForVideoEditors from "./-for-video-editors";

export const Route = createFileRoute("/for/video-editors")({
  head: () =>
    seoHead({
      title: "Video review for editors — frame-accurate feedback",
      description:
        "Video review built for editors. Frame-accurate comments, instant playback, no account required for reviewers. $5/month flat.",
      path: "/for/video-editors",
      ogImage: "/og/for-editors.png",
    }),
  component: ForVideoEditors,
});
