"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileAudio, BarChart3, Clock, Cpu } from "lucide-react";
import { ReportDetail } from "../types";

interface ReportViewProps {
  report: ReportDetail;
}

export const ReportView = React.memo(function ReportView({ report }: ReportViewProps) {
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return "—";
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  // Sort accent scores descending
  const sortedScores = report.accent_scores
    ? Object.entries(report.accent_scores).sort(([, a], [, b]) => b - a)
    : [];

  const maxScore =
    sortedScores.length > 0 ? Math.max(...sortedScores.map(([, v]) => v)) : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-accent-purple/5 rounded-[24px] p-6"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent-purple/10 flex items-center justify-center">
            <FileAudio className="w-6 h-6 text-accent-purple" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">
              {report.file_name}
            </h1>
            <p className="text-xs text-foreground/40 mt-1">
              {formatDate(report.created_at)}
            </p>
          </div>
        </div>

        {/* Audio Player */}
        {report.file_url && (
          <div className="mt-5">
            <audio
              controls
              src={report.file_url}
              className="w-full rounded-xl"
            />
          </div>
        )}
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-accent-purple/5 rounded-[20px] p-5"
        >
          <span className="block text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2">
            Accent
          </span>
          <span className="block text-lg font-bold text-foreground">
            {report.predicted_accent}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-accent-purple/5 rounded-[20px] p-5"
        >
          <span className="block text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2">
            Confidence
          </span>
          <span className="block text-lg font-bold text-accent-purple">
            {report.confidence.toFixed(1)}%
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-accent-purple/5 rounded-[20px] p-5"
        >
          <span className="block text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Duration
          </span>
          <span className="block text-lg font-bold text-foreground">
            {formatDuration(report.file_duration)}
          </span>
        </motion.div>
      </div>

      {/* Accent Scores */}
      {sortedScores.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-accent-purple/5 rounded-[24px] p-6"
        >
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> All Accent Scores
          </h3>
          <div className="space-y-3">
            {sortedScores.map(([label, score], i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-foreground capitalize">
                    {label}
                  </span>
                  <span className="text-xs font-bold text-foreground/50">
                    {score.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-foreground/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(score / maxScore) * 100}%`,
                    }}
                    transition={{
                      duration: 0.8,
                      delay: 0.4 + i * 0.05,
                      ease: "easeOut",
                    }}
                    className="h-full rounded-full"
                    style={{
                      background:
                        i === 0
                          ? "linear-gradient(90deg, #6D5EF5, #8B7CFF)"
                          : i === 1
                          ? "linear-gradient(90deg, #FF9B5E, #FFB88C)"
                          : "linear-gradient(90deg, #FF7E6B, #FF9E91)",
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Telemetry */}
      {report.telemetry && Object.keys(report.telemetry).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-accent-purple/5 rounded-[24px] p-6"
        >
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4" /> Telemetry
          </h3>
          <pre className="text-xs text-foreground/60 bg-foreground/[0.03] rounded-xl p-4 overflow-x-auto font-mono custom-scrollbar">
            {JSON.stringify(report.telemetry, null, 2)}
          </pre>
        </motion.div>
      )}
    </div>
  );
});
