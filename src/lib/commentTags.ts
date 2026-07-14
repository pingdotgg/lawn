/**
 * Helpers for comment-tag filtering in the discussion panel.
 *
 * Filter state:
 * - `null` means every tag is active (default) — show all comments, including untagged.
 * - a `Set` means only comments that include at least one of those tags are shown.
 */

export type ActiveTagFilter = Set<string> | null;

/** Collect unique tags from threads, preserving first-seen order and casing. */
export function collectUniqueTags(comments: Array<{ tags?: string[] }>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const comment of comments) {
    for (const tag of comment.tags ?? []) {
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(tag);
    }
  }
  return result;
}

/** Left-click: exclusive filter on a single tag. */
export function exclusiveSelectTag(_current: ActiveTagFilter, tag: string): ActiveTagFilter {
  return new Set([tag]);
}

/**
 * Right-click: toggle one tag without resetting the rest.
 * When currently showing all (`null`), toggling off means "all except this one".
 * When the result is every known tag, collapse back to `null` (show all).
 */
export function toggleTagFilter(
  current: ActiveTagFilter,
  tag: string,
  allTags: string[],
): ActiveTagFilter {
  const allKeys = allTags.map((t) => t.toLowerCase());
  const tagKey = tag.toLowerCase();

  if (current === null) {
    // All active → turn this one off.
    const remaining = allTags.filter((t) => t.toLowerCase() !== tagKey);
    if (remaining.length === 0) return new Set();
    return new Set(remaining);
  }

  const next = new Set(current);
  // Match by case-insensitive key but store display casing from allTags when adding.
  const existing = [...next].find((t) => t.toLowerCase() === tagKey);
  if (existing) {
    next.delete(existing);
  } else {
    const display = allTags.find((t) => t.toLowerCase() === tagKey) ?? tag;
    next.add(display);
  }

  if (next.size === 0) return next;

  if (allKeys.length > 0 && allKeys.every((k) => [...next].some((t) => t.toLowerCase() === k))) {
    return null;
  }

  return next;
}

export function isTagActive(filter: ActiveTagFilter, tag: string): boolean {
  if (filter === null) return true;
  const key = tag.toLowerCase();
  return [...filter].some((t) => t.toLowerCase() === key);
}

/** Whether a comment should be visible under the current filter. */
export function commentMatchesTagFilter(
  comment: { tags?: string[] },
  filter: ActiveTagFilter,
): boolean {
  if (filter === null) return true;
  if (filter.size === 0) return false;
  const tags = comment.tags ?? [];
  if (tags.length === 0) return false;
  const activeKeys = new Set([...filter].map((t) => t.toLowerCase()));
  return tags.some((t) => activeKeys.has(t.toLowerCase()));
}
