import { ConvexError } from "convex/values";

export const MAX_COMMENT_TAGS = 8;
export const MAX_COMMENT_TAG_LENGTH = 24;

// Letters or numbers, with single simple separators between those groups.
const COMMENT_TAG_PATTERN = /^[\p{L}\p{N}]+(?:[ ./_+#&'/-][\p{L}\p{N}]+)*$/u;

export type ActiveCommentTags = readonly string[] | "all";

export type CommentTagFilter = { kind: "all" } | { kind: "only"; keys: readonly string[] };

type CommentTagFields = {
  _id: string;
  parentId?: string;
  tags?: readonly string[] | undefined;
};

type TagTree = {
  tags?: readonly string[] | undefined;
  replies?: readonly TagTree[] | undefined;
};

export function commentTagKey(tag: string) {
  return tag.trim().toLowerCase();
}

export function normalizeCommentTag(raw: string) {
  const tag = raw.trim().replace(/\s+/g, " ");
  if (!tag) {
    throw new ConvexError("Enter a tag");
  }
  if (tag.length > MAX_COMMENT_TAG_LENGTH) {
    throw new ConvexError(`Tags must be ${MAX_COMMENT_TAG_LENGTH} characters or fewer`);
  }
  if (!COMMENT_TAG_PATTERN.test(tag)) {
    throw new ConvexError("Tags can only use letters, numbers, and simple separators");
  }
  return tag;
}

export function normalizeCommentTags(rawTags: readonly string[]) {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of rawTags) {
    const tag = normalizeCommentTag(raw);
    const key = commentTagKey(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  if (tags.length > MAX_COMMENT_TAGS) {
    throw new ConvexError(`Comments can have at most ${MAX_COMMENT_TAGS} tags`);
  }
  return tags;
}

export function commentTagsEqual(current: readonly string[] | undefined, next: readonly string[]) {
  const existing = current ?? [];
  return existing.length === next.length && existing.every((tag, index) => tag === next[index]);
}

// "all" is the default badge state: every comment stays visible, including
// untagged ones. A list is an explicit filter, so a comment must have one of
// those tags. Matching is case-insensitive.
export function commentMatchesTagFilter(
  tags: readonly string[] | undefined,
  activeTags: ActiveCommentTags,
) {
  if (activeTags === "all") return true;
  const active = new Set(activeTags.map(commentTagKey));
  return (tags ?? []).some((tag) => active.has(commentTagKey(tag)));
}

export function filterCommentsByTags<T extends CommentTagFields>(
  comments: readonly T[],
  activeTags: ActiveCommentTags,
) {
  if (activeTags === "all") return [...comments];

  const byId = new Map(comments.map((comment) => [comment._id, comment]));
  const include = new Set<string>();
  for (const comment of comments) {
    if (!commentMatchesTagFilter(comment.tags, activeTags)) continue;
    include.add(comment._id);
    if (comment.parentId && byId.has(comment.parentId)) {
      include.add(comment.parentId);
    }
  }
  return comments.filter((comment) => include.has(comment._id));
}

export function filterThreadedComments<
  T extends CommentTagFields & { replies: readonly CommentTagFields[] },
>(threads: readonly T[], activeTags: ActiveCommentTags) {
  if (activeTags === "all") return [...threads];

  const flat: CommentTagFields[] = [];
  for (const thread of threads) {
    flat.push(thread);
    for (const reply of thread.replies) flat.push(reply);
  }
  const included = new Set(filterCommentsByTags(flat, activeTags).map((comment) => comment._id));

  const filtered: T[] = [];
  for (const thread of threads) {
    if (!included.has(thread._id)) continue;
    filtered.push({
      ...thread,
      replies: thread.replies.filter((reply) => included.has(reply._id)),
    });
  }
  return filtered;
}

export function collectCommentTags(comments: readonly TagTree[]) {
  const seen = new Set<string>();
  const tags: string[] = [];
  const visit = (comment: TagTree) => {
    for (const tag of comment.tags ?? []) {
      const key = commentTagKey(tag);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      tags.push(tag);
    }
    for (const reply of comment.replies ?? []) visit(reply);
  };
  for (const comment of comments) visit(comment);
  return tags;
}

export function soloCommentTag(tag: string): CommentTagFilter {
  return { kind: "only", keys: [commentTagKey(tag)] };
}

export function toggleCommentTag(
  current: CommentTagFilter,
  tag: string,
  tagKeys: readonly string[],
): CommentTagFilter {
  const key = commentTagKey(tag);
  const keys = new Set(current.kind === "all" ? tagKeys : current.keys);
  if (keys.has(key)) keys.delete(key);
  else keys.add(key);
  if (tagKeys.length > 0 && tagKeys.every((candidate) => keys.has(candidate))) {
    return { kind: "all" };
  }
  return { kind: "only", keys: [...keys] };
}

export function activeTagsForFilter(filter: CommentTagFilter): ActiveCommentTags {
  return filter.kind === "all" ? "all" : filter.keys;
}

export function pruneCommentTagFilter(
  filter: CommentTagFilter,
  tagKeys: readonly string[],
): CommentTagFilter {
  if (filter.kind !== "only" || filter.keys.length === 0) return filter;
  if (filter.keys.some((key) => tagKeys.includes(key))) return filter;
  return { kind: "all" };
}
