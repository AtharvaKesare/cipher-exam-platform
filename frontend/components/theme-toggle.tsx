"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="relative w-9 h-9 flex items-center justify-center rounded-md border border-border bg-transparent opacity-50 cursor-default">
        <span className="sr-only">Loading Theme</span>
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative w-9 h-9 flex items-center justify-center rounded-md border border-border bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors group overflow-hidden"
      aria-label="Toggle Theme"
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <div className={`transition-transform duration-500 transform ${isDark ? 'rotate-[-90deg] scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100 absolute'}`}>
          <Sun className="h-4 w-4 text-primary" />
        </div>
        <div className={`transition-transform duration-500 transform ${isDark ? 'rotate-0 scale-100 opacity-100 absolute' : 'rotate-90 scale-0 opacity-0'}`}>
          <Moon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </button>
  );
}
