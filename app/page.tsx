"use client";

import { useState } from "react";
import { Scene } from "@/lib/scriptParser";
import ScriptSetup from "@/components/ScriptSetup";
import Studio from "@/components/Studio";

type AppState = "setup" | "studio";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("setup");
  const [scenes, setScenes] = useState<Scene[]>([]);

  const handleScriptsReady = (parsedScenes: Scene[]) => {
    setScenes(parsedScenes);
    setAppState("studio");
  };

  const handleBack = () => {
    setAppState("setup");
  };

  if (appState === "studio" && scenes.length > 0) {
    return <Studio scenes={scenes} onBack={handleBack} />;
  }

  return <ScriptSetup onReady={handleScriptsReady} />;
}
