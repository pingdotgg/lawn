import { defineApp } from "convex/server";
import migrations from "@convex-dev/migrations/convex.config.js";
import presence from "@convex-dev/presence/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import stripe from "@convex-dev/stripe/convex.config.js";

const app = defineApp();

app.use(migrations);
app.use(presence);
app.use(rateLimiter);
app.use(stripe);

export default app;
