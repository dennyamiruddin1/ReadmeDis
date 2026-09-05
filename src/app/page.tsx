"use client";

import { useEffect, useRef, useState } from "react";
import { ChapterList } from "@/components/ChapterList";
import { ChapterReader } from "@/components/ChapterReader";
import { FileDropzone } from "@/components/FileDropzone";
import { PlayerControls } from "@/components/PlayerControls";
import { getParserForFile, getSupportedExtensions } from "@/lib/parsers/registry";
import type { ParsedBook } from "@/lib/parsers/types";
import { DEFAULT_VOICE_ID, SpeechEngine, type PlaybackState } from "@/lib/tts/speechEngine";

export default function Home() {
  const [isSupported, setIsSupported] = useState(true);
  const [book, setBook] = useState<ParsedBook | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [chunks, setChunks] = useState<string[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [selectedVoiceId, setSelectedVoiceId] = useState(DEFAULT_VOICE_ID);
  const [rate, setRate] = useState(1);
  const [modelProgress, setModelProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<SpeechEngine | null>(null);
  const bookRef = useRef<ParsedBook | null>(null);
  const chapterIndexRef = useRef(0);
  const selectChapterRef = useRef<(index: number, autoPlay: boolean) => void>(() => {});

  useEffect(() => {
    bookRef.current = book;
  }, [book]);

  useEffect(() => {
    chapterIndexRef.current = chapterIndex;
  }, [chapterIndex]);

  const loadChapter = (targetBook: ParsedBook, index: number, autoPlay: boolean) => {
    const engine = engineRef.current;
    const chapter = targetBook.chapters[index];
    if (!engine || !chapter) return;
    engine.loadText(chapter.text);
    setChapterIndex(index);
    setChunks(engine.getChunks());
    setProgress({ current: 0, total: engine.getChunks().length });
    if (autoPlay) engine.play();
  };

  const selectChapter = (index: number, autoPlay: boolean) => {
    if (bookRef.current) loadChapter(bookRef.current, index, autoPlay);
  };

  useEffect(() => {
    selectChapterRef.current = selectChapter;
  });

  useEffect(() => {
    if (!SpeechEngine.isSupported()) {
      // One-time browser capability check, not state derived from props/state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSupported(false);
      return;
    }

    const engine = new SpeechEngine({
      onChunkChange: (current, total) => setProgress({ current, total }),
      onStateChange: (state) => setPlaybackState(state),
      onModelProgress: (ratio) => setModelProgress(ratio),
      onChapterEnd: () => {
        const currentBook = bookRef.current;
        const idx = chapterIndexRef.current;
        if (currentBook && idx + 1 < currentBook.chapters.length) {
          selectChapterRef.current(idx + 1, true);
        }
      },
      onError: (message) => setError(`Speech playback error: ${message}`),
    });
    engine.setVoice(selectedVoiceId);
    engine.setRate(rate);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // Engine is created once; voice/rate are synced by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setVoice(selectedVoiceId);
  }, [selectedVoiceId]);

  useEffect(() => {
    engineRef.current?.setRate(rate);
  }, [rate]);

  const handleFileSelected = async (file: File) => {
    setError(null);
    setIsParsing(true);
    engineRef.current?.stop();
    setBook(null);
    try {
      const parser = getParserForFile(file);
      const parsedBook = await parser.parse(file);
      setBook(parsedBook);
      loadChapter(parsedBook, 0, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse this file.");
    } finally {
      setIsParsing(false);
    }
  };

  const handlePlayPause = () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (playbackState === "playing" || playbackState === "buffering") engine.pause();
    else if (playbackState === "paused") engine.resume();
    else engine.play();
  };

  const handleStop = () => {
    engineRef.current?.stop();
    setProgress((p) => ({ current: 0, total: p.total }));
  };

  const handlePrevChapter = () => {
    if (chapterIndex > 0) selectChapter(chapterIndex - 1, playbackState === "playing");
  };

  const handleNextChapter = () => {
    if (book && chapterIndex + 1 < book.chapters.length) {
      selectChapter(chapterIndex + 1, playbackState === "playing");
    }
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-brand-blue/30 blur-3xl" />
        <div className="absolute -right-10 top-24 h-56 w-56 rounded-full bg-brand-yellow/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-brand-blue/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-brand-yellow/25 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
        <header>
          <h1 className="text-3xl font-bold text-foreground">🫧 ReadmeDis</h1>
          <div className="mt-1.5 mb-1 flex h-1.5 w-28 overflow-hidden rounded-full">
            <span className="w-1/2 bg-brand-blue" />
            <span className="w-1/2 bg-brand-yellow" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            I hope you make use out of this application Adis. Love you so much.
          </p>
        </header>

        {!isSupported && (
          <p className="rounded-2xl border-2 border-brand-yellow bg-brand-yellow/25 p-4 text-sm text-gray-900 dark:text-gray-50">
            Your browser can&apos;t run the Kokoro voice model (WebAssembly is unavailable). Try the
            latest Chrome, Edge, or Firefox.
          </p>
        )}

        {error && (
          <p className="rounded-2xl border-2 border-brand-yellow bg-brand-yellow/25 p-4 text-sm text-gray-900 dark:text-gray-50">
            {error}
          </p>
        )}

        {!book ? (
          <FileDropzone
            extensions={getSupportedExtensions()}
            onFileSelected={handleFileSelected}
            disabled={!isSupported || isParsing}
          />
        ) : (
          <div className="flex flex-1 flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {book.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.coverUrl}
                    alt=""
                    className="h-16 w-11 rounded-lg object-cover shadow"
                  />
                )}
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-50">{book.title}</h2>
                  {book.author && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{book.author}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  engineRef.current?.stop();
                  setBook(null);
                  setChunks([]);
                }}
                className="rounded-full border-2 border-brand-blue px-3 py-1 text-sm text-gray-700 hover:bg-brand-blue/15 dark:text-gray-200"
              >
                🔄 Load a different book
              </button>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[220px_1fr] md:[&>*]:h-[55vh]">
              <ChapterList
                chapters={book.chapters}
                currentIndex={chapterIndex}
                onSelect={(index) => selectChapter(index, true)}
              />
              <ChapterReader
                title={book.chapters[chapterIndex].title}
                chunks={chunks}
                currentChunkIndex={progress.current}
              />
            </div>

            <PlayerControls
              playbackState={playbackState}
              onPlayPause={handlePlayPause}
              onStop={handleStop}
              onPrevChapter={handlePrevChapter}
              onNextChapter={handleNextChapter}
              hasPrevChapter={chapterIndex > 0}
              hasNextChapter={chapterIndex + 1 < book.chapters.length}
              progress={progress}
              selectedVoiceId={selectedVoiceId}
              onVoiceChange={setSelectedVoiceId}
              rate={rate}
              onRateChange={setRate}
              modelProgress={modelProgress}
            />
          </div>
        )}
      </div>
    </div>
  );
}
