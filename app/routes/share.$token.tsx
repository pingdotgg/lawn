import { createFileRoute } from "@tanstack/react-router";
import SharePage from "./-share";

export const Route = createFileRoute("/share/$token")({
  component: SharePage,
});
