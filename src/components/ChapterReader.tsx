"use client";

import { useEffect, useRef } from "react";

interface ChapterReaderProps {
  title: string;
  chunks: string[];
  currentChunkIndex: number;
}

export function ChapterReader({ title, chunks, currentChunkIndex }: ChapterReaderProps) {
  const activeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentChunkIndex]);

  return (
    <article className="h-full overflow-y-auto rounded-2xl border-2 border-brand-blue bg-white p-6 leading-8 shadow-sm dark:bg-[#123241]">
      <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-50">📖 {title}</h1>
      <p className="text-gray-700 dark:text-gray-300">
        {chunks.map((chunk, index) => (
          <span
            key={index}
            ref={index === currentChunkIndex ? activeRef : undefined}
            className={
              index === currentChunkIndex
                ? "rounded-full bg-brand-yellow px-0.5 text-gray-900"
                : undefined
            }
          >
            {chunk}{" "}
          </span>
        ))}
      </p>
    </article>
  );
}
