import { useEffect, useState } from "react";
import { IconButton } from "@/components/IconButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { NoteAttachment } from "./types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageAttachment(fileType: string): boolean {
  return fileType.startsWith("image/");
}

function PdfIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 3.5h9L19 8v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M14 3.5V8h5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <text x="7" y="16.5" fontSize="6.5" fontWeight="800" fill="currentColor" fontFamily="sans-serif">
        PDF
      </text>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m1 0v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7h10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

interface AttachmentListProps {
  attachments: NoteAttachment[];
  onDelete: (attachment: NoteAttachment) => Promise<void>;
  /** When provided, tapping a PDF calls this instead of opening the raw
   * signed URL in a new tab — used to route into the in-app PDF viewer. */
  onOpenPdf?: (attachment: NoteAttachment) => void;
}

export function AttachmentList({ attachments, onDelete, onOpenPdf }: AttachmentListProps) {
  const [viewingImage, setViewingImage] = useState<NoteAttachment | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<NoteAttachment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewingImage) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setViewingImage(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewingImage]);

  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => isImageAttachment(a.fileType));
  const files = attachments.filter((a) => !isImageAttachment(a.fileType));

  async function handleDeleteConfirmed() {
    if (!attachmentToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(attachmentToDelete);
      setAttachmentToDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Couldn't remove this attachment.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
      {images.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
          {images.map((attachment) => (
            <div key={attachment.id} style={{ position: "relative", width: 84, height: 84 }}>
              <button
                onClick={() => setViewingImage(attachment)}
                aria-label={`View ${attachment.fileName}`}
                style={{
                  width: 84,
                  height: 84,
                  padding: 0,
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                  cursor: "pointer",
                  background: "var(--color-card-alt)",
                }}
              >
                <img
                  src={attachment.url}
                  alt={attachment.fileName}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </button>
              <IconButton
                icon={<TrashIcon />}
                aria-label={`Remove ${attachment.fileName}`}
                onClick={() => setAttachmentToDelete(attachment)}
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  width: 28,
                  height: 28,
                  minWidth: 28,
                  minHeight: 28,
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "var(--shadow-sm)",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
          {files.map((attachment) => (
            <div
              key={attachment.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-xs)",
                padding: "var(--space-xs) var(--space-sm)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-card-alt)",
              }}
            >
              {onOpenPdf ? (
                <button
                  onClick={() => onOpenPdf(attachment)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-xs)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--color-text-primary)",
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <span style={{ color: "var(--color-primary)", flexShrink: 0 }}>
                    <PdfIcon />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {attachment.fileName}
                    </span>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
                      {formatFileSize(attachment.fileSize)}
                    </span>
                  </span>
                </button>
              ) : (
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-xs)",
                    textDecoration: "none",
                    color: "var(--color-text-primary)",
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <span style={{ color: "var(--color-primary)", flexShrink: 0 }}>
                    <PdfIcon />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {attachment.fileName}
                    </span>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
                      {formatFileSize(attachment.fileSize)}
                    </span>
                  </span>
                </a>
              )}
              <IconButton
                icon={<TrashIcon />}
                aria-label={`Remove ${attachment.fileName}`}
                onClick={() => setAttachmentToDelete(attachment)}
                style={{ flexShrink: 0, width: 32, height: 32, minWidth: 32, minHeight: 32 }}
              />
            </div>
          ))}
        </div>
      )}

      {viewingImage && (
        <div
          role="presentation"
          onClick={() => setViewingImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20, 15, 10, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: "var(--space-lg)",
          }}
        >
          <img
            src={viewingImage.url}
            alt={viewingImage.fileName}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "var(--radius-sm)" }}
          />
          <IconButton
            icon={<CloseIcon />}
            aria-label="Close"
            onClick={() => setViewingImage(null)}
            style={{
              position: "fixed",
              top: "var(--space-lg)",
              right: "var(--space-lg)",
              background: "rgba(255, 255, 255, 0.15)",
              color: "#fff",
            }}
          />
        </div>
      )}

      {deleteError && (
        <p style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)" }}>{deleteError}</p>
      )}

      <ConfirmDialog
        open={attachmentToDelete !== null}
        title="Remove attachment?"
        message={`"${attachmentToDelete?.fileName}" will be permanently removed from this note.`}
        confirmLabel="Remove"
        danger
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setAttachmentToDelete(null)}
      />
    </div>
  );
}
