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
