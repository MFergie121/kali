export type Font = "ibm-plex-mono" | "geist" | "fraunces" | "dm-sans" | "syne";

export const fonts: { id: Font; label: string; stack: string }[] = [
  {
    id: "ibm-plex-mono",
    label: "IBM Plex Mono",
    stack: '"IBM Plex Mono", monospace',
  },
  { id: "geist", label: "Geist", stack: '"Geist", sans-serif' },
  { id: "fraunces", label: "Fraunces", stack: '"Fraunces", serif' },
  { id: "dm-sans", label: "DM Sans", stack: '"DM Sans", sans-serif' },
  { id: "syne", label: "Syne", stack: '"Syne", sans-serif' },
];

const STORAGE_KEY = "app-font";

function createFontStore() {
  let current = $state<Font>("ibm-plex-mono");

  function apply(font: Font) {
    const match = fonts.find((f) => f.id === font);
    if (!match) return;
    current = font;
    document.documentElement.style.setProperty("--font-sans", match.stack);
    localStorage.setItem(STORAGE_KEY, font);
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY) as Font | null;
    apply(saved ?? "ibm-plex-mono");
  }

  return {
    get current() {
      return current;
    },
    apply,
    init,
  };
}

export const fontStore = createFontStore();
