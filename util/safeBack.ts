import type { NavigateFunction } from "react-router-dom";

/**
 * Go back inside the app if there is an in-app page to return to, otherwise go to
 * `fallback`. A page opened from a push notification (or a shared link) is the first
 * entry in the tab, so navigate(-1) either did nothing or left the site entirely.
 */
export function safeBack(navigate: NavigateFunction, fallback: string = "/app") {
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  if (idx > 0) navigate(-1);
  else navigate(fallback, { replace: true });
}
