import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Reusable confirm/cancel dialog, e.g. for delete confirmations. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-md)" }}>{message}</p>
      <div style={{ display: "flex", gap: "var(--space-sm)" }}>
        <Button type="button" variant="ghost" fullWidth onClick={onCancel} disabled={isConfirming}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          fullWidth
          onClick={onConfirm}
          disabled={isConfirming}
          style={danger ? { background: "var(--color-danger)" } : undefined}
        >
          {isConfirming ? "Please wait…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
