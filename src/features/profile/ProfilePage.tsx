import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/features/auth/AuthContext";

export function ProfilePage() {
  const { user, signOut } = useAuth();

  return (
    <div>
      <TopBar title="Profile" />
      <div style={{ padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
        <Card style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "var(--radius-pill)",
              background: "var(--color-primary-surface)",
              color: "var(--color-primary-pressed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "var(--text-lg)",
              flexShrink: 0,
            }}
          >
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 600 }}>Signed in</p>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.email}
            </p>
          </div>
        </Card>

        <Button variant="secondary" onClick={() => signOut()}>
          Log out
        </Button>
      </div>
    </div>
  );
}
