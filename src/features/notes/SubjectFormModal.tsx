import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

interface SubjectFormModalProps {
  open: boolean;
  mode: "create" | "rename";
  initialName?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

export function SubjectFormModal({
  open,
  mode,
  initialName = "",
  onClose,
  onSubmit,
}: SubjectFormModalProps) {
  const [name, setName] = useState(initialName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
    }
  }, [open, initialName]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give this subject a name.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={mode === "create" ? "New subject" : "Rename subject"}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        <Input
          label="Subject name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mathematics"
          autoFocus
          error={error ?? undefined}
        />
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          <Button type="button" variant="ghost" fullWidth onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : mode === "create" ? "Create" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
