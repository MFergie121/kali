export type Theme = "serika" | "retro" | "iceberg-light" | "lil-dragon";

export const themes: { id: Theme; label: string }[] = [
  { id: "serika", label: "Serika" },
  { id: "retro", label: "Retro" },
  { id: "iceberg-light", label: "Iceberg Light" },
  { id: "lil-dragon", label: "Lil Dragon" },
];

const STORAGE_KEY = "app-theme";

function createThemeStore() {
  let current = $state<Theme>("serika");

  function apply(theme: Theme) {
    current = theme;
    if (theme === "serika") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = theme;
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    apply(saved ?? "serika");
  }

  return {
    get current() {
      return current;
    },
    apply,
    init,
  };
}

export const themeStore = createThemeStore();
