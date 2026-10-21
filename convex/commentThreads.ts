// Groups a video's comments into one-level threads.
//
// `parentId` is optional, so comments written before replies existed stay at the
// root. A reply points at a top-level comment. Anything deeper (or whose parent
// row is gone) is still returned: deeper replies sit on the root comment, and a
// missing parent becomes its own thread. Callers never drop a comment.

type ThreadableComment = {
  _id: string;
  parentId?: string;
  timestampSeconds: number;
  _creationTime: number;
};

export function threadComments<T extends ThreadableComment>(comments: readonly T[]) {
  const byId = new Map(comments.map((comment) => [comment._id, comment]));
  const topLevel: T[] = [];
  const repliesByRoot = new Map<string, T[]>();

  const threadRootId = (comment: T) => {
    let current = comment;
    const seen = new Set<string>();

    while (current.parentId) {
      if (seen.has(current._id)) return undefined;
      seen.add(current._id);

      const parent = byId.get(current.parentId);
      if (!parent) return undefined;
      // Stop at the first comment that is itself a root: no parent, or a parent
      // that is not in this video's comment set.
      if (!parent.parentId || !byId.has(parent.parentId)) return parent._id;
      current = parent;
    }

    return undefined;
  };

  for (const comment of comments) {
    const rootId = threadRootId(comment);
    if (!rootId) {
      topLevel.push(comment);
      continue;
    }

    const replies = repliesByRoot.get(rootId);
    if (replies) {
      replies.push(comment);
    } else {
      repliesByRoot.set(rootId, [comment]);
    }
  }

  topLevel.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  for (const replies of repliesByRoot.values()) {
    replies.sort((a, b) => a._creationTime - b._creationTime);
  }

  return topLevel.map((comment) => ({
    ...comment,
    replies: repliesByRoot.get(comment._id) ?? [],
  }));
}
