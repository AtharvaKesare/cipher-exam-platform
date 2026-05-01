"use client";

import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

// Removed framer-motion page transition that was causing jitter on every
// navigation by unmounting/remounting the entire page tree with opacity + y
// animation. CSS class handles the initial fade-in once; subsequent navigations
// are instant and smooth via Next.js streaming.
export function PageTransition({ children }: PageTransitionProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 animate-page-in">
      {children}
    </div>
  );
}
