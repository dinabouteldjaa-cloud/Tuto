import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { IconButton } from "@/components/IconButton";
import type { WorkspaceImage } from "./types";

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m1 0v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7h10Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const MIN_SIZE = 60; // px at baseWidth

interface WorkspaceImageObjectProps {
  image: WorkspaceImage;
  url: string;
  scale: number;
  interactive: boolean;
  selected: boolean;
  onSelect: () => void;
  /** Committed only at the end of a drag/resize gesture — never spammed
   * per pointer movement. */
  onChange: (patch: Partial<WorkspaceImage>) => void;
  onDelete: () => void;
  maxWidthAtBase: number;
}

export function WorkspaceImageObject({
  image,
  url,
  scale,
  interactive,
  selected,
  onSelect,
  onChange,
  onDelete,
  maxWidthAtBase,
}: WorkspaceImageObjectProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<{
    type: "drag" | "resize";
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startImage: WorkspaceImage;
    moved: boolean;
    liveX: number;
    liveY: number;
    liveWidth: number;
    liveHeight: number;
  } | null>(null);

  function toBaseDelta(clientDeltaPx: number) {
    return clientDeltaPx / scale;
  }

  function handleBodyPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!interactive) return;
    e.stopPropagation();
    onSelect();
    elRef.current?.setPointerCapture(e.pointerId);
    gestureRef.current = {
      type: "drag",
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startImage: image,
      moved: false,
      liveX: image.x,
      liveY: image.y,
      liveWidth: image.width,
      liveHeight: image.height,
    };
  }

  function handleResizeHandlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!interactive) return;
    e.stopPropagation();
    onSelect();
    (e.target as Element).setPointerCapture(e.pointerId);
    gestureRef.current = {
      type: "resize",
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startImage: image,
      moved: false,
      liveX: image.x,
      liveY: image.y,
      liveWidth: image.width,
      liveHeight: image.height,
    };
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== e.pointerId) return;

    const dxBase = toBaseDelta(e.clientX - gesture.startClientX);
    const dyBase = toBaseDelta(e.clientY - gesture.startClientY);
    if (Math.abs(dxBase) > 2 || Math.abs(dyBase) > 2) gesture.moved = true;

    if (gesture.type === "drag") {
      const nextX = Math.max(0, gesture.startImage.x + dxBase);
      const nextY = Math.max(0, gesture.startImage.y + dyBase);
      if (elRef.current) {
        elRef.current.style.left = `${nextX * scale}px`;
        elRef.current.style.top = `${nextY * scale}px`;
      }
      gesture.liveX = nextX;
      gesture.liveY = nextY;
    } else {
      const aspect = gesture.startImage.height / gesture.startImage.width;
      let nextWidth = Math.max(MIN_SIZE, gesture.startImage.width + dxBase);
      nextWidth = Math.min(nextWidth, maxWidthAtBase);
      const nextHeight = nextWidth * aspect;
      if (elRef.current) {
        elRef.current.style.width = `${nextWidth * scale}px`;
        elRef.current.style.height = `${nextHeight * scale}px`;
      }
      gesture.liveWidth = nextWidth;
      gesture.liveHeight = nextHeight;
    }
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    gestureRef.current = null;

    if (!gesture.moved) return; // pure tap — selection already handled on pointerdown

    if (gesture.type === "drag") {
      onChange({ x: gesture.liveX, y: gesture.liveY });
    } else {
      onChange({ width: gesture.liveWidth, height: gesture.liveHeight });
    }
  }

  return (
    <div
      ref={elRef}
      onPointerDown={handleBodyPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: "absolute",
        left: image.x * scale,
        top: image.y * scale,
        width: image.width * scale,
        height: image.height * scale,
        zIndex: image.zIndex,
        touchAction: interactive ? "none" : "auto",
        cursor: interactive ? "grab" : "default",
        outline: selected ? "2px solid var(--color-primary)" : "none",
        outlineOffset: 2,
        borderRadius: "var(--radius-sm)",
      }}
    >
      <img
        src={url}
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          borderRadius: "var(--radius-sm)",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />

      {selected && interactive && (
        <>
          <IconButton
            icon={<TrashIcon />}
            aria-label="Remove image"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              position: "absolute",
              top: -14,
              right: -14,
              width: 28,
              height: 28,
              minWidth: 28,
              minHeight: 28,
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-sm)",
            }}
          />
          <div
            onPointerDown={handleResizeHandlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            aria-label="Resize image"
            role="button"
            style={{
              position: "absolute",
              bottom: -14,
              right: -14,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--color-primary)",
              border: "2px solid var(--color-card)",
              boxShadow: "var(--shadow-sm)",
              cursor: "nwse-resize",
              touchAction: "none",
            }}
          />
        </>
      )}
    </div>
  );
}
