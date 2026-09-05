"use client";

import type { PlaybackState } from "@/lib/tts/speechEngine";

interface PlayerControlsProps {
  playbackState: PlaybackState;
  onPlayPause: () => void;
  onStop: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
  progress: { current: number; total: number };
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  onVoiceChange: (uri: string) => void;
  rate: number;
  onRateChange: (rate: number) => void;
  pitch: number;
  onPitchChange: (pitch: number) => void;
}

export function PlayerControls({
  playbackState,
  onPlayPause,
  onStop,
  onPrevChapter,
  onNextChapter,
  hasPrevChapter,
  hasNextChapter,
  progress,
  voices,
  selectedVoiceURI,
  onVoiceChange,
  rate,
  onRateChange,
  pitch,
  onPitchChange,
}: PlayerControlsProps) {
  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-indigo-600 transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onPrevChapter}
          disabled={!hasPrevChapter}
          className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Previous chapter"
        >
          ⏮
        </button>
        <button
          onClick={onPlayPause}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-xl text-white hover:bg-indigo-700"
          aria-label={playbackState === "playing" ? "Pause" : "Play"}
        >
          {playbackState === "playing" ? "⏸" : "▶"}
        </button>
        <button
          onClick={onStop}
          className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Stop"
        >
          ⏹
        </button>
        <button
          onClick={onNextChapter}
          disabled={!hasNextChapter}
          className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Next chapter"
        >
          ⏭
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          Voice
          <select
            value={selectedVoiceURI}
            onChange={(e) => onVoiceChange(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          Speed: {rate.toFixed(2)}x
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={rate}
            onChange={(e) => onRateChange(Number(e.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          Pitch: {pitch.toFixed(2)}
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={pitch}
            onChange={(e) => onPitchChange(Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
