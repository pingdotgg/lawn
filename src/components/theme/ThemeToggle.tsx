"use client";

import { Moon, Sun } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const THEME_STORAGE_KEY = "lawn-theme";

type Theme = "light" | "dark";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";

  const attributeTheme = document.documentElement.getAttribute("data-theme");
  if (attributeTheme === "dark" || attributeTheme === "light") {
    return attributeTheme;
  }

  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return getSystemTheme();
}

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(getInitialTheme());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [mounted, theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  // Keyboard shortcut: Ctrl/Cmd + Shift + L
  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        toggleTheme();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mounted, toggleTheme]);

  const value = useMemo(
    () => ({ theme, toggleTheme, mounted }),
    [theme, toggleTheme, mounted]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// Dropdown menu item for theme toggle
export function ThemeToggleMenuItem({
  className,
}: {
  className?: string;
}) {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className}
    >
      {theme === "dark" ? (
        <>
          <Sun className="mr-2 h-4 w-4" />
          Light mode
        </>
      ) : (
        <>
          <Moon className="mr-2 h-4 w-4" />
          Dark mode
        </>
      )}
      <span className="ml-auto text-[10px] text-[#888]">⌘⇧L</span>
    </button>
  );
}

// Legacy component - now just provides context
export function ThemeToggle() {
  return null;
}
