import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";

function SchoolworkIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 6.5a1 1 0 0 1 1-1h5a2 2 0 0 1 2 2v11a1.5 1.5 0 0 0-1.5-1.5H4V6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M20 6.5a1 1 0 0 0-1-1h-5a2 2 0 0 0-2 2v11a1.5 1.5 0 0 1 1.5-1.5H20V6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SchoolworkPage() {
  return (
    <div>
      <TopBar title="Schoolwork" />
      <EmptyState
        icon={<SchoolworkIcon />}
        title="Track homework, exams, and projects"
        description="Your assignments, due dates, and study progress will show up here, organized by subject."
        action={<Button disabled>Add schoolwork (coming soon)</Button>}
      />
    </div>
  );
}
