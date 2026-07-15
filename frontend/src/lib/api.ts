import { ReportDetail } from "../types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export async function fetchHistory() {
  const res = await fetch(`${API_BASE}/api/history`);
  if (!res.ok) {
    throw new Error("Failed to fetch history");
  }
  return res.json();
}

export async function fetchReport(id: string) {
  const res = await fetch(`${API_BASE}/api/history/${id}`);
  if (!res.ok) {
    throw new Error("Failed to fetch report");
  }
  return res.json();
}
