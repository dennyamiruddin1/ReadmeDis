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
    <article className="h-full overflow-y-auto rounded-xl border border-zinc-200 p-6 leading-8 dark:border-zinc-800">
      <h1 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{title}</h1>
      <p className="text-zinc-700 dark:text-zinc-300">
        {chunks.map((chunk, index) => (
          <span
            key={index}
            ref={index === currentChunkIndex ? activeRef : undefined}
            className={
              index === currentChunkIndex
                ? "rounded bg-indigo-200 dark:bg-indigo-900/60"
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
