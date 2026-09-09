import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * A simple, mobile-first bottom sheet used for confirmations and short
 * forms (e.g. creating/renaming a subject). Closes on backdrop click or
 * Escape. Kept intentionally minimal — not a general-purpose dialog system.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(36, 28, 21, 0.35)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "var(--app-max-width)",
          background: "var(--color-card)",
          borderTopLeftRadius: "var(--radius-lg)",
          borderTopRightRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
          paddingBottom: "calc(var(--space-lg) + env(safe-area-inset-bottom))",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-md)",
        }}
      >
        {title && <h2 style={{ fontSize: "var(--text-lg)" }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
