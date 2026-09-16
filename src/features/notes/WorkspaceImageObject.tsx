import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { IconButton } from "@/components/IconButton";
import type { WorkspaceImage, WorkspaceImageCrop } from "./types";

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

function RotateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 9a8 8 0 1 1 1 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 6v5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CropIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M6 2v14a2 2 0 0 0 2 2h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 22V8a2 2 0 0 0-2-2H2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const MIN_SIZE = 60; // px at baseWidth
const CROP_PANEL_MAX = 340; // px, fixed preview size for the crop editor

interface WorkspaceImageObjectProps {
  image: WorkspaceImage;
  url: string;
  scale: number;
  interactive: boolean;
  selected: boolean;
  onSelect: () => void;
  /** Committed only at the end of a drag/resize gesture, or on crop/rotate
   * confirm — never spammed per pointer movement. */
  onChange: (patch: Partial<WorkspaceImage>) => void;
  onDelete: () => void;
  maxWidthAtBase: number;
}

/** Standard object-fit:contain math — returns the displayed rect (within
 * a box of size boxW x boxH) for an image of natural size natW x natH. */
function containRect(boxW: number, boxH: number, natW: number, natH: number) {
  const boxAspect = boxW / boxH;
  const natAspect = natW / natH;
  if (natAspect > boxAspect) {
    const width = boxW;
    const height = boxW / natAspect;
    return { width, height, offsetX: 0, offsetY: (boxH - height) / 2 };
  }
  const height = boxH;
  const width = boxH * natAspect;
  return { width, height, offsetX: (boxW - width) / 2, offsetY: 0 };
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

  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [draftCrop, setDraftCrop] = useState<WorkspaceImageCrop | null>(null);
  const cropGestureRef = useRef<{
    handle: "move" | "nw" | "ne" | "sw" | "se";
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startCropPx: { x: number; y: number; width: number; height: number };
  } | null>(null);

  const rotation = image.rotation ?? 0;
  const rotatedOuter = rotation === 90 || rotation === 270;

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
      // Resize deltas apply along the OUTER (possibly rotated) box, so at
      // 90/270 a horizontal drag should change the stored height and vice
      // versa — swap which stored dimension the delta drives.
      const baseAspect = gesture.startImage.height / gesture.startImage.width;
      const primaryDelta = rotatedOuter ? dyBase : dxBase;
      let nextWidth = Math.max(MIN_SIZE, gesture.startImage.width + primaryDelta);
      nextWidth = Math.min(nextWidth, maxWidthAtBase);
      const nextHeight = nextWidth * baseAspect;
      if (elRef.current) {
        elRef.current.style.width = `${(rotatedOuter ? nextHeight : nextWidth) * scale}px`;
        elRef.current.style.height = `${(rotatedOuter ? nextWidth : nextHeight) * scale}px`;
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

  function handleRotate() {
    const next = ((rotation + 90) % 360) as 0 | 90 | 180 | 270;
    onChange({ rotation: next });
  }

  function startCropping() {
    setDraftCrop(image.crop ?? { x: 0, y: 0, width: 1, height: 1 });
    setIsCropping(true);
  }

  function cancelCropping() {
    setIsCropping(false);
    setDraftCrop(null);
  }

  function confirmCropping() {
    if (!draftCrop || !naturalSize) {
      setIsCropping(false);
      return;
    }
    const newAspect = (draftCrop.height * naturalSize.height) / (draftCrop.width * naturalSize.width);
    onChange({ crop: draftCrop, height: image.width * newAspect });
    setIsCropping(false);
    setDraftCrop(null);
  }

  function cropHandlePointerDown(handle: "move" | "nw" | "ne" | "sw" | "se", e: ReactPointerEvent<HTMLDivElement>) {
    if (!draftCrop || !naturalSize) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const rect = containRect(CROP_PANEL_MAX, CROP_PANEL_MAX, naturalSize.width, naturalSize.height);
    cropGestureRef.current = {
      handle,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCropPx: {
        x: draftCrop.x * rect.width,
        y: draftCrop.y * rect.height,
        width: draftCrop.width * rect.width,
        height: draftCrop.height * rect.height,
      },
    };
  }

  function cropHandlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const gesture = cropGestureRef.current;
    if (!gesture || gesture.pointerId !== e.pointerId || !naturalSize) return;
    const rect = containRect(CROP_PANEL_MAX, CROP_PANEL_MAX, naturalSize.width, naturalSize.height);
    const dx = e.clientX - gesture.startClientX;
    const dy = e.clientY - gesture.startClientY;
    const MIN_PX = 24;

    let { x, y, width, height } = gesture.startCropPx;
    if (gesture.handle === "move") {
      x = gesture.startCropPx.x + dx;
      y = gesture.startCropPx.y + dy;
    } else {
      if (gesture.handle === "nw" || gesture.handle === "sw") {
        const newX = Math.min(gesture.startCropPx.x + dx, gesture.startCropPx.x + gesture.startCropPx.width - MIN_PX);
        width = gesture.startCropPx.width - (newX - gesture.startCropPx.x);
        x = newX;
      } else {
        width = Math.max(MIN_PX, gesture.startCropPx.width + dx);
      }
      if (gesture.handle === "nw" || gesture.handle === "ne") {
        const newY = Math.min(gesture.startCropPx.y + dy, gesture.startCropPx.y + gesture.startCropPx.height - MIN_PX);
        height = gesture.startCropPx.height - (newY - gesture.startCropPx.y);
        y = newY;
      } else {
        height = Math.max(MIN_PX, gesture.startCropPx.height + dy);
      }
    }

    x = Math.max(0, Math.min(x, rect.width - width));
    y = Math.max(0, Math.min(y, rect.height - height));
    width = Math.min(width, rect.width - x);
    height = Math.min(height, rect.height - y);

    setDraftCrop({ x: x / rect.width, y: y / rect.height, width: width / rect.width, height: height / rect.height });
  }

  function cropHandlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (cropGestureRef.current?.pointerId === e.pointerId) cropGestureRef.current = null;
  }

  // ---------------------------------------------------------------------
  // Crop editor panel — shown larger and centered rather than editing at
  // the (often tiny) inline size, since precise dragging needs room.
  // ---------------------------------------------------------------------
  if (isCropping && draftCrop) {
    const rect = naturalSize ? containRect(CROP_PANEL_MAX, CROP_PANEL_MAX, naturalSize.width, naturalSize.height) : null;
    const cropPxLeft = rect ? draftCrop.x * rect.width : 0;
    const cropPxTop = rect ? draftCrop.y * rect.height : 0;
    const cropPxWidth = rect ? draftCrop.width * rect.width : 0;
    const cropPxHeight = rect ? draftCrop.height * rect.height : 0;

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(20, 15, 10, 0.85)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 300,
          padding: "var(--space-lg)",
          gap: "var(--space-md)",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            position: "relative",
            width: CROP_PANEL_MAX,
            height: CROP_PANEL_MAX,
            maxWidth: "90vw",
            maxHeight: "60vh",
            background: "#000",
          }}
        >
          <img
            src={url}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (!naturalSize) setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
            }}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", opacity: 0.4 }}
          />
          {rect && (
            <>
              <div
                onPointerDown={(e) => cropHandlePointerDown("move", e)}
                onPointerMove={cropHandlePointerMove}
                onPointerUp={cropHandlePointerUp}
                onPointerCancel={cropHandlePointerUp}
                style={{
                  position: "absolute",
                  left: rect.offsetX + cropPxLeft,
                  top: rect.offsetY + cropPxTop,
                  width: cropPxWidth,
                  height: cropPxHeight,
                  border: "2px solid var(--color-primary)",
                  boxShadow: "0 0 0 2000px rgba(0,0,0,0.5)",
                  touchAction: "none",
                  cursor: "move",
                }}
              >
                {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                  <div
                    key={corner}
                    onPointerDown={(e) => cropHandlePointerDown(corner, e)}
                    onPointerMove={cropHandlePointerMove}
                    onPointerUp={cropHandlePointerUp}
                    onPointerCancel={cropHandlePointerUp}
                    style={{
                      position: "absolute",
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--color-primary)",
                      border: "2px solid #fff",
                      touchAction: "none",
                      cursor: `${corner}-resize`,
                      top: corner.includes("n") ? -14 : undefined,
                      bottom: corner.includes("s") ? -14 : undefined,
                      left: corner.includes("w") ? -14 : undefined,
                      right: corner.includes("e") ? -14 : undefined,
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: "var(--space-md)" }}>
          <IconButton
            icon={<CloseIcon />}
            aria-label="Cancel crop"
            onClick={cancelCropping}
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", width: 48, height: 48 }}
          />
          <IconButton
            icon={<CheckIcon />}
            aria-label="Confirm crop"
            onClick={confirmCropping}
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)", width: 48, height: 48 }}
          />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Normal inline rendering
  // ---------------------------------------------------------------------
  const outerWidth = (rotatedOuter ? image.height : image.width) * scale;
  const outerHeight = (rotatedOuter ? image.width : image.height) * scale;
  const innerWidth = image.width * scale;
  const innerHeight = image.height * scale;

  let imgStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "contain", display: "block" };
  if (image.crop) {
    const c = image.crop;
    imgStyle = {
      position: "absolute",
      width: `${100 / c.width}%`,
      height: `${100 / c.height}%`,
      left: `${-(c.x * 100) / c.width}%`,
      top: `${-(c.y * 100) / c.height}%`,
      maxWidth: "none",
    };
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
        width: outerWidth,
        height: outerHeight,
        zIndex: image.zIndex,
        pointerEvents: interactive ? "auto" : "none",
        touchAction: interactive ? "none" : "auto",
        cursor: interactive ? "grab" : "default",
        outline: selected ? "2px solid var(--color-primary)" : "none",
        outlineOffset: 2,
        borderRadius: "var(--radius-sm)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: innerWidth,
          height: innerHeight,
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          overflow: "hidden",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <img
          src={url}
          alt=""
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (!naturalSize) setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
          }}
          style={{ ...imgStyle, pointerEvents: "none", userSelect: "none" }}
        />
      </div>

      {selected && interactive && (
        <>
          <div
            style={{
              position: "absolute",
              top: -46,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 2,
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-pill)",
              boxShadow: "var(--shadow-md)",
              padding: 4,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <IconButton icon={<RotateIcon />} aria-label="Rotate 90°" onClick={handleRotate} style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }} />
            <IconButton icon={<CropIcon />} aria-label="Crop image" onClick={startCropping} style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }} />
            <IconButton
              icon={<TrashIcon />}
              aria-label="Remove image"
              onClick={onDelete}
              style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }}
            />
          </div>
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
