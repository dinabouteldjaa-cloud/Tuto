import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/global.css";

/**
 * Recovery for Vite's lazy-loaded chunks going stale across a deployment.
 *
 * A tab left open from before a deploy is still running the OLD main
 * bundle, which has the OLD hashed chunk URLs (e.g. NoteEditorPage-*.js)
 * baked into its dynamic import() calls at build time. Those exact files
 * no longer exist once a new deployment replaces them, and no
 * service-worker configuration can retroactively patch already-executing
 * JS in that tab — only a fresh navigation fetches the new index.html and
 * the new, correctly-hashed bundle. Vite dispatches this exact event when
 * that happens; the recommended fix is a single automatic reload rather
 * than leaving the user on a blank page. Guarded with sessionStorage so a
 * genuinely broken deployment can't reload-loop forever.
 */
window.addEventListener("vite:preloadError", (event) => {
  const key = "tuto:reloaded-after-chunk-error";
  if (sessionStorage.getItem(key)) return; // already tried once this session — don't loop
  sessionStorage.setItem(key, "1");
  event.preventDefault(); // we're handling it — no need for the default unhandled-rejection noise too
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
