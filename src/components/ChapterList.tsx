"use client";

import type { BookChapter } from "@/lib/parsers/types";

interface ChapterListProps {
  chapters: BookChapter[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function ChapterList({ chapters, currentIndex, onSelect }: ChapterListProps) {
  return (
    <nav className="flex h-full flex-col overflow-y-auto rounded-2xl border-2 border-brand-blue bg-white shadow-sm dark:bg-[#123241]">
      <h2 className="sticky top-0 border-b-2 border-brand-blue bg-brand-blue px-4 py-3 text-sm font-semibold text-gray-900">
        🎈 Chapters
      </h2>
      <ul className="flex-1">
        {chapters.map((chapter, index) => (
          <li key={chapter.id}>
            <button
              onClick={() => onSelect(index)}
              className={`w-full truncate px-4 py-2.5 text-left text-sm transition-colors ${
                index === currentIndex
                  ? "bg-brand-yellow font-medium text-gray-900"
                  : "text-gray-700 hover:bg-brand-blue/15 dark:text-gray-200 dark:hover:bg-brand-blue/20"
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
