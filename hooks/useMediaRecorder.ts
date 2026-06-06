"use client";

import { useRef, useState, useCallback } from "react";

export type RecordingState = "idle" | "recording" | "paused" | "stopped";

export interface RecordingResult {
  blob: Blob;
  url: string;
  duration: number; // seconds
  size: number;
}

export function useMediaRecorder() {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0); // seconds
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  const getSupportedMime = () => {
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    return types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const start = useCallback(async (stream: MediaStream) => {
    try {
      chunksRef.current = [];
      elapsedRef.current = 0;
      setElapsed(0);
      setResult(null);
      setError(null);

      const mimeType = getSupportedMime();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const mimeType = getSupportedMime();
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "video/webm",
        });
        const url = URL.createObjectURL(blob);
        setResult({
          blob,
          url,
          duration: elapsedRef.current,
          size: blob.size,
        });
        setState("stopped");
      };

      mr.start(100);
      setState("recording");
      startTimer();
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      stopTimer();
      setState("paused");
    }
  }, []);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      startTimer();
      setState("recording");
    }
  }, []);

  const stop = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      stopTimer();
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setState("idle");
    setElapsed(0);
    setResult(null);
    setError(null);
    chunksRef.current = [];
    elapsedRef.current = 0;
  }, [stop]);

  const download = useCallback(
    (filename?: string) => {
      if (!result) return;
      const ext = result.blob.type.includes("mp4") ? "mp4" : "webm";
      const name =
        filename ||
        `voiceover_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.${ext}`;
      const a = document.createElement("a");
      a.href = result.url;
      a.download = name;
      a.click();
    },
    [result]
  );

  return {
    state,
    elapsed,
    result,
    error,
    start,
    pause,
    resume,
    stop,
    reset,
    download,
  };
}
