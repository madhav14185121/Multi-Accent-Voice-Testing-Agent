"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileAudio, PlayCircle, Loader2 } from "lucide-react";
import { ReportDetail } from "../types";

export const AudioUpload = React.memo(function AudioUpload({ 
  onDetected,
  onDetectionComplete
}: { 
  onDetected?: (accent: string, confidence: number, duration: number) => void;
  onDetectionComplete?: (report: ReportDetail) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  }, []);

  const validateAndSetFile = (f: File) => {
    const validTypes = ["audio/wav", "audio/mpeg", "audio/mp3", "audio/x-m4a", "audio/m4a", "audio/mp4"];
    if (!validTypes.includes(f.type) && !f.name.match(/\.(wav|mp3|m4a)$/i)) {
      alert("Please upload a .wav, .mp3, or .m4a file.");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      alert("File is too large. Maximum size is 25MB.");
      return;
    }
    setFile(f);
    setError(null);
    setHasRun(false);
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleRunDetection = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "An error occurred during detection");
      } else if (data.success) {
        setHasRun(true);
        // Continue backward compatibility
        if (onDetected) {
          onDetected(data.accent, data.confidence, Math.round(data.duration_seconds));
        }
        
        // Extract scores from top3 array if available
        const scores: Record<string, number> = {};
        if (data.top3 && Array.isArray(data.top3)) {
          data.top3.forEach((item: any) => {
            if (item.label && item.confidence) {
              scores[item.label] = item.confidence;
            }
          });
        }

        // Pass full report for new UI
        if (onDetectionComplete) {
          onDetectionComplete({
            id: data.report_id || data.id || Date.now().toString(),
            file_name: file.name,
            file_url: data.file_url || null,
            file_duration: data.duration_seconds,
            predicted_accent: data.accent,
            confidence: data.confidence,
            accent_scores: scores,
            telemetry: data.telemetry || null,
            created_at: new Date().toISOString()
          });
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to server");
    } finally {
      setIsProcessing(false);
      // We don't clear the file here so they see what they uploaded, but the result UI is handled in RightPanel
    }
  };

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-2xl shadow-accent-purple/10 rounded-[28px] p-6 w-full">
      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-4">
        Accent Detection
      </h3>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-[20px] transition-all duration-300
          ${isDragging ? "border-accent-purple bg-accent-purple/5 scale-105" : "border-black/10 bg-white/50 hover:bg-white hover:border-black/20"}
        `}
      >
        <input
          type="file"
          accept=".wav,.mp3,.m4a"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          aria-label="Upload Audio File"
        />

        <motion.div animate={{ scale: isDragging ? 1.1 : 1, y: isDragging ? -4 : 0 }} transition={{ type: "spring", stiffness: 300 }}>
          <UploadCloud className={`mb-3 ${isDragging ? "text-accent-purple" : "text-foreground/40"}`} size={32} />
        </motion.div>

        <p className="text-sm font-medium text-foreground text-center">
          <span className="text-accent-purple font-semibold">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-foreground/40 mt-1.5 font-medium">.wav, .mp3, .m4a up to 25MB</p>
      </div>

      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 20 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 p-3 bg-white/80 rounded-[16px] border border-black/5 shadow-sm">
              <div className="p-2.5 bg-accent-purple/10 text-accent-purple rounded-xl">
                <FileAudio size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                <p className="text-xs font-medium text-foreground/50">{formatSize(file.size)}</p>
              </div>
            </div>

            {!hasRun ? (
              <button
                onClick={handleRunDetection}
                disabled={isProcessing}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-foreground text-background px-4 py-3.5 rounded-[16px] text-sm font-semibold transition-all hover:bg-foreground/90 disabled:opacity-70 shadow-lg shadow-black/10 active:scale-[0.98]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <PlayCircle size={18} />
                    Run Accent Detection
                  </>
                )}
              </button>
            ) : (
              <div className="w-full mt-4 flex items-center justify-center gap-2 bg-accent-purple/10 text-accent-purple px-4 py-3.5 rounded-[16px] text-sm font-semibold">
                Detection Complete
              </div>
            )}
            
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-xs text-red-500 font-medium text-center bg-red-50 py-2 rounded-lg">
                {error}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
