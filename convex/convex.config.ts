import { defineApp } from "convex/server";
import presence from "@convex-dev/presence/convex.config.js";
import autumn from "@useautumn/convex/convex.config";

const app = defineApp();

app.use(presence);
app.use(autumn);

export default app;
