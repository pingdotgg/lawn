import { createFileRoute } from "@tanstack/react-router";
import Homepage from "./-home";

export const Route = createFileRoute("/")({
  component: Homepage,
});
