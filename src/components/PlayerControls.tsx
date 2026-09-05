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
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-sky-200 bg-white/70 p-4 shadow-sm dark:border-sky-800 dark:bg-slate-900/50">
      <div className="h-2 w-full overflow-hidden rounded-full bg-sky-200 dark:bg-sky-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-pink-400 transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onPrevChapter}
          disabled={!hasPrevChapter}
          className="rounded-full p-2 text-sky-600 hover:bg-sky-100 disabled:opacity-30 dark:text-sky-300 dark:hover:bg-sky-800"
          aria-label="Previous chapter"
        >
          ⏮
        </button>
        <button
          onClick={onPlayPause}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-pink-400 text-xl text-white shadow-md hover:from-sky-500 hover:to-pink-500"
          aria-label={playbackState === "playing" ? "Pause" : "Play"}
        >
          {playbackState === "playing" ? "⏸" : "▶"}
        </button>
        <button
          onClick={onStop}
          className="rounded-full p-2 text-sky-600 hover:bg-sky-100 dark:text-sky-300 dark:hover:bg-sky-800"
          aria-label="Stop"
        >
          ⏹
        </button>
        <button
          onClick={onNextChapter}
          disabled={!hasNextChapter}
          className="rounded-full p-2 text-sky-600 hover:bg-sky-100 disabled:opacity-30 dark:text-sky-300 dark:hover:bg-sky-800"
          aria-label="Next chapter"
        >
          ⏭
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-sky-500 dark:text-sky-400">
          🎙️ Voice
          <select
            value={selectedVoiceURI}
            onChange={(e) => onVoiceChange(e.target.value)}
            className="rounded-full border-2 border-sky-300 bg-white px-3 py-1.5 text-sm text-sky-800 dark:border-sky-700 dark:bg-sky-900 dark:text-sky-100"
          >
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-sky-500 dark:text-sky-400">
          💨 Speed: {rate.toFixed(2)}x
          <input
            type="range"
            className="accent-pink-400"
            min={0.5}
            max={2}
            step={0.05}
            value={rate}
            onChange={(e) => onRateChange(Number(e.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-sky-500 dark:text-sky-400">
          🎈 Pitch: {pitch.toFixed(2)}
          <input
            type="range"
            className="accent-pink-400"
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
