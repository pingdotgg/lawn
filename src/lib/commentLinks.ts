export type CommentTextPart =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

const URL_PATTERN = /https?:\/\/[^\s<]+/giu;
const TRAILING_PUNCTUATION = new Set([".", ",", "!", "?", ";", ":", "'", '"', ">"]);
const CLOSING_DELIMITERS = {
  ")": "(",
  "]": "[",
  "}": "{",
} as const;

function splitTrailingPunctuation(candidate: string) {
  // Count how many of each opening/closing delimiter the whole candidate
  // contains up front, so trimming runs in O(n) instead of re-scanning the
  // remaining string on every iteration (which is O(n^2) and lets a comment
  // with many unbalanced delimiters hang the renderer).
  const closingCounts = new Map<string, number>();
  const openingCounts = new Map<string, number>();

  for (const character of candidate) {
    if (character in CLOSING_DELIMITERS) {
      closingCounts.set(character, (closingCounts.get(character) ?? 0) + 1);
    } else {
      for (const closing of Object.keys(CLOSING_DELIMITERS)) {
        if (
          character ===
          CLOSING_DELIMITERS[closing as keyof typeof CLOSING_DELIMITERS]
        ) {
          openingCounts.set(closing, (openingCounts.get(closing) ?? 0) + 1);
        }
      }
    }
  }

  let end = candidate.length;

  while (end > 0) {
    const lastCharacter = candidate[end - 1];

    if (TRAILING_PUNCTUATION.has(lastCharacter)) {
      end -= 1;
      continue;
    }

    if (lastCharacter in CLOSING_DELIMITERS) {
      const closing = closingCounts.get(lastCharacter) ?? 0;
      const opening = openingCounts.get(lastCharacter) ?? 0;
      if (closing > opening) {
        closingCounts.set(lastCharacter, closing - 1);
        end -= 1;
        continue;
      }
    }

    break;
  }

  return {
    link: candidate.slice(0, end),
    trailingText: candidate.slice(end),
  };
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

function appendText(parts: CommentTextPart[], value: string) {
  if (!value) return;

  const previousPart = parts.at(-1);
  if (previousPart?.type === "text") {
    previousPart.value += value;
    return;
  }

  parts.push({ type: "text", value });
}

export function parseCommentLinks(text: string) {
  const parts: CommentTextPart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const candidate = match[0];
    const matchIndex = match.index;

    appendText(parts, text.slice(cursor, matchIndex));

    const { link, trailingText } = splitTrailingPunctuation(candidate);
    if (link && isValidHttpUrl(link)) {
      parts.push({ type: "link", value: link, href: link });
      appendText(parts, trailingText);
    } else {
      appendText(parts, candidate);
    }

    cursor = matchIndex + candidate.length;
  }

  appendText(parts, text.slice(cursor));
  return parts;
}
