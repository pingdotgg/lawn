import { defineApp } from "convex/server";
import presence from "@convex-dev/presence/convex.config.js";
import stripe from "@convex-dev/stripe/convex.config.js";

const app = defineApp();

app.use(presence);
app.use(stripe);

export default app;
