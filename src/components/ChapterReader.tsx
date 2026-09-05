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
    <article className="h-full overflow-y-auto rounded-2xl border-2 border-sky-200 bg-white/70 p-6 leading-8 shadow-sm dark:border-sky-800 dark:bg-slate-900/50">
      <h1 className="mb-4 text-xl font-semibold text-sky-900 dark:text-sky-50">📖 {title}</h1>
      <p className="text-sky-700 dark:text-sky-300">
        {chunks.map((chunk, index) => (
          <span
            key={index}
            ref={index === currentChunkIndex ? activeRef : undefined}
            className={
              index === currentChunkIndex
                ? "rounded-full bg-pink-200 px-0.5 dark:bg-pink-900/60"
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
