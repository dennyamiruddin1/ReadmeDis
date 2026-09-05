"use client";

import { useEffect, useRef, useState } from "react";
import { ChapterList } from "@/components/ChapterList";
import { ChapterReader } from "@/components/ChapterReader";
import { FileDropzone } from "@/components/FileDropzone";
import { PlayerControls } from "@/components/PlayerControls";
import { getParserForFile, getSupportedExtensions } from "@/lib/parsers/registry";
import type { ParsedBook } from "@/lib/parsers/types";
import { SpeechEngine, type PlaybackState } from "@/lib/tts/speechEngine";

export default function Home() {
  const [isSupported, setIsSupported] = useState(true);
  const [book, setBook] = useState<ParsedBook | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [chunks, setChunks] = useState<string[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
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
      onChapterEnd: () => {
        const currentBook = bookRef.current;
        const idx = chapterIndexRef.current;
        if (currentBook && idx + 1 < currentBook.chapters.length) {
          selectChapterRef.current(idx + 1, true);
        }
      },
      onError: (message) => setError(`Speech playback error: ${message}`),
    });
    engineRef.current = engine;

    SpeechEngine.getVoices().then((loadedVoices) => {
      setVoices(loadedVoices);
      const defaultVoice = loadedVoices.find((v) => v.lang.startsWith("en")) ?? loadedVoices[0];
      if (defaultVoice) setSelectedVoiceURI(defaultVoice.voiceURI);
    });

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    const voice = voices.find((v) => v.voiceURI === selectedVoiceURI) ?? null;
    engineRef.current?.setVoice(voice);
  }, [voices, selectedVoiceURI]);

  useEffect(() => {
    engineRef.current?.setRate(rate);
  }, [rate]);

  useEffect(() => {
    engineRef.current?.setPitch(pitch);
  }, [pitch]);

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
    if (playbackState === "playing") engine.pause();
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
        <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-sky-300/40 blur-3xl" />
        <div className="absolute -right-10 top-24 h-56 w-56 rounded-full bg-pink-300/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-yellow-200/30 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-sky-300/30 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
        <header>
          <h1 className="bg-gradient-to-r from-sky-500 to-pink-400 bg-clip-text text-3xl font-bold text-transparent">
            🫧 ReadmeDis
          </h1>
          <p className="text-sm text-sky-600 dark:text-sky-300">
            Turn your ebooks into audiobooks, right in your browser.
          </p>
        </header>

        {!isSupported && (
          <p className="rounded-2xl border-2 border-pink-200 bg-pink-50 p-4 text-sm text-pink-700 dark:border-pink-900 dark:bg-pink-950/40 dark:text-pink-300">
            Your browser doesn&apos;t support speech synthesis. Try the latest Chrome, Edge, or Firefox.
          </p>
        )}

        {error && (
          <p className="rounded-2xl border-2 border-pink-200 bg-pink-50 p-4 text-sm text-pink-700 dark:border-pink-900 dark:bg-pink-950/40 dark:text-pink-300">
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
                  <h2 className="font-semibold text-sky-900 dark:text-sky-50">{book.title}</h2>
                  {book.author && (
                    <p className="text-sm text-sky-500 dark:text-sky-400">{book.author}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  engineRef.current?.stop();
                  setBook(null);
                  setChunks([]);
                }}
                className="text-sm text-sky-600 hover:underline dark:text-sky-400"
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
              voices={voices}
              selectedVoiceURI={selectedVoiceURI}
              onVoiceChange={setSelectedVoiceURI}
              rate={rate}
              onRateChange={setRate}
              pitch={pitch}
              onPitchChange={setPitch}
            />
          </div>
        )}
      </div>
    </div>
  );
}
