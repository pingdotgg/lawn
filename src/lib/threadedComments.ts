/**
 * Depth-first walk of a threaded comment tree (arbitrary nesting).
 */
export function walkThreadedComments<T extends { replies: T[] }>(
  comments: T[],
  visit: (comment: T, depth: number) => void,
  depth = 0,
) {
  for (const comment of comments) {
    visit(comment, depth);
    if (comment.replies.length > 0) {
      walkThreadedComments(comment.replies, visit, depth + 1);
    }
  }
}
