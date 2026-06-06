"use client";

import { useState } from "react";
import { Scene, parseScript, estimateDuration, formatTime } from "@/lib/scriptParser";

interface Props {
  onReady: (scenes: Scene[]) => void;
}

const SAMPLE = `[SCENE 1]

Hi Smart Home Family...
Nenu meeku oka question adugutanu.

Ee channel lo two months videos raakapothe meeru em anukunnaru?
Business baaga ledha ani? Projects levemo ani?

[SCENE 2]

Kaani ee two months lo jarigindhi konchem different.
Business aagaledu. Projects aagaledu. Work kuda aagaledu.

[SCENE 3]

Speed tagginchadam wrong kaadhu.
Direction correct cheskovadam important.
Memu adhe chesam.`;

export default function ScriptSetup({ onReady }: Props) {
  const [script, setScript] = useState("");
  const [parsed, setParsed] = useState<Scene[] | null>(null);
  const [fontSize, setFontSize] = useState(24);
  const [error, setError] = useState("");

  function prepare() {
    const text = script.trim();
    if (!text) { setError("Please paste your script first"); return; }
    setError("");
    const scenes = parseScript(text);
    if (scenes.length === 0) { setError("Could not detect scenes. Try adding [SCENE 1] markers."); return; }
    setParsed(scenes);
  }

  function openStudio() {
    if (parsed) onReady(parsed);
  }

  const totalWords = parsed?.reduce((a, s) => a + s.wordCount, 0) ?? 0;
  const estSecs    = parsed ? estimateDuration(parsed, 110) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#fff", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ background: "#161b22", borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#06b6d4", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>V</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Voiceover Studio</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Smart.Homeinteriors Creator Tool</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 16, maxWidth: 640, width: "100%", margin: "0 auto" }}>

        {!parsed ? (
          <>
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Paste Your Script</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
                Use <code style={{ background: "rgba(6,182,212,0.15)", color: "#22d3ee", padding: "2px 6px", borderRadius: 4 }}>[SCENE 1]</code> markers or just paste
              </p>
            </div>

            {/* Textarea */}
            <textarea
              value={script}
              onChange={(e) => { setScript(e.target.value); setError(""); }}
              placeholder={"Paste your script here...\n\nExample:\n[SCENE 1]\nYour first scene.\n\n[SCENE 2]\nYour second scene."}
              style={{
                width: "100%",
                minHeight: 200,
                background: "#161b22",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                padding: 16,
                color: "#fff",
                fontSize: 15,
                lineHeight: 1.7,
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />

            {/* Sample button */}
            <button
              onClick={() => { setScript(SAMPLE); setError(""); }}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "12px 16px",
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                cursor: "pointer",
                width: "100%",
              }}
            >
              Load Sample Script →
            </button>

            {/* Error */}
            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", color: "#fca5a5", fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* PREPARE BUTTON */}
            <button
              onClick={prepare}
              style={{
                width: "100%",
                padding: "18px 0",
                borderRadius: 18,
                background: "#06b6d4",
                color: "#000",
                fontWeight: 800,
                fontSize: 18,
                border: "none",
                cursor: "pointer",
                letterSpacing: "-0.01em",
              }}
            >
              Prepare Script →
            </button>
          </>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "Scenes",   value: parsed.length },
                { label: "Words",    value: totalWords },
                { label: "Duration", value: formatTime(estSecs) },
              ].map((s) => (
                <div key={s.label} style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#22d3ee" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Scene list */}
            <div style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Detected Scenes</span>
                <button onClick={() => setParsed(null)} style={{ fontSize: 12, color: "#22d3ee", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
                  ✎ Edit script
                </button>
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {parsed.map((scene, i) => (
                  <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)", color: "#22d3ee", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      {scene.id}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{scene.title}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                        {scene.wordCount} words · ~{formatTime(scene.estimatedSeconds)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", flexShrink: 0 }}>Text Size</span>
              <input
                type="range" min={16} max={44} value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#06b6d4", height: 20 }}
              />
              <span style={{ fontSize: 13, color: "#22d3ee", fontFamily: "monospace", flexShrink: 0, minWidth: 36, textAlign: "right" }}>{fontSize}px</span>
            </div>

            {/* OPEN STUDIO BUTTON */}
            <button
              onClick={openStudio}
              style={{
                width: "100%",
                padding: "18px 0",
                borderRadius: 18,
                background: "#06b6d4",
                color: "#000",
                fontWeight: 800,
                fontSize: 18,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(0,0,0,0.25)" }} />
              Open Studio &amp; Record
            </button>

            <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", margin: 0 }}>
              Camera &amp; microphone permission required on next screen
            </p>
          </>
        )}
      </div>
    </div>
  );
}
