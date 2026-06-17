import { formatTimestamp } from "@/lib/utils";

interface CsvComment {
  text: string;
  timestampSeconds: number;
}

interface CsvCommentThread extends CsvComment {
  replies: CsvComment[];
}

function escapeCsvCell(value: string) {
  const spreadsheetSafeValue = /^\s*[=+\-@]/.test(value)
    ? `'${value}`
    : value;
  return `"${spreadsheetSafeValue.replaceAll('"', '""')}"`;
}

export function buildCommentsCsv(comments: CsvCommentThread[]) {
  const rows = comments.flatMap((comment) => [
    comment,
    ...comment.replies.map((reply) => ({
      ...reply,
      text: `Reply: ${reply.text}`,
    })),
  ]);

  return [
    "Timestamp,Comment",
    ...rows.map((comment) =>
      [
        escapeCsvCell(formatTimestamp(comment.timestampSeconds)),
        escapeCsvCell(comment.text),
      ].join(","),
    ),
  ].join("\r\n");
}

export function buildCommentsCsvFilename(videoTitle: string) {
  const slug = videoTitle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return `${slug || "video"}-comments.csv`;
}
