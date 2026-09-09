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

// ---------------------------------------------------------------------
// Rich content / legacy plain-text compatibility
//
// Notes Phase 1 stored plain text directly in `content`. Notes Phase 2
// stores TipTap-generated HTML in the same column instead (no schema
// change needed — it's still just `text`). These helpers let both kinds
// of content coexist: old notes open and edit fine, and get saved back
// as proper HTML the next time they're saved.
// ---------------------------------------------------------------------

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

/** True if `content` already looks like HTML (Phase 2+ note). */
export function isRichContent(content: string): boolean {
  return HTML_TAG_PATTERN.test(content);
}

/** Wraps legacy plain-text content as safe HTML paragraphs, preserving
 * blank-line paragraph breaks and single line breaks, so it loads into
 * the rich editor with no data loss or visual change. */
export function plainTextToHtml(text: string): string {
  if (!text.trim()) return "<p></p>";
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${escape(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Plain-text rendering of note content, whether it's legacy plain text
 * or Phase 2 HTML — used for previews/summaries. */
export function htmlToPlainText(content: string): string {
  if (!isRichContent(content)) return content;
  // Insert a space at block-element boundaries first, so e.g. a heading
  // followed by a paragraph doesn't collapse into one run-on word once
  // tags are stripped.
  const spaced = content.replace(/<\/(p|h[1-6]|li|div)>/gi, "</$1> ");
  const div = document.createElement("div");
  div.innerHTML = spaced;
  return div.textContent ?? div.innerText ?? "";
}

/** Short, single-line preview of a note's content (plain text or HTML). */
export function previewContent(content: string, maxLength = 90): string {
  const flattened = htmlToPlainText(content).replace(/\s+/g, " ").trim();
  if (!flattened) return "No content yet";
  return flattened.length > maxLength ? `${flattened.slice(0, maxLength).trimEnd()}…` : flattened;
}
