import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";

function NotesIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 3.5h9L19 8v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8 12.5h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function NotesPage() {
  return (
    <div>
      <TopBar title="Notes" />
      <EmptyState
        icon={<NotesIcon />}
        title="Your notes will live here"
        description="Create notebooks, write, and organize your notes by subject. This is coming in the next phase of Tuto."
        action={<Button disabled>New note (coming soon)</Button>}
      />
    </div>
  );
}
