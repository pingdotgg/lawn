import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("./routes/auth/layout.tsx", [
    route("sign-in/*", "./routes/auth/sign-in.tsx"),
    route("sign-up/*", "./routes/auth/sign-up.tsx"),
  ]),
  index("./routes/home.tsx"),
  route("mono", "./routes/mono.tsx"),
  route("invite/:token", "./routes/invite.tsx"),
  route("share/:token", "./routes/share.tsx"),
  route("dashboard", "./routes/dashboard/layout.tsx", [
    index("./routes/dashboard/index.tsx"),
    route(":teamSlug", "./routes/dashboard/team.tsx"),
    route(":teamSlug/settings", "./routes/dashboard/settings.tsx"),
    route(":teamSlug/:projectId", "./routes/dashboard/project.tsx"),
    route(":teamSlug/:projectId/:videoId", "./routes/dashboard/video.tsx"),
  ]),
] satisfies RouteConfig;
