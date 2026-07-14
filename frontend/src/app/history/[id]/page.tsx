"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { ReportView } from "@/components/ReportView";
import { ReportDetail } from "@/types";

export default function ReportDetailPage() {
  const params = useParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`http://localhost:8000/api/history/${reportId}`);
        if (res.status === 404) {
          setError("Report not found.");
          return;
        }
        const data = await res.json();
        if (data.success) {
          setReport(data.report);
        } else {
          setError("Failed to load report.");
        }
      } catch {
        setError("Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    }
    if (reportId) fetchReport();
  }, [reportId]);

  return (
    <div className="relative min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            href="/history"
            className="inline-flex items-center gap-2 text-sm text-foreground/50 hover:text-accent-purple transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to History
          </Link>
        </motion.div>

        {/* Loading */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-24"
          >
            <Loader2 className="w-6 h-6 text-accent-purple animate-spin" />
            <span className="ml-3 text-sm text-foreground/50">Loading report…</span>
          </motion.div>
        )}

        {/* Error */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50/60 backdrop-blur-xl border border-red-200/60 rounded-[20px] p-8 text-center"
          >
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-600">{error}</p>
          </motion.div>
        )}

        {/* Report Detail */}
        {!loading && !error && report && <ReportView report={report} />}
      </main>
    </div>
  );
}
