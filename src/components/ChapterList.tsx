"use client";

import type { BookChapter } from "@/lib/parsers/types";

interface ChapterListProps {
  chapters: BookChapter[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function ChapterList({ chapters, currentIndex, onSelect }: ChapterListProps) {
  return (
    <nav className="flex h-full flex-col overflow-y-auto rounded-2xl border-2 border-sky-200 bg-white/70 shadow-sm dark:border-sky-800 dark:bg-slate-900/50">
      <h2 className="sticky top-0 border-b-2 border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-sky-500 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-400">
        🎈 Chapters
      </h2>
      <ul className="flex-1">
        {chapters.map((chapter, index) => (
          <li key={chapter.id}>
            <button
              onClick={() => onSelect(index)}
              className={`w-full truncate px-4 py-2.5 text-left text-sm transition-colors ${
                index === currentIndex
                  ? "bg-gradient-to-r from-sky-400 to-pink-300 font-medium text-white"
                  : "text-sky-700 hover:bg-sky-100 dark:text-sky-300 dark:hover:bg-sky-900"
              }`}
              title={chapter.title}
            >
              {chapter.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
