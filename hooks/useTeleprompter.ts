"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Scene } from "@/lib/scriptParser";

export interface TeleprompterState {
  isScrolling: boolean;
  currentScene: number;
  wpm: number;
  progress: number; // 0–100
}

export function useTeleprompter(scenes: Scene[]) {
  const [isScrolling, setIsScrolling] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [wpm, setWpm] = useState(110);
  const [progress, setProgress] = useState(0);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const positionRef = useRef(0); // pixels scrolled
  const isScrollingRef = useRef(false);
  const wpmRef = useRef(110);

  // Keep refs in sync
  useEffect(() => { wpmRef.current = wpm; }, [wpm]);
  useEffect(() => { isScrollingRef.current = isScrolling; }, [isScrolling]);

  // Pixels per second based on WPM
  // Assume ~5 chars/word, font ~30px, ~60 chars/line, line-height 52px
  // words per line ≈ 60/5 = 12, so lines per minute = wpm/12
  // lines per second = wpm / (12 * 60)
  // px per second = lines/sec * lineHeight
  const getPxPerSecond = (w: number) => {
    const lineHeight = 52; // matches CSS
    const wordsPerLine = 10;
    return (w / (wordsPerLine * 60)) * lineHeight;
  };

  const scrollLoop = useCallback((timestamp: number) => {
    if (!isScrollingRef.current) return;

    if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
    const delta = (timestamp - lastTimeRef.current) / 1000; // seconds
    lastTimeRef.current = timestamp;

    const pxPerSec = getPxPerSecond(wpmRef.current);
    positionRef.current += pxPerSec * delta;

    if (scrollRef.current) {
      scrollRef.current.scrollTop = positionRef.current;
      const max = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;
      const pct = max > 0 ? Math.min(100, (positionRef.current / max) * 100) : 0;
      setProgress(Math.round(pct));

      // Detect current scene based on scroll position
      detectCurrentScene();
    }

    animFrameRef.current = requestAnimationFrame(scrollLoop);
  }, []);

  const detectCurrentScene = useCallback(() => {
    if (!scrollRef.current) return;
    const sceneEls = scrollRef.current.querySelectorAll('[data-scene-idx]');
    const containerTop = scrollRef.current.scrollTop;
    const containerMid = containerTop + scrollRef.current.clientHeight * 0.35;

    let found = 0;
    sceneEls.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.offsetTop <= containerMid) {
        found = parseInt(htmlEl.dataset.sceneIdx || '0');
      }
    });
    setCurrentScene(found);
  }, []);

  const play = useCallback(() => {
    lastTimeRef.current = null;
    setIsScrolling(true);
    isScrollingRef.current = true;
    animFrameRef.current = requestAnimationFrame(scrollLoop);
  }, [scrollLoop]);

  const pause = useCallback(() => {
    setIsScrolling(false);
    isScrollingRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    lastTimeRef.current = null;
  }, []);

  const toggle = useCallback(() => {
    if (isScrollingRef.current) pause();
    else play();
  }, [play, pause]);

  const goToScene = useCallback((idx: number) => {
    if (!scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-scene-idx="${idx}"]`) as HTMLElement;
    if (el) {
      positionRef.current = Math.max(0, el.offsetTop - 80);
      scrollRef.current.scrollTop = positionRef.current;
      setCurrentScene(idx);
    }
  }, []);

  const nextScene = useCallback(() => {
    if (currentScene < scenes.length - 1) goToScene(currentScene + 1);
  }, [currentScene, scenes.length, goToScene]);

  const prevScene = useCallback(() => {
    if (currentScene > 0) goToScene(currentScene - 1);
  }, [currentScene, goToScene]);

  const restartScene = useCallback(() => {
    goToScene(currentScene);
  }, [currentScene, goToScene]);

  const restartAll = useCallback(() => {
    positionRef.current = 0;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setCurrentScene(0);
    setProgress(0);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return {
    scrollRef,
    isScrolling,
    currentScene,
    wpm,
    setWpm,
    progress,
    play,
    pause,
    toggle,
    goToScene,
    nextScene,
    prevScene,
    restartScene,
    restartAll,
  };
}
