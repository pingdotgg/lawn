export type DashboardSort = "last-uploaded" | "alphabetical";

export type DashboardSortableItem = {
  _id: string;
  name: string;
  lastUploadedAt?: number;
};

export function normalizeDashboardSortText(value: string) {
  return value.normalize("NFKD").toLocaleLowerCase("en-US");
}

export function sortDashboardItems<const T extends DashboardSortableItem>(
  items: readonly T[],
  sort: DashboardSort,
) {
  return [...items].sort((a, b) => {
    if (sort === "last-uploaded") {
      if (a.lastUploadedAt === undefined || b.lastUploadedAt === undefined) {
        if (a.lastUploadedAt !== b.lastUploadedAt) {
          return a.lastUploadedAt === undefined ? 1 : -1;
        }
      } else if (a.lastUploadedAt !== b.lastUploadedAt) {
        return a.lastUploadedAt < b.lastUploadedAt ? 1 : -1;
      }
    }

    const aName = normalizeDashboardSortText(a.name);
    const bName = normalizeDashboardSortText(b.name);
    if (aName !== bName) return aName < bName ? -1 : 1;
    return a._id.localeCompare(b._id);
  });
}
