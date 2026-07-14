"use client";

import React, { useEffect, useRef } from "react";
import { motion, useSpring, useMotionValue, useTransform } from "framer-motion";

export type VoiceState = "idle" | "connecting" | "listening" | "thinking" | "speaking";

export interface OrbProps {
  state: VoiceState;
  audioLevel: number;
  hoverStrength?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
}

const PARTICLE_COUNT = 720;
const TWO_PI = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const ERROR_COLOR_FROM = "#ff0000";
const ERROR_COLOR_TO = "#880000";

const hexToRgb = (hex: string): [number, number, number] => {
  const c = hex.replace("#", "");
  return [
    parseInt(c.substring(0, 2), 16) || 0,
    parseInt(c.substring(2, 4), 16) || 0,
    parseInt(c.substring(4, 6), 16) || 0,
  ];
};

const ERROR_FROM_RGB = hexToRgb(ERROR_COLOR_FROM);
const ERROR_TO_RGB = hexToRgb(ERROR_COLOR_TO);

type Rgb = [number, number, number];

const mixRgb = (a: Rgb, b: Rgb, m: number): Rgb => [
  a[0] + (b[0] - a[0]) * m,
  a[1] + (b[1] - a[1]) * m,
  a[2] + (b[2] - a[2]) * m,
];

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

const approach = (curr: number, target: number, speed: number, dt: number) => {
  return curr + (target - curr) * Math.min(dt * speed, 1);
};

const ORB_STATES = ["idle", "listening", "thinking", "speaking", "error", "disabled", "connecting"];

const createStateMix = (initial: string) => {
  const weights: Record<string, number> = {};
  for (const s of ORB_STATES) weights[s] = 0;
  weights[initial] = 1;

  return {
    update: (st: string, dt: number) => {
      for (const s of ORB_STATES) {
        const target = s === st ? 1 : 0;
        weights[s] = approach(weights[s], target, 5, dt);
      }
      return weights;
    }
  };
};

const stateMotion = (st: string) => {
  if (st === "listening") return "ripple";
  if (st === "speaking") return "flow";
  if (st === "thinking") return "pulse";
  return "none";
};

interface SpherePoint {
  x: number;
  y: number;
  z: number;
  ringFrac: number;
  seed: number;
  tone: number;
}

const buildSphere = (count: number): SpherePoint[] => {
  const points: SpherePoint[] = [];
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = GOLDEN_ANGLE * i;
    points.push({
      x: Math.cos(theta) * radiusAtY,
      y,
      z: Math.sin(theta) * radiusAtY,
      ringFrac: (i * 0.61803398875) % 1,
      seed: ((i * 0.7548776662) % 1) * TWO_PI,
      tone: (i * 0.5436890126) % 1,
    });
  }
  return points;
};

export const Orb = ({
  state = "idle",
  audioLevel = 0,
  hoverStrength = 1,
  colorFrom = "#fbbf24",
  colorTo = "#f43f5e",
  className = "w-[220px] h-[220px] md:w-[300px] md:h-[300px] xl:w-[400px] xl:h-[400px]",
}: OrbProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const levelRef = useRef(audioLevel);
  const speedRef = useRef(1.2);
  const colorRef = useRef({ from: colorFrom, to: colorTo });
  const drawStaticRef = useRef<(() => void) | null>(null);
  const size = 400; // Rendering resolution, CSS scales it

  // --- Framer Motion 3D Hover Effect ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const isHovered = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 });
  const springHover = useSpring(isHovered, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(springY, [-1, 1], [15 * hoverStrength, -15 * hoverStrength]);
  const rotateY = useTransform(springX, [-1, 1], [-15 * hoverStrength, 15 * hoverStrength]);
  const scale = useTransform(springHover, [0, 1], [1, 1.05 + hoverStrength * 0.05]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);
  // ------------------------------------

  useEffect(() => {
    stateRef.current = state;
    levelRef.current = audioLevel;
    colorRef.current = { from: colorFrom, to: colorTo };
  }, [state, audioLevel, colorFrom, colorTo]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const points = buildSphere(PARTICLE_COUNT);
    const center = size / 2;
    const baseRadius = center * 1.0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const stateMix = createStateMix(stateRef.current);
    let t = reduce ? 1.7 : 0;
    let angleY = 0;
    let connectingPhase = 0;
    const angleX = 0.32;
    let levelS = 0;
    let raf = 0;
    let last: number | null = null;
    const running = true;

    const render = (dt: number, isStatic = false) => {
      const st = stateRef.current;
      const spd = speedRef.current;
      const easeDt = isStatic ? 60 : dt;
      const w = stateMix.update(st, easeDt);

      let ripple = 0;
      let pulse = 0;
      let flow = 0;
      for (const s of ORB_STATES) {
        const kind = stateMotion(s);
        if (kind === "ripple") ripple += w[s];
        else if (kind === "pulse") pulse += w[s];
        else if (kind === "flow") flow += w[s];
      }
      const wIdle = w.idle || 0;
      const wConn = w.connecting || 0;
      const wError = w.error || 0;
      const wDisabled = w.disabled || 0;
      const motionScale = 1 - wDisabled * 0.96;

      const rawLevel = isStatic ? 0 : clamp01(levelRef.current);
      levelS = approach(levelS, rawLevel, 9, easeDt);
      const level = levelS;

      const spin = (0.14 + ripple * (0.9 + level * 1.6) + flow * 0.4 + wConn * 0.3) * motionScale;
      angleY += dt * spd * spin;
      connectingPhase = (connectingPhase + dt * spd * 1.1) % TWO_PI;

      const breathe = 0.05 * (0.25 + wIdle * 0.75) * Math.sin(t * 1.1 * spd) * motionScale;
      const conv = pulse * (0.22 + 0.12 * Math.sin(t * 2.6 * spd + 1));
      const expand = flow * (0.08 + level * 0.32);
      const radius = baseRadius * (1 + breathe + level * 0.16 + expand - conv);

      const from = mixRgb(hexToRgb(colorRef.current.from), ERROR_FROM_RGB, wError);
      const to = mixRgb(hexToRgb(colorRef.current.to), ERROR_TO_RGB, wError);

      const shakeAmp = wError * radius * 0.05 * motionScale;
      const shakeX = shakeAmp * (Math.sin(t * 26 * spd) + 0.5 * Math.sin(t * 15.7 * spd));
      const shakeY = shakeAmp * (Math.cos(t * 22.5 * spd) + 0.5 * Math.sin(t * 13.1 * spd));

      const idleAmp = wIdle * radius * 0.055 * motionScale;
      const jitterAmp = (flow + wError * 0.7) * radius * (0.015 + level * 0.085) * motionScale;
      const rippleAmp = ripple * (0.045 + level * 0.24);
      const pulseAmp = pulse * 0.16;
      const alphaScale = 1 - wDisabled * 0.35;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      ctx.clearRect(0, 0, size, size);
      const glow = ripple + pulse + flow;
      ctx.globalCompositeOperation = !isStatic && glow > 0.5 ? "lighter" : "source-over";

      for (let i = 0; i < points.length; i += 1) {
        const p = points[i];

        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        const y1 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        const depth = (z2 + 1) / 2;
        const perspective = 0.65 + depth * 0.45;

        let pointRadius = radius;
        if (rippleAmp > 0.002) {
          pointRadius *= 1 + rippleAmp * Math.sin(p.y * 4.5 - t * 6.5 * spd);
        }
        if (pulseAmp > 0.002) {
          pointRadius *= 1 - pulseAmp * (0.5 + 0.5 * Math.sin(p.ringFrac * TWO_PI + t * 3.1 * spd));
        }

        let ox = shakeX;
        let oy = shakeY;
        if (idleAmp > 0.01) {
          ox += idleAmp * (Math.sin(t * 0.55 * spd + p.seed * 3.7) + 0.5 * Math.sin(t * 1.3 * spd + p.seed * 1.3));
          oy += idleAmp * (Math.cos(t * 0.62 * spd + p.seed * 2.9) + 0.5 * Math.sin(t * 1.05 * spd + p.seed * 5.1));
        }
        if (jitterAmp > 0.01) {
          ox += jitterAmp * Math.sin(t * 14 * spd + p.seed * 9.3);
          oy += jitterAmp * Math.cos(t * 17 * spd + p.seed * 6.1);
        }

        const sphereX = center + x1 * pointRadius * perspective + ox;
        const sphereY = center + y1 * pointRadius * perspective + oy;
        const sphereAlpha = (0.12 + depth * depth * 0.78) * alphaScale;
        const sphereDot = 0.6 + depth * 1.5;

        let screenX = sphereX;
        let screenY = sphereY;
        let alpha = sphereAlpha;
        let dot = sphereDot;

        if (wConn > 0.004) {
          const base = (i / points.length) * TWO_PI;
          const jitter = 0.05 * Math.sin(t * 1.3 + p.seed);
          const ringAngle = base + connectingPhase + jitter;
          const ringR = center * (0.58 + 0.13 * p.ringFrac) * (1 + 0.05 * Math.sin(t + p.seed * 1.7));
          const circleX = center + Math.cos(ringAngle) * ringR;
          const circleY = center + Math.sin(ringAngle) * ringR;
          const ringAlpha = 0.35 + p.tone * 0.5;
          const ringDot = 0.75 + p.tone * 0.9;

          screenX = sphereX + (circleX - sphereX) * wConn;
          screenY = sphereY + (circleY - sphereY) * wConn;
          alpha = sphereAlpha + (ringAlpha - sphereAlpha) * wConn;
          dot = sphereDot + (ringDot - sphereDot) * wConn;
        }

        const cr = from[0] + (to[0] - from[0]) * p.tone;
        const cg = from[1] + (to[1] - from[1]) * p.tone;
        const cb = from[2] + (to[2] - from[2]) * p.tone;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${alpha.toFixed(3)})`;
        ctx.arc(screenX, screenY, dot, 0, TWO_PI);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
    };

    if (reduce) {
      render(0, true);
      drawStaticRef.current = () => render(0, true);
      return () => { drawStaticRef.current = null; };
    }

    const frame = (now: number) => {
      raf = 0;
      const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.1);
      last = now;
      t += dt;
      render(dt);
      if (running) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (raf === 0) {
        last = null;
        raf = requestAnimationFrame(frame);
      }
    };

    const halt = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      last = null;
    };

    // simplified for always running when mounted
    wake();

    return () => {
      halt();
    };
  }, []);

  return (
    <motion.div
      ref={hostRef}
      onMouseEnter={() => isHovered.set(1)}
      onMouseLeave={() => isHovered.set(0)}
      className={`relative rounded-full flex items-center justify-center mb-8 ${className}`}
      style={{
        scale,
        rotateX,
        rotateY,
        transformPerspective: 800,
        transformStyle: "preserve-3d"
      }}
    >
      {/* Background glow behind particles */}
      <motion.div
        className="absolute inset-0 m-auto w-[70%] h-[70%] rounded-full z-0 pointer-events-none transition-colors duration-500"
        style={{
          background: `radial-gradient(circle, ${colorFrom}60 0%, transparent 70%)`,
          opacity: useTransform(springHover, [0, 1], [0.3, 0.8]),
          scale: useTransform(springHover, [0, 1], [1, 1.2]),
          filter: "blur(30px)"
        }}
      />

      <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", maxWidth: size, maxHeight: size }}
        />
      </div>
    </motion.div>
  );
};
