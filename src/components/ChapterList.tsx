"use client";

import type { BookChapter } from "@/lib/parsers/types";

interface ChapterListProps {
  chapters: BookChapter[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function ChapterList({ chapters, currentIndex, onSelect }: ChapterListProps) {
  return (
    <nav className="flex h-full flex-col overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <h2 className="sticky top-0 border-b border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        Chapters
      </h2>
      <ul className="flex-1">
        {chapters.map((chapter, index) => (
          <li key={chapter.id}>
            <button
              onClick={() => onSelect(index)}
              className={`w-full truncate px-4 py-2.5 text-left text-sm transition-colors ${
                index === currentIndex
                  ? "bg-indigo-600 font-medium text-white"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
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
