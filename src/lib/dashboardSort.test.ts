import assert from "node:assert/strict";
import test from "node:test";
import { sortDashboardItems } from "./dashboardSort";

const items = [
  { _id: "c", name: "Zulu" },
  { _id: "b", name: "alpha", lastUploadedAt: 20 },
  { _id: "a", name: "Beta", lastUploadedAt: 20 },
];

test("sorts by newest upload with deterministic alphabetical ties and empty folders last", () => {
  assert.deepEqual(
    sortDashboardItems(items, "last-uploaded").map((item) => item._id),
    ["b", "a", "c"],
  );
});

test("sorts alphabetically without mutating the source", () => {
  assert.deepEqual(
    sortDashboardItems(items, "alphabetical").map((item) => item._id),
    ["b", "a", "c"],
  );
  assert.equal(items[0].name, "Zulu");
});
