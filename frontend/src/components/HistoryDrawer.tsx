"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileAudio, Calendar, Clock, ChevronRight, Loader2, Inbox, ArrowRight } from "lucide-react";
import { ReportDetail } from "../types";
import { fetchHistory as fetchHistoryApi, fetchReport as fetchReportApi } from "../lib/api";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReport: (report: ReportDetail) => void;
}

export const HistoryDrawer = React.memo(function HistoryDrawer({
  isOpen,
  onClose,
  onSelectReport,
}: HistoryDrawerProps) {
  const [reports, setReports] = useState<ReportDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHistoryApi();
      if (data.success) {
        setReports(data.reports);
      } else {
        setError("Failed to load history.");
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDetails = async (id: string) => {
    try {
      const data = await fetchReportApi(id);
      if (data.success) {
        onSelectReport(data.report);
        onClose();
      }
    } catch {
      console.error("Failed to load full report details");
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/20 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-full max-w-[400px] bg-white/70 backdrop-blur-3xl border-r border-white/60 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-black/5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">History</h2>
                <p className="text-xs text-foreground/50 mt-1">Your past audio analyses</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
              >
                <X size={20} className="text-foreground/70" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {loading && (
                <div className="flex flex-col items-center justify-center py-20 text-foreground/50">
                  <Loader2 className="w-8 h-8 animate-spin text-accent-purple mb-4" />
                  <p className="text-sm">Loading history...</p>
                </div>
              )}

              {error && !loading && (
                <div className="bg-red-50 p-4 rounded-xl text-center">
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              {!loading && !error && reports.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-4">
                    <Inbox className="w-8 h-8 text-foreground/30" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground/60 mb-1">No reports yet</h3>
                  <p className="text-xs text-foreground/40 max-w-[200px]">
                    Upload an audio file to see your analysis history here.
                  </p>
                </div>
              )}

              {!loading && !error && reports.length > 0 && (
                <div className="space-y-3">
                  {reports.map((report, i) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => fetchReportDetails(report.id)}
                      className="group bg-white border border-black/5 rounded-[16px] p-4 flex items-center gap-4 hover:shadow-lg hover:border-accent-purple/20 transition-all cursor-pointer hover:-translate-y-0.5"
                    >
                      <div className="w-10 h-10 rounded-full bg-accent-purple/10 flex items-center justify-center shrink-0">
                        <FileAudio className="w-5 h-5 text-accent-purple" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {report.file_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded-full">
                            {report.predicted_accent}
                          </span>
                          <span className="text-xs font-medium text-foreground/40 flex items-center gap-1">
                            <Clock size={10} />
                            {formatDuration(report.file_duration)}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <span className="text-[10px] font-medium text-foreground/40">
                          {formatDate(report.created_at)}
                        </span>
                        <ArrowRight size={14} className="text-foreground/20 group-hover:text-accent-purple transition-colors group-hover:translate-x-1" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
