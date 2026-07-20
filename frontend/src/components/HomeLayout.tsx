"use client";

import React from "react";
import { motion } from "framer-motion";
import { Navbar } from "./Navbar";

interface HomeLayoutProps {
  leftSidebar: React.ReactNode;
  centerColumn: React.ReactNode;
  rightPanel: React.ReactNode;
  historyDrawer: React.ReactNode;
  onOpenHistory: () => void;
}

/**
 * HomeLayout — viewport-locked, 3-column layout.
 *
 * Structure (100vh, no page scroll):
 *   ┌────────────────────────────────────────────────┐
 *   │                    Navbar                      │  ← ~72px
 *   ├──────────┬──────────────────────────┬──────────┤
 *   │  Left    │   Center (Meet Aria +    │  Right   │
 *   │  (300px, │   Orb + status + button) │  (440px, │
 *   │  centered│   flex-1                 │  flex col│
 *   │  vertic.)│                          │  cards)  │
 *   └──────────┴──────────────────────────┴──────────┘
 *
 * All three columns share the same available vertical space (100vh - navbar).
 * No column scrolls at the column level; individual cards manage their own
 * internal scrolling if needed.
 */
export const HomeLayout = React.memo(function HomeLayout({
  leftSidebar,
  centerColumn,
  rightPanel,
  historyDrawer,
  onOpenHistory,
}: HomeLayoutProps) {
  return (
    <main className="h-screen w-screen overflow-hidden flex flex-col">
      {/* Navbar (fixed height) */}
      <div className="shrink-0">
        <Navbar onOpenHistory={onOpenHistory} />
      </div>

      {/* Body: 3-column grid that fills the remaining viewport */}
      <div
        className="flex-1 min-h-0 w-full max-w-[1700px] mx-auto grid gap-6 px-8 pb-6"
        style={{
          gridTemplateColumns: "460px minmax(0, 1fr) 460px",
        }}
      >
        {/* ── Left column: vertically CENTERED ─────────────────── */}
        <div className="h-full min-h-0 flex flex-col justify-center items-start w-full max-w-[320px]">
          {leftSidebar}
        </div>

        {/* ── Center column: hero + orb + controls ─────────────── */}
        <div className="h-full min-h-0 flex flex-col items-center justify-start pt-2 relative">
          {/* Hero heading */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-[560px] shrink-0"
          >
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-foreground">
              Meet Aria
            </h1>
            <p className="mt-4 text-foreground/60 text-[17px]">
              An AI voice assistant that detects your accent, responds naturally,
              and adapts to how you speak.
            </p>
          </motion.div>

          {/* Center column body (Orb + status + connect button) */}
          <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center mt-24">
            {centerColumn}
          </div>
        </div>

        {/* ── Right column: fills full column height, no outer scroll ── */}
        <div className="h-full min-h-0 flex flex-col w-full">
          {rightPanel}
        </div>
      </div>

      {historyDrawer}
    </main>
  );
});
