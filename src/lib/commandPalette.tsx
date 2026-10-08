import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { LucideIcon } from "lucide-react";

export type PaletteCommand = {
  id: string;
  label: string;
  keywords?: string[];
  icon: LucideIcon;
  run: () => void;
};

type CommandPaletteContextValue = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  pageCommands: PaletteCommand[];
  registerCommands: (commands: PaletteCommand[]) => () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [registered, setRegistered] = useState<PaletteCommand[][]>([]);

  const registerCommands = useCallback((commands: PaletteCommand[]) => {
    setRegistered((prev) => [...prev, commands]);
    return () => setRegistered((prev) => prev.filter((entry) => entry !== commands));
  }, []);

  // Cmd/Ctrl+K toggles from anywhere, including inputs: a modifier combo never
  // steals typed text, and preventDefault stops the browser's own Ctrl+K.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat || event.shiftKey || event.altKey) return;
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setOpen((current) => !current);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const value = useMemo(
    () => ({ open, setOpen, pageCommands: registered.flat(), registerCommands }),
    [open, registered, registerCommands],
  );

  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}

// Null outside the dashboard, where there is no palette.
export function useCommandPalette() {
  return useContext(CommandPaletteContext);
}

// Lets a page expose its own actions (e.g. opening a page-local dialog) in the
// palette while it is mounted. Pass a memoized array.
export function useRegisterPaletteCommands(commands: PaletteCommand[]) {
  const registerCommands = useCommandPalette()?.registerCommands;
  useEffect(() => registerCommands?.(commands), [registerCommands, commands]);
}
