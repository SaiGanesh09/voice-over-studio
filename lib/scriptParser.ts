export interface Scene {
  id: number;
  title: string;
  text: string;
  wordCount: number;
  estimatedSeconds: number; // at 110 wpm
}

export function parseScript(raw: string): Scene[] {
  if (!raw.trim()) return [];

  // Split on [SCENE N] or [SCENE N: Title] markers
  const sceneMarkerRegex = /\[SCENE\s+(\d+)(?:\s*:\s*([^\]]+))?\]/gi;

  const parts = raw.split(sceneMarkerRegex);
  // parts array when split on 2-capture groups:
  // [before, sceneNum, sceneTitle, content, sceneNum, sceneTitle, content, ...]

  const scenes: Scene[] = [];

  // If no markers, treat whole text as single scene
  if (!raw.match(/\[SCENE/i)) {
    // Split by double newline as scenes
    const blocks = raw.split(/\n\s*\n/).filter(b => b.trim());
    blocks.forEach((block, i) => {
      const words = countWords(block);
      scenes.push({
        id: i + 1,
        title: `Scene ${i + 1}`,
        text: block.trim(),
        wordCount: words,
        estimatedSeconds: Math.ceil((words / 110) * 60),
      });
    });
    return scenes;
  }

  // With [SCENE] markers
  // parts[0] = text before first marker (ignore if empty)
  // then triplets: [sceneNum, sceneTitle|undefined, content]
  let idx = 1;
  while (idx < parts.length) {
    const num = parseInt(parts[idx] || String(scenes.length + 1));
    const titlePart = parts[idx + 1]?.trim() || '';
    const content = (parts[idx + 2] || '').trim();
    idx += 3;

    if (!content) continue;

    const words = countWords(content);
    scenes.push({
      id: num,
      title: titlePart ? `Scene ${num}: ${titlePart}` : `Scene ${num}`,
      text: content,
      wordCount: words,
      estimatedSeconds: Math.ceil((words / 110) * 60),
    });
  }

  return scenes;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function estimateDuration(scenes: Scene[], wpm: number): number {
  const totalWords = scenes.reduce((a, s) => a + s.wordCount, 0);
  return Math.ceil((totalWords / wpm) * 60);
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
