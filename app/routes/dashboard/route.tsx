import { createFileRoute } from "@tanstack/react-router";
import DashboardLayout from "./-layout";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});
