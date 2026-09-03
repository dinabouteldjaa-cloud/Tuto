import type { User } from "@supabase/supabase-js";

/**
 * Resolves the best available display name for a user.
 *
 * Prefers the `full_name` saved in Supabase Auth user_metadata at signup.
 * Falls back gracefully for existing users who signed up before this field
 * existed, so the app never breaks for accounts without a saved name.
 */
export function getDisplayName(user: User | null): string {
  const fullName = user?.user_metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim();
  }

  const emailLocalPart = user?.email?.split("@")[0];
  if (emailLocalPart) {
    return emailLocalPart;
  }

  return "there";
}

/** First name only, for compact greetings like "Good evening, Dina". */
export function getFirstName(user: User | null): string {
  const name = getDisplayName(user);
  return name.split(" ")[0];
}
