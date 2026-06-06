"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Scene, formatTime } from "@/lib/scriptParser";
import { useCamera } from "@/hooks/useCamera";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import VideoReview from "./VideoReview";

interface Props {
  scenes: Scene[];
  onBack: () => void;
}

type Format = "16:9" | "9:16";

interface TLine {
  text: string;
  sceneIdx: number;
  isMarker: boolean;
}

// ─── Split all text into SHORT lines (~55 chars max) ─────────────────
function buildLines(scenes: Scene[]): TLine[] {
  const out: TLine[] = [];
  scenes.forEach((scene, si) => {
    out.push({ text: `◆  ${scene.title}`, sceneIdx: si, isMarker: true });
    const sentences = scene.text
      .replace(/\n+/g, " ")
      .trim()
      .split(/(?<=[.!?।])\s+/)
      .filter(Boolean);

    sentences.forEach((sentence) => {
      const words = sentence.trim().split(/\s+/);
      let chunk = "";
      words.forEach((w) => {
        if (chunk.length + w.length + 1 > 52 && chunk) {
          out.push({ text: chunk, sceneIdx: si, isMarker: false });
          chunk = w;
        } else {
          chunk = chunk ? chunk + " " + w : w;
        }
      });
      if (chunk) out.push({ text: chunk, sceneIdx: si, isMarker: false });
    });
    out.push({ text: "", sceneIdx: si, isMarker: false }); // spacer
  });
  return out;
}

// ─── Studio ──────────────────────────────────────────────────────────
export default function Studio({ scenes, onBack }: Props) {
  const [showReview, setShowReview]         = useState(false);
  const [format, setFormat]                 = useState<Format>("16:9");
  const [fontSize, setFontSize]             = useState(24);
  const [speed, setSpeed]                   = useState(0.3);
  const [isScrolling, setIsScrolling]       = useState(false);
  const [currentLineIdx, setCurrentLineIdx] = useState(0);

  const camera   = useCamera();
  const recorder = useMediaRecorder();

  const lines  = buildLines(scenes);
  const LINE_H = Math.round(fontSize * 2.2);
  const STRIP_H = LINE_H * 4 + 16;  // show 4 lines

  // ── Scroll engine ──────────────────────────────────────────────────
  const prompterRef  = useRef<HTMLDivElement>(null);
  const posRef       = useRef(0);
  const lastTRef     = useRef<number | null>(null);
  const rafRef       = useRef<number | null>(null);
  const scrollingRef = useRef(false);
  const speedRef     = useRef(speed);
  const lineHRef     = useRef(LINE_H);

  useEffect(() => { speedRef.current = speed; },   [speed]);
  useEffect(() => { lineHRef.current = LINE_H; },  [LINE_H]);

  const tick = useCallback((ts: number) => {
    if (!scrollingRef.current) return;
    if (!lastTRef.current) lastTRef.current = ts;
    const dt = Math.min((ts - lastTRef.current) / 1000, 0.1);
    lastTRef.current = ts;
    posRef.current += speedRef.current * lineHRef.current * dt;
    if (prompterRef.current) {
      prompterRef.current.style.transform = `translateY(-${posRef.current}px)`;
      setCurrentLineIdx(Math.min(
        Math.floor(posRef.current / lineHRef.current),
        lines.length - 1
      ));
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [lines.length]);

  const play = useCallback(() => {
    lastTRef.current = null;
    scrollingRef.current = true;
    setIsScrolling(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    scrollingRef.current = false;
    setIsScrolling(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    lastTRef.current = null;
  }, []);

  const toggle = useCallback(() => scrollingRef.current ? pause() : play(), [play, pause]);

  const reset = useCallback(() => {
    pause();
    posRef.current = 0;
    setCurrentLineIdx(0);
    if (prompterRef.current) prompterRef.current.style.transform = "translateY(0px)";
  }, [pause]);

  const jumpToScene = useCallback((si: number) => {
    const idx = lines.findIndex((l) => l.sceneIdx === si && l.isMarker);
    if (idx < 0) return;
    posRef.current = idx * lineHRef.current;
    setCurrentLineIdx(idx);
    if (prompterRef.current)
      prompterRef.current.style.transform = `translateY(-${posRef.current}px)`;
  }, [lines]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ── Camera — single video ref, re-attach on format switch ─────────
  const videoEl = useRef<HTMLVideoElement | null>(null);

  const attachStream = useCallback((el: HTMLVideoElement | null) => {
    videoEl.current = el;
    if (el && camera.stream) {
      el.srcObject = camera.stream;
    }
    // also update the hook's ref so it stays in sync
    (camera.videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
  }, [camera.stream, camera.videoRef]);

  // Re-attach when stream changes
  useEffect(() => {
    if (videoEl.current && camera.stream) {
      videoEl.current.srcObject = camera.stream;
    }
  }, [camera.stream]);

  useEffect(() => {
    camera.startCamera("user");
    return () => camera.stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case "Space":     e.preventDefault(); toggle(); break;
        case "ArrowUp":   setSpeed(s => Math.min(2, +(s + 0.05).toFixed(2))); break;
        case "ArrowDown": setSpeed(s => Math.max(0.05, +(s - 0.05).toFixed(2))); break;
        case "KeyR":
          if (recorder.state === "idle" || recorder.state === "stopped") {
            if (camera.stream) { recorder.start(camera.stream); reset(); play(); }
          } else if (recorder.state === "recording") { recorder.pause(); pause(); }
          else if (recorder.state === "paused")      { recorder.resume(); play(); }
          break;
        case "KeyS":  recorder.stop(); pause(); break;
        case "Escape": onBack(); break;
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [recorder, camera.stream, toggle, reset, play, pause, onBack]);

  // ── Show review when recording stops ──────────────────────────────
  useEffect(() => {
    if (recorder.state === "stopped" && recorder.result) { pause(); setShowReview(true); }
  }, [recorder.state, recorder.result, pause]);

  // ── Record Again: restart camera ──────────────────────────────────
  const handleRecordAgain = useCallback(async () => {
    recorder.reset();
    reset();
    setShowReview(false);
    await camera.startCamera(camera.facing);
  }, [recorder, reset, camera]);

  const handleRecord = () => {
    if (recorder.state === "idle" || recorder.state === "stopped") {
      if (camera.stream) { recorder.start(camera.stream); reset(); play(); }
    } else if (recorder.state === "recording") { recorder.pause(); pause(); }
    else if (recorder.state === "paused")      { recorder.resume(); play(); }
  };

  const handleStop = () => { recorder.stop(); pause(); };

  const currentScene = lines[currentLineIdx]?.sceneIdx ?? 0;
  const progressPct  = lines.length > 1 ? (currentLineIdx / (lines.length - 1)) * 100 : 0;
  const isPortrait   = format === "9:16";
  const speedLabel   = speed <= 0.1 ? "Very Slow" : speed <= 0.25 ? "Slow" : speed <= 0.45 ? "Normal" : speed <= 0.8 ? "Fast" : "Very Fast";

  if (showReview && recorder.result) {
    return <VideoReview result={recorder.result} onRecordAgain={handleRecordAgain} onBack={onBack} />;
  }

  return (
    <div className="h-screen bg-[#050709] text-white flex overflow-hidden select-none">

      {/* ── LEFT SIDEBAR ── */}
      <div className="hidden md:flex flex-col w-36 shrink-0 border-r border-white/10 bg-[#080b0f]">
        {/* Header */}
        <div className="px-3 py-3 border-b border-white/10 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-cyan-500 flex items-center justify-center text-black text-xs font-black">V</div>
          <span className="text-xs font-semibold text-white/60">Studio</span>
        </div>
        {/* Back */}
        <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-2.5 text-left text-xs text-white/40 hover:text-white border-b border-white/10 transition-colors">
          ← Back
        </button>
        {/* Scenes */}
        <div className="px-3 py-1.5 text-[9px] font-bold text-white/20 uppercase tracking-widest">Scenes</div>
        <div className="flex-1 overflow-y-auto">
          {scenes.map((scene, i) => (
            <button key={i} onClick={() => jumpToScene(i)}
              className={`flex gap-2 items-start px-3 py-2.5 w-full text-left border-b border-white/5 transition-colors ${
                currentScene === i ? "bg-cyan-500/10 border-l-2 border-l-cyan-400" : "hover:bg-white/5"
              }`}>
              <span className={`text-xs font-bold min-w-[14px] ${currentScene === i ? "text-cyan-400" : "text-white/20"}`}>{scene.id}</span>
              <div>
                <div className={`text-[10px] leading-snug ${currentScene === i ? "text-white font-semibold" : "text-white/40"}`}>{scene.title}</div>
                <div className="text-[9px] text-white/15 mt-0.5">{scene.wordCount}w</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN COLUMN ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── TOP BAR ── */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-[#0d1117] border-b border-white/10 gap-3">

          {/* Format toggle */}
          <div className="flex gap-1 bg-black/50 border border-white/10 rounded-full p-0.5">
            {(["16:9","9:16"] as Format[]).map((f) => (
              <button
                key={f}
                onPointerDown={() => setFormat(f)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all ${
                  format === f ? "bg-cyan-500 text-black" : "text-white/40"
                }`}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <span className={`border border-current rounded-[2px] flex-shrink-0 ${f === "16:9" ? "w-[14px] h-[9px]" : "w-[9px] h-[14px]"}`} />
                <span className="hidden sm:inline">{f === "16:9" ? "Landscape" : "Portrait / Reel"}</span>
                <span className="sm:hidden">{f}</span>
              </button>
            ))}
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <span className="text-xs text-white/30 whitespace-nowrap">
              Scene <span className="text-white font-semibold">{currentScene + 1}</span>/{scenes.length}
            </span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 transition-all duration-300 rounded-full" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-[10px] text-white/25 font-mono">{Math.round(progressPct)}%</span>
          </div>

          {/* Recording badge */}
          <div className="min-w-[110px] flex justify-end">
            {recorder.state === "recording" && (
              <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 text-xs font-mono font-bold">{formatTime(recorder.elapsed)}</span>
              </div>
            )}
            {recorder.state === "paused" && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 px-2.5 py-1 rounded-full">
                <span className="text-yellow-400 text-xs font-bold">⏸ PAUSED</span>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            TELEPROMPTER — TOP (eyes look up naturally)
        ══════════════════════════════════════════ */}
        <div className="shrink-0 relative bg-[#020406] overflow-hidden" style={{ height: STRIP_H }}>

          {/* Top fade */}
          <div className="absolute inset-x-0 top-0 z-10 pointer-events-none"
            style={{ height: LINE_H * 0.9, background: "linear-gradient(to bottom, #020406, transparent)" }} />

          {/* Active line highlight */}
          <div className="absolute inset-x-0 z-10 pointer-events-none"
            style={{
              top: LINE_H - 2,
              height: LINE_H + 4,
              background: "rgba(6,182,212,0.07)",
              borderTop: "1px solid rgba(6,182,212,0.25)",
              borderBottom: "1px solid rgba(6,182,212,0.25)",
            }} />

          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
            style={{ height: LINE_H * 0.9, background: "linear-gradient(to top, #020406, transparent)" }} />

          {/* Scrolling text */}
          <div
            ref={prompterRef}
            className="will-change-transform"
            style={{ paddingTop: LINE_H, paddingLeft: 80, paddingRight: 80 }}
          >
            {lines.map((line, i) => {
              const dist    = i - currentLineIdx;
              const active  = dist === 0;
              const opacity =
                active            ? 1    :
                Math.abs(dist)===1? 0.4  :
                Math.abs(dist)===2? 0.18 : 0.06;

              return (
                <div key={i} style={{
                  height: LINE_H,
                  display: "flex",
                  alignItems: "center",
                  opacity,
                  transition: "opacity 0.2s",
                  fontSize: active ? fontSize + 2 : fontSize,
                  fontWeight: active ? 700 : line.isMarker ? 600 : 400,
                  color: line.isMarker ? "#22d3ee" : "#ffffff",
                  letterSpacing: line.isMarker ? "0.06em" : "normal",
                  fontStyle: line.isMarker ? "italic" : "normal",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {line.text || " "}
                </div>
              );
            })}
            <div style={{ height: LINE_H * 2 }} />
          </div>
        </div>

        {/* Thin separator */}
        <div className="shrink-0 h-px bg-white/10" />

        {/* ══════════════════════════════════════════
            CAMERA — BOTTOM (fills remaining space)
        ══════════════════════════════════════════ */}
        <div className="flex-1 min-h-0 relative bg-black overflow-hidden flex items-center justify-center">

          {/* Portrait: 9:16 pillar-box */}
          {isPortrait ? (
            <div className="relative h-full flex items-center justify-center bg-black w-full">
              <div className="relative overflow-hidden h-full" style={{ aspectRatio: "9/16", maxWidth: "100%" }}>
                <video
                  ref={attachStream}
                  autoPlay muted playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: camera.facing === "user" ? "scaleX(-1)" : "none" }}
                />
                <CameraOverlay camera={camera} recorder={recorder} format={format} />
              </div>
            </div>
          ) : (
            /* Landscape: full fill */
            <>
              <video
                ref={attachStream}
                autoPlay muted playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: camera.facing === "user" ? "scaleX(-1)" : "none" }}
              />
              <CameraOverlay camera={camera} recorder={recorder} format={format} />
            </>
          )}
        </div>

        {/* ══════════════════════════════════════════
            CONTROLS BAR — mobile-first design
        ══════════════════════════════════════════ */}
        <div className="shrink-0 bg-[#0d1117] border-t border-white/10 px-3 py-2">

          {/* ROW 1 — Scroll + Record (primary actions, big touch targets) */}
          <div className="flex gap-2 mb-2">
            {/* Scroll toggle */}
            <button
              onPointerDown={toggle}
              className={`flex-1 py-3.5 rounded-2xl font-bold text-base transition-all ${
                isScrolling
                  ? "bg-yellow-400/10 border border-yellow-400/40 text-yellow-300"
                  : "bg-white/10 border border-white/15 text-white"
              }`}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {isScrolling ? "⏸  Pause Scroll" : "▶  Scroll"}
            </button>

            {/* Record / Pause */}
            <button
              onPointerDown={handleRecord}
              disabled={camera.permissionState === "denied"}
              className={`flex-1 py-3.5 rounded-2xl font-bold text-base transition-all disabled:opacity-40 ${
                recorder.state === "recording"
                  ? "bg-red-500/15 border border-red-500/50 text-red-300"
                  : recorder.state === "paused"
                  ? "bg-yellow-500/15 border border-yellow-500/50 text-yellow-300"
                  : "bg-red-500 text-white shadow-lg shadow-red-900/30"
              }`}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {recorder.state === "idle" || recorder.state === "stopped"
                ? "⏺  Record"
                : recorder.state === "recording" ? "⏸  Pause"
                : "▶  Resume"}
            </button>

            {/* Stop — only when recording/paused */}
            {(recorder.state === "recording" || recorder.state === "paused") && (
              <button
                onPointerDown={handleStop}
                className="px-4 py-3.5 rounded-2xl bg-white/10 border border-white/15 text-white font-bold text-base"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                ⏹
              </button>
            )}
          </div>

          {/* ROW 2 — Scene nav + Speed + Font */}
          <div className="flex gap-2 items-center">

            {/* Scene prev/restart/next */}
            <div className="flex gap-1">
              <MobileBtn onPointerDown={() => jumpToScene(Math.max(0, currentScene - 1))}>← Sc</MobileBtn>
              <MobileBtn onPointerDown={reset}>↺</MobileBtn>
              <MobileBtn onPointerDown={() => jumpToScene(Math.min(scenes.length-1, currentScene+1))}>Sc →</MobileBtn>
            </div>

            <div className="w-px h-8 bg-white/10 shrink-0" />

            {/* Speed − value + */}
            <div className="flex items-center bg-black/50 border border-white/10 rounded-xl overflow-hidden">
              <button
                onPointerDown={() => setSpeed(s => Math.max(0.05, +(s-0.05).toFixed(2)))}
                className="w-10 h-10 flex items-center justify-center text-white font-bold text-xl active:bg-white/10"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >−</button>
              <div className="px-1 text-center min-w-[52px]">
                <div className="text-cyan-400 font-mono text-xs font-bold">{speed.toFixed(2)}×</div>
                <div className="text-white/25 text-[8px]">{speedLabel}</div>
              </div>
              <button
                onPointerDown={() => setSpeed(s => Math.min(2, +(s+0.05).toFixed(2)))}
                className="w-10 h-10 flex items-center justify-center text-white font-bold text-xl active:bg-white/10"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >+</button>
            </div>

            {/* Font − + */}
            <div className="flex items-center bg-black/50 border border-white/10 rounded-xl overflow-hidden">
              <button
                onPointerDown={() => setFontSize(f => Math.max(14, f-2))}
                className="w-10 h-10 flex items-center justify-center text-white/60 text-sm font-bold active:bg-white/10"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >A−</button>
              <button
                onPointerDown={() => setFontSize(f => Math.min(44, f+2))}
                className="w-10 h-10 flex items-center justify-center text-white/60 text-sm font-bold active:bg-white/10"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >A+</button>
            </div>

            {/* Flip */}
            <button
              onPointerDown={camera.flipCamera}
              className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-white/50 text-base"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >⟳</button>
          </div>

          {/* Keyboard hints — desktop only */}
          <div className="hidden md:flex gap-3 mt-1.5 text-[9px] text-white/15">
            {[["Space","Scroll"],["↑↓","Speed"],["R","Record"],["S","Stop"],["Esc","Back"]].map(([k,v]) => (
              <span key={k}><kbd className="bg-white/8 px-1 rounded font-mono">{k}</kbd> {v}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function Btn({ onClick, children, title }: { onClick:()=>void; children: React.ReactNode; title?: string }) {
  return (
    <button onClick={onClick} title={title}
      className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white text-xs font-medium transition-colors">
      {children}
    </button>
  );
}

function MobileBtn({ onPointerDown, children }: { onPointerDown:()=>void; children: React.ReactNode }) {
  return (
    <button
      onPointerDown={onPointerDown}
      className="h-10 px-3 rounded-xl bg-white/8 border border-white/10 text-white/60 text-xs font-semibold active:bg-white/15 flex items-center justify-center"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {children}
    </button>
  );
}

function CameraOverlay({
  camera, recorder, format,
}: {
  camera: ReturnType<typeof useCamera>;
  recorder: ReturnType<typeof useMediaRecorder>;
  format: Format;
}) {
  return (
    <>
      {/* Camera off / loading states */}
      {(camera.permissionState === "denied" || camera.permissionState === "idle") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#080c10] z-10">
          <div className="text-5xl opacity-20">📷</div>
          <p className="text-white/40 text-sm text-center px-4">
            {camera.permissionState === "denied"
              ? "Camera blocked — click the 🔒 icon in address bar to allow"
              : "Camera not started"}
          </p>
          <button onClick={() => camera.startCamera("user")}
            className="text-xs text-cyan-400 border border-cyan-400/30 px-3 py-1.5 rounded-full hover:bg-cyan-400/10 transition-colors">
            Allow Camera
          </button>
        </div>
      )}
      {camera.permissionState === "requesting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#080c10] z-10">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Recording border pulse */}
      {recorder.state === "recording" && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="absolute inset-0 border-[3px] border-red-500/70 animate-pulse" />
        </div>
      )}

      {/* Corner frame guides */}
      {["top-3 left-3 border-t-2 border-l-2",
        "top-3 right-3 border-t-2 border-r-2",
        "bottom-3 left-3 border-b-2 border-l-2",
        "bottom-3 right-3 border-b-2 border-r-2",
      ].map((c, i) => (
        <div key={i} className={`absolute w-5 h-5 border-cyan-400/25 pointer-events-none ${c}`} />
      ))}

      {/* Format badge */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <span className="bg-black/40 backdrop-blur text-[9px] text-white/20 font-mono px-1.5 py-0.5 rounded">
          {format}
        </span>
      </div>
    </>
  );
}
