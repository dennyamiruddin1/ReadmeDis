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
  onRefreshVoices: () => void;
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
  onRefreshVoices,
  rate,
  onRateChange,
  pitch,
  onPitchChange,
}: PlayerControlsProps) {
  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-brand-blue bg-white p-4 shadow-sm dark:bg-[#123241]">
      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-blue/25">
        <div
          className="h-full rounded-full bg-brand-yellow transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onPrevChapter}
          disabled={!hasPrevChapter}
          className="rounded-full p-2 text-gray-600 hover:bg-brand-blue/15 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-brand-blue/20"
          aria-label="Previous chapter"
        >
          ⏮
        </button>
        <button
          onClick={onPlayPause}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-yellow text-xl text-gray-900 shadow-md ring-4 ring-brand-blue/40 hover:brightness-95"
          aria-label={playbackState === "playing" ? "Pause" : "Play"}
        >
          {playbackState === "playing" ? "⏸" : "▶"}
        </button>
        <button
          onClick={onStop}
          className="rounded-full p-2 text-gray-600 hover:bg-brand-blue/15 dark:text-gray-300 dark:hover:bg-brand-blue/20"
          aria-label="Stop"
        >
          ⏹
        </button>
        <button
          onClick={onNextChapter}
          disabled={!hasNextChapter}
          className="rounded-full p-2 text-gray-600 hover:bg-brand-blue/15 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-brand-blue/20"
          aria-label="Next chapter"
        >
          ⏭
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
          🎙️ Voice
          <div className="flex items-center gap-1.5">
            <select
              value={selectedVoiceURI}
              onChange={(e) => onVoiceChange(e.target.value)}
              className="w-full min-w-0 rounded-full border-2 border-brand-blue bg-white px-3 py-1.5 text-sm text-gray-800 dark:bg-[#0f2733] dark:text-gray-100"
            >
              {voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onRefreshVoices}
              title="Re-scan for newly installed voices"
              aria-label="Refresh voice list"
              className="shrink-0 rounded-full border-2 border-brand-blue p-1.5 text-gray-700 hover:bg-brand-blue/15 dark:text-gray-200"
            >
              🔄
            </button>
          </div>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
          💨 Speed: {rate.toFixed(2)}x
          <input
            type="range"
            className="accent-brand-blue"
            min={0.5}
            max={2}
            step={0.05}
            value={rate}
            onChange={(e) => onRateChange(Number(e.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
          🎈 Pitch: {pitch.toFixed(2)}
          <input
            type="range"
            className="accent-brand-blue"
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
