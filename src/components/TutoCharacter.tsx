import type { CSSProperties } from "react";

export type TutoMood =
  | "greeting"
  | "happy"
  | "motivating"
  | "thinking"
  | "celebrating"
  | "concerned"
  | "studying"
  | "resting";

/**
 * Single source of truth mapping each mood to its illustration.
 * Add new moods here only — never hardcode a /tuto/*.png path elsewhere.
 */
const TUTO_MOOD_IMAGES: Record<TutoMood, string> = {
  greeting: "/tuto/tuto-greeting.png",
  happy: "/tuto/tuto-happy.png",
  motivating: "/tuto/tuto-motivating.png",
  thinking: "/tuto/tuto-thinking.png",
  celebrating: "/tuto/tuto-celebrating.png",
  concerned: "/tuto/tuto-concerned.png",
  studying: "/tuto/tuto-studying.png",
  resting: "/tuto/tuto-resting.png",
};

/** Human-readable alt text per mood, used when no custom alt is passed. */
const TUTO_MOOD_ALT: Record<TutoMood, string> = {
  greeting: "Tuto waving hello",
  happy: "Tuto smiling",
  motivating: "Tuto cheering you on",
  thinking: "Tuto thinking",
  celebrating: "Tuto celebrating",
  concerned: "Tuto looking concerned",
  studying: "Tuto studying",
  resting: "Tuto resting",
};

interface TutoCharacterProps {
  mood: TutoMood;
  /** Height in px; width follows automatically to preserve aspect ratio. */
  size?: number;
  alt?: string;
  style?: CSSProperties;
  className?: string;
}

/**
 * Renders the Tuto mascot in a given mood.
 *
 * Usage: <TutoCharacter mood="thinking" size={72} />
 *
 * Always preserves the illustration's natural aspect ratio (object-fit:
 * contain) so the character never stretches or gets cropped oddly on
 * narrow mobile screens.
 */
export function TutoCharacter({ mood, size = 64, alt, style, className }: TutoCharacterProps) {
  return (
    <img
      src={TUTO_MOOD_IMAGES[mood]}
      alt={alt ?? TUTO_MOOD_ALT[mood]}
      className={className}
      style={{
        height: size,
        width: "auto",
        maxWidth: "100%",
        objectFit: "contain",
        display: "block",
        ...style,
      }}
    />
  );
}
