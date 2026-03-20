export function syncPref(prefs: {
  theme?: string;
  font?: string;
  darkMode?: string;
}): void {
  fetch("/api/user-preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  }).catch(() => {});
}
