import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-5.5h4V20h3a1 1 0 0 0 1-1v-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 3.5h9L19 8v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14.5 3.5V8H19" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 12.5h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SchoolworkIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8.5" r="3.3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19c1.1-3.2 3.9-5 7-5s5.9 1.8 7 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const items: NavItem[] = [
  { to: "/", label: "Home", icon: <HomeIcon /> },
  { to: "/notes", label: "Notes", icon: <NotesIcon /> },
  { to: "/schoolwork", label: "Schoolwork", icon: <SchoolworkIcon /> },
  { to: "/profile", label: "Profile", icon: <ProfileIcon /> },
];

export function BottomNavigation() {
  return (
    <nav
      style={{
        position: "sticky",
        bottom: 0,
        height: "var(--bottom-nav-height)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        background: "var(--color-card)",
        borderTop: "1px solid var(--color-border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            textDecoration: "none",
            width: 64,
            minHeight: 48,
            justifyContent: "center",
          }}
        >
          {({ isActive }) => (
            <>
              <span style={{ color: isActive ? "var(--color-primary)" : "var(--color-text-tertiary)" }}>
                {item.icon}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isActive ? "var(--color-primary)" : "var(--color-text-tertiary)",
                }}
              >
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
