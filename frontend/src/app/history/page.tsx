"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Clock, FileAudio, ArrowRight, Loader2, Inbox } from "lucide-react";
import Link from "next/link";
import { fetchHistory as fetchHistoryApi } from "@/lib/api";

interface Report {
  id: string;
  file_name: string;
  predicted_accent: string;
  confidence: number;
  file_duration: number | null;
  created_at: string;
}

export default function HistoryPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
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
    }
    fetchHistory();
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
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

  return (
    <div className="relative min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            Upload History
          </h1>
          <p className="text-sm text-foreground/50 mb-8">
            View all your past accent detection analyses.
          </p>
        </motion.div>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-24"
          >
            <Loader2 className="w-6 h-6 text-accent-purple animate-spin" />
            <span className="ml-3 text-sm text-foreground/50">Loading history…</span>
          </motion.div>
        )}

        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50/60 backdrop-blur-xl border border-red-200/60 rounded-[20px] p-6 text-center"
          >
            <p className="text-sm text-red-600">{error}</p>
          </motion.div>
        )}

        {!loading && !error && reports.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-accent-purple/5 rounded-[24px] p-12 text-center"
          >
            <Inbox className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground/60 mb-1">
              No reports yet
            </h2>
            <p className="text-sm text-foreground/40">
              Upload an audio file from the{" "}
              <Link href="/" className="text-accent-purple hover:underline">
                homepage
              </Link>{" "}
              to get started.
            </p>
          </motion.div>
        )}

        {!loading && !error && reports.length > 0 && (
          <div className="space-y-3">
            {reports.map((report, i) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
              >
                <Link href={`/history/${report.id}`}>
                  <div className="group bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-accent-purple/5 rounded-[20px] p-5 flex items-center gap-4 hover:bg-white/60 hover:shadow-2xl hover:shadow-accent-purple/10 transition-all duration-300 cursor-pointer">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent-purple/10 flex items-center justify-center">
                      <FileAudio className="w-5 h-5 text-accent-purple" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {report.file_name}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-medium text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded-full">
                          {report.predicted_accent}
                        </span>
                        <span className="text-xs text-foreground/40">
                          {report.confidence.toFixed(1)}% confidence
                        </span>
                        <span className="text-xs text-foreground/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(report.file_duration)}
                        </span>
                      </div>
                    </div>

                    {/* Date + Arrow */}
                    <div className="flex-shrink-0 text-right flex items-center gap-3">
                      <span className="text-xs text-foreground/30 hidden sm:block">
                        {formatDate(report.created_at)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-foreground/20 group-hover:text-accent-purple group-hover:translate-x-0.5 transition-all duration-200" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
