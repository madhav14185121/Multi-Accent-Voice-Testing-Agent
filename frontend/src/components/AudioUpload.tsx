"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileAudio, PlayCircle, Loader2 } from "lucide-react";

export const AudioUpload = React.memo(function AudioUpload({ onDetected }: { onDetected?: (accent: string, confidence: number) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ accent: string; confidence: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    // Check type and size (max 25MB)
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
    setResult(null);
    setError(null);
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleRunDetection = async () => {
    if (!file) return;
    setIsProcessing(true);
    setResult(null);
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
        setResult({ accent: data.accent, confidence: data.confidence });
        if (onDetected) {
          onDetected(data.accent, data.confidence);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to server");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-accent-purple/5 rounded-[24px] p-5 w-full">
      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-3">
        Accent Detection
      </h3>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-[16px] transition-colors
          ${isDragging ? "border-accent-purple bg-accent-purple/5" : "border-black/10 bg-white/50 hover:bg-white"}
        `}
      >
        <input
          type="file"
          accept=".wav,.mp3,.m4a"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          aria-label="Upload Audio File"
        />

        <motion.div animate={{ scale: isDragging ? 1.1 : 1 }}>
          <UploadCloud className={`mb-2 ${isDragging ? "text-accent-purple" : "text-foreground/40"}`} size={28} />
        </motion.div>

        <p className="text-sm font-medium text-foreground text-center">
          <span className="text-accent-purple underline">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-foreground/50 mt-1">.wav, .mp3, .m4a up to 25MB</p>
      </div>

      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 p-3 bg-white rounded-[12px] border border-black/5">
              <div className="p-2 bg-accent-purple/10 text-accent-purple rounded-lg">
                <FileAudio size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                <p className="text-xs text-foreground/50">{formatSize(file.size)}</p>
              </div>
            </div>

            {!result ? (
              <>
                <button
                  onClick={handleRunDetection}
                  disabled={isProcessing}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-foreground text-background px-4 py-3 rounded-[12px] text-sm font-semibold transition-all hover:bg-foreground/90 disabled:opacity-70"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <PlayCircle size={16} />
                      Run Accent Detection
                    </>
                  )}
                </button>
                {error && (
                  <div className="mt-2 text-xs text-red-500 font-medium text-center">
                    {error}
                  </div>
                )}
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-accent-purple/5 border border-accent-purple/20 rounded-[12px] flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-foreground/60 uppercase">Detected Accent</span>
                  <span className="text-sm font-bold text-accent-purple">{result.accent}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-foreground/60 uppercase">Confidence</span>
                  <span className="text-sm font-bold text-foreground">{result.confidence}%</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
