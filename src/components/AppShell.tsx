import type { ReactNode } from "react";
import { BottomNavigation } from "./BottomNavigation";

interface AppShellProps {
  children: ReactNode;
  topBar?: ReactNode;
}

export function AppShell({ children, topBar }: AppShellProps) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--color-bg)",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "var(--app-max-width)",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: "var(--color-bg)",
          position: "relative",
        }}
      >
        {topBar}
        <main
          style={{
            flex: 1,
            paddingBottom: "calc(var(--bottom-nav-height) + var(--space-md))",
          }}
        >
          {children}
        </main>
        <BottomNavigation />
      </div>
    </div>
  );
}
