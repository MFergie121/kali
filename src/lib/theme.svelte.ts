import { setTheme } from "mode-watcher";

export type Theme = "serika" | "retro" | "iceberg-light" | "lil-dragon" | "nord" | "forest" | "cyberpunk" | "bmw" | "claude" | "ferrari";

export const themes: { id: Theme; label: string }[] = [
  { id: "serika", label: "Serika" },
  { id: "retro", label: "Retro" },
  { id: "iceberg-light", label: "Iceberg Light" },
  { id: "lil-dragon", label: "Lil Dragon" },
  { id: "nord", label: "Nord" },
  { id: "forest", label: "Forest" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "bmw", label: "BMW M" },
  { id: "claude", label: "Claude" },
  { id: "ferrari", label: "Ferrari" },
];

function createThemeStore() {
  let current = $state<Theme>("serika");

  function apply(theme: Theme) {
    current = theme;
    setTheme(theme);
  }

  return {
    get current() {
      return current;
    },
    apply,
  };
}

export const themeStore = createThemeStore();
