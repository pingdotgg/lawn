import { createFileRoute } from "@tanstack/react-router";
import WatchPage from "./-watch";

export const Route = createFileRoute("/watch/$publicId")({
  component: WatchPage,
});
