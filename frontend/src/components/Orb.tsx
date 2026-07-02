"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface OrbProps {
  isRecording: boolean;
  volume: number;
}

const lerp = (start: number, end: number, amt: number) => (1 - amt) * start + amt * end;

export const Orb = React.memo(function Orb({ isRecording, volume }: OrbProps) {
  const orbRef = useRef<HTMLDivElement>(null);
  
  // Mouse tracking targets (normalized 0 to 1)
  const target = useRef({ x: 0.5, y: 0.5 });
  const current = useRef({ x: 0.5, y: 0.5 });
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      target.current.x = e.clientX / window.innerWidth;
      target.current.y = e.clientY / window.innerHeight;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const animate = () => {
      // Lerp for buttery smooth cursor tracking
      current.current.x = lerp(current.current.x, target.current.x, 0.04);
      current.current.y = lerp(current.current.y, target.current.y, 0.04);

      if (orbRef.current) {
        orbRef.current.style.setProperty("--mouse-x", current.current.x.toString());
        orbRef.current.style.setProperty("--mouse-y", current.current.y.toString());
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.2 }}
      className="relative flex items-center justify-center mb-8"
    >
      <motion.div
        ref={orbRef}
        animate={{
          scale: isRecording ? 1 + volume * 0.3 : [0.98, 1.02, 0.98],
        }}
        transition={{
          scale: isRecording 
            ? { type: "spring", stiffness: 300, damping: 20 } 
            : { duration: 4, repeat: Infinity, ease: "easeInOut" },
        }}
        className="orb-glass-sphere w-[220px] h-[220px] md:w-[300px] md:h-[300px] xl:w-[400px] xl:h-[400px] rounded-full relative z-20"
      />
      {/* Inner stable glow */}
      <div className="absolute inset-0 m-auto w-[50%] h-[50%] bg-white/50 rounded-full blur-[40px] z-30 pointer-events-none" />
    </motion.div>
  );
});
