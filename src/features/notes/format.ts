/** "Edited 2h ago" / "Edited yesterday" style label from an ISO timestamp. */
export function formatUpdatedLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `Edited ${diffMin}m ago`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `Edited ${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Edited yesterday";
  if (diffDays < 7) return `Edited ${diffDays} days ago`;

  return `Edited ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

/** Short, single-line preview of a note's plain-text content. */
export function previewContent(content: string, maxLength = 90): string {
  const flattened = content.replace(/\s+/g, " ").trim();
  if (!flattened) return "No content yet";
  return flattened.length > maxLength ? `${flattened.slice(0, maxLength).trimEnd()}…` : flattened;
}
