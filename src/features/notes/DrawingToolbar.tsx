import { IconButton } from "@/components/IconButton";
import type { DrawingTool } from "./types";

function PenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HighlighterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 16.5 4.5 20M9.5 12.5l4.8-6.2a1.6 1.6 0 0 1 2.4-.2l1.2 1.2a1.6 1.6 0 0 1-.2 2.4l-6.2 4.8-2.9-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.5 20.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M18 13.5 9.5 5a1.7 1.7 0 0 0-2.4 0L3.4 8.7a1.7 1.7 0 0 0 0 2.4l6.4 6.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.8 17.5H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 8H4V5M4 8a8 8 0 1 1-1.5 5.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M17 8h3V5m0 3a8 8 0 1 0 1.5 5.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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

interface DrawingToolbarProps {
  tool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  thicknessStep: 0 | 1 | 2;
  onThicknessStepChange: (step: 0 | 1 | 2) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClear: () => void;
}

export function DrawingToolbar({
  tool,
  onToolChange,
  thicknessStep,
  onThicknessStepChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClear,
}: DrawingToolbarProps) {
  const dotSizes = [6, 9, 13];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-xs)",
        overflowX: "auto",
        padding: "var(--space-xs) var(--space-md)",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-bg)",
        WebkitOverflowScrolling: "touch",
        flexShrink: 0,
      }}
    >
      <IconButton icon={<PenIcon />} aria-label="Pen" active={tool === "pen"} onClick={() => onToolChange("pen")} style={{ flexShrink: 0 }} />
      <IconButton
        icon={<HighlighterIcon />}
        aria-label="Highlighter"
        active={tool === "highlighter"}
        onClick={() => onToolChange("highlighter")}
        style={{ flexShrink: 0 }}
      />
      <IconButton
        icon={<EraserIcon />}
        aria-label="Eraser"
        active={tool === "eraser"}
        onClick={() => onToolChange("eraser")}
        style={{ flexShrink: 0 }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "0 var(--space-2xs)",
          borderLeft: "1px solid var(--color-border)",
          borderRight: "1px solid var(--color-border)",
          marginLeft: "var(--space-2xs)",
          flexShrink: 0,
        }}
      >
        {([0, 1, 2] as const).map((step) => (
          <button
            key={step}
            aria-label={`Thickness ${step + 1}`}
            onClick={() => onThicknessStepChange(step)}
            style={{
              width: 32,
              height: 44,
              border: "none",
              background: thicknessStep === step ? "var(--color-primary-surface)" : "transparent",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: dotSizes[step],
                height: dotSizes[step],
                borderRadius: "50%",
                background: thicknessStep === step ? "var(--color-primary)" : "var(--color-text-tertiary)",
              }}
            />
          </button>
        ))}
      </div>

      <IconButton icon={<UndoIcon />} aria-label="Undo" onClick={onUndo} disabled={!canUndo} style={{ flexShrink: 0 }} />
      <IconButton icon={<RedoIcon />} aria-label="Redo" onClick={onRedo} disabled={!canRedo} style={{ flexShrink: 0 }} />
      <IconButton icon={<TrashIcon />} aria-label="Clear page" onClick={onClear} style={{ flexShrink: 0 }} />
    </div>
  );
}
