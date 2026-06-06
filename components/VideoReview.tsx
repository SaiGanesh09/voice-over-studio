"use client";

import { RecordingResult } from "@/hooks/useMediaRecorder";
import { formatTime } from "@/lib/scriptParser";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";

interface Props {
  result: RecordingResult;
  onRecordAgain: () => void;
  onBack: () => void;
}

export default function VideoReview({ result, onRecordAgain, onBack }: Props) {
  const fileSizeMB = (result.size / 1024 / 1024).toFixed(1);
  const ext = result.blob.type.includes("mp4") ? "mp4" : "webm";

  const handleDownload = () => {
    const name = `voiceover_${new Date().toISOString().slice(0,19).replace(/[T:]/g,"-")}.${ext}`;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = name;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-semibold px-4 py-1.5 rounded-full">
            ✓ Recording Complete
          </div>
          <h2 className="text-2xl font-bold text-white mt-3">Your Voiceover is Ready!</h2>
          <p className="text-white/40 text-sm">Preview your recording and download when ready.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Duration", value: formatTime(result.duration) },
            { label: "File Size", value: `${fileSizeMB} MB` },
            { label: "Format", value: ext.toUpperCase() },
          ].map((s) => (
            <div key={s.label} className="bg-[#161b22] border border-white/10 rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-cyan-400">{s.value}</div>
              <div className="text-xs text-white/40 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Video preview */}
        <div className="bg-black rounded-2xl overflow-hidden border border-white/10">
          <video
            src={result.url}
            controls
            className="w-full max-h-[50vh] object-contain"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 py-3.5 rounded-xl font-bold bg-cyan-500 text-black hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2"
          >
            ↓ Download Video
          </button>
          <button
            onClick={onRecordAgain}
            className="flex-1 py-3.5 rounded-xl font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
          >
            ⏺ Record Again
          </button>
          <button
            onClick={onBack}
            className="sm:w-auto px-6 py-3.5 rounded-xl font-semibold bg-transparent border border-white/10 text-white/50 hover:text-white transition-colors"
          >
            ← Back
          </button>
        </div>

        <p className="text-center text-xs text-white/20">
          Video is stored locally in your browser. Download to save permanently.
        </p>
      </div>
    </div>
  );
}
