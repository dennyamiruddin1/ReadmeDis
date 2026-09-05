"use client";

import type { BookChapter } from "@/lib/parsers/types";

interface ChapterSelectProps {
  chapters: BookChapter[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

/** Compact chapter picker for narrow screens, where the sidebar list doesn't fit. */
export function ChapterSelect({ chapters, currentIndex, onSelect }: ChapterSelectProps) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
      🎈 Chapter
      <select
        value={currentIndex}
        onChange={(e) => onSelect(Number(e.target.value))}
        className="w-full min-w-0 rounded-full border-2 border-brand-blue bg-white px-3 py-2 text-sm text-gray-800 dark:bg-[#0f2733] dark:text-gray-100"
      >
        {chapters.map((chapter, index) => (
          <option key={chapter.id} value={index}>
            {chapter.title}
          </option>
        ))}
      </select>
    </label>
  );
}
