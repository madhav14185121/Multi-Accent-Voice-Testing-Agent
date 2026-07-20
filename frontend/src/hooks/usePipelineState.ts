"use client";

import { useCallback, useRef, useState } from "react";
import type {
  PipelineState,
  Stage,
  AccumulatorState,
  AccentDetectionState,
} from "../types";

const DEFAULT_PIPELINE: PipelineState = {
  stt: { status: "pending" },
  llm: { status: "pending" },
  tts: { status: "pending" },
};

const DEFAULT_ACCUMULATOR: AccumulatorState = {
  accumulatedSeconds: 0,
  targetSeconds: 20,
  isReady: false,
};

const DEFAULT_ACCENT: AccentDetectionState = { status: "idle" };

/**
 * usePipelineState — encapsulates ephemeral pipeline UI state driven by
 * WebSocket events emitted by Aria's backend.
 *
 * Consumers call `handleEvent(evt)` from the WebSocket `onmessage` handler.
 * The hook exposes the derived state as three fields: pipeline, accumulator,
 * accent. It also exposes `resetTurn()` for callers that need to explicitly
 * clear per-turn state (e.g. when disconnecting).
 */
export function usePipelineState() {
  const [pipeline, setPipeline] = useState<PipelineState>(DEFAULT_PIPELINE);
  const [accumulator, setAccumulator] =
    useState<AccumulatorState>(DEFAULT_ACCUMULATOR);
  const [accent, setAccent] = useState<AccentDetectionState>(DEFAULT_ACCENT);

  // Track per-stage start timestamps for accurate latency measurement
  const startTimesRef = useRef<{
    stt?: number;
    llm?: number;
    tts?: number;
  }>({});

  const markRunning = (key: keyof PipelineState) => {
    const now = performance.now();
    startTimesRef.current[key] = now;
    setPipeline((prev) => ({
      ...prev,
      [key]: { status: "running", startedAt: now } satisfies Stage,
    }));
  };

  const markDone = (key: keyof PipelineState) => {
    const start = startTimesRef.current[key];
    const latency = start != null ? Math.round(performance.now() - start) : undefined;
    setPipeline((prev) => ({
      ...prev,
      [key]: { status: "done", latencyMs: latency } satisfies Stage,
    }));
  };

  const resetTurn = useCallback(() => {
    startTimesRef.current = {};
    setPipeline(DEFAULT_PIPELINE);
  }, []);

  const resetAll = useCallback(() => {
    startTimesRef.current = {};
    setPipeline(DEFAULT_PIPELINE);
    setAccumulator(DEFAULT_ACCUMULATOR);
    setAccent(DEFAULT_ACCENT);
  }, []);

  /**
   * Route a WebSocket event through the pipeline state machine.
   * Safe to call for events the hook does not care about.
   */
  const handleEvent = useCallback((data: any) => {
    if (!data || typeof data !== "object") return;

    switch (data.event) {
      case "listening":
        // A new turn is starting — reset the per-turn pipeline
        startTimesRef.current = {};
        setPipeline(DEFAULT_PIPELINE);
        break;

      case "thinking":
        // Backend has received the audio blob; STT is about to run.
        // Backend does STT then LLM sequentially without an intermediate
        // event, so mark STT running here.
        markRunning("stt");
        break;

      case "transcript":
        // STT finished producing text; LLM starts next
        markDone("stt");
        markRunning("llm");
        break;

      case "assistant_message":
        // LLM finished; TTS begins processing now
        markDone("llm");
        markRunning("tts");
        break;

      case "speaking":
        markRunning("tts");
        break;

      case "aria_speech":
        // Audio is generated and playback begins.
        // We do NOT markDone("tts") here because we want the latency to include playback time.
        break;

      case "idle":
        // End of turn (playback is done). Mark TTS as done to finalize the latency.
        if (pipeline.tts.status === "running") {
          markDone("tts");
        }
        break;

      case "accumulator_progress":
        setAccumulator({
          accumulatedSeconds: Number(data.accumulated_seconds ?? 0),
          targetSeconds: Number(data.target_seconds ?? 20),
          isReady: Boolean(data.is_ready),
        });
        // Inferred accent-detection lifecycle: when backend flips is_ready
        // true, detection is running; we transition status to "detecting"
        // and wait for `telemetry` to complete it.
        if (data.is_ready) {
          setAccent((prev) =>
            prev.status === "detected"
              ? { status: "detecting", label: prev.label, confidence: prev.confidence }
              : { status: "detecting" }
          );
        }
        break;

      case "telemetry":
        setAccent({
          status: "detected",
          label: data.accent,
          confidence: typeof data.confidence === "number" ? data.confidence : undefined,
          top3: Array.isArray(data.top3) ? data.top3 : undefined,
        });
        break;

      default:
        // Ignore unrelated events
        break;
    }
  }, []);

  return {
    pipeline,
    accumulator,
    accent,
    handleEvent,
    resetTurn,
    resetAll,
  } as const;
}
