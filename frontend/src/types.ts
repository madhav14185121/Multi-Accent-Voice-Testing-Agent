export interface ReportDetail {
  id: string;
  file_name: string;
  file_url: string | null;
  file_duration: number | null;
  predicted_accent: string;
  confidence: number;
  accent_scores: Record<string, number>;
  telemetry: Record<string, unknown> | null;
  created_at: string;
}

export type PanelState = {
  view: "conversation" | "analysis" | "history";
  payload?: any;
};

export type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

export interface AriaSpeechEvent {
  event: "aria_speech";
  audio_base64: string;
  mime_type: string;
  sample_rate: number;
  duration_ms: number;
  voice_used: string;
}

// ── Pipeline / Live Analysis types ─────────────────────────────

export type StageStatus = "pending" | "running" | "done";

export interface Stage {
  status: StageStatus;
  latencyMs?: number;
  startedAt?: number; // performance.now() timestamp
}

export interface PipelineState {
  stt: Stage;
  llm: Stage;
  tts: Stage;
}

export interface AccumulatorState {
  accumulatedSeconds: number;
  targetSeconds: number;
  isReady: boolean; // backend flipped true, detection is running
}

export type AccentDetectionStatus = "idle" | "detecting" | "detected";

export interface AccentDetectionState {
  status: AccentDetectionStatus;
  label?: string;
  confidence?: number;
  top3?: { label: string; confidence: number }[];
}
