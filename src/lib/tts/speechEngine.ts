export type PlaybackState = "idle" | "playing" | "paused";

export interface SpeechEngineCallbacks {
  onChunkChange?: (index: number, total: number) => void;
  onStateChange?: (state: PlaybackState) => void;
  onChapterEnd?: () => void;
  onError?: (message: string) => void;
}

const MAX_CHUNK_LENGTH = 220;

/** Splits text into short, sentence-aware chunks so pause/resume/skip stay responsive and reliable. */
export function chunkText(text: string): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?]+(\s+|$)|[^.!?\n]+$/g) ?? [text];
  const chunks: string[] = [];
  let buffer = "";
  for (const sentence of sentences) {
    if (buffer.length > 0 && buffer.length + sentence.length > MAX_CHUNK_LENGTH) {
      chunks.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer += sentence;
    }
  }
  if (buffer.trim().length > 0) chunks.push(buffer.trim());
  return chunks.filter((c) => c.length > 0);
}

export class SpeechEngine {
  private chunks: string[] = [];
  private currentIndex = 0;
  private state: PlaybackState = "idle";
  private voice: SpeechSynthesisVoice | null = null;
  private rate = 1;
  private pitch = 1;
  private callbacks: SpeechEngineCallbacks;

  constructor(callbacks: SpeechEngineCallbacks = {}) {
    this.callbacks = callbacks;
  }

  static isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  static getVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      const existing = synth.getVoices();
      if (existing.length > 0) {
        resolve(existing);
        return;
      }
      synth.onvoiceschanged = () => resolve(synth.getVoices());
    });
  }

  loadText(text: string): void {
    window.speechSynthesis.cancel();
    this.chunks = chunkText(text);
    this.currentIndex = 0;
    this.state = "idle";
  }

  setVoice(voice: SpeechSynthesisVoice | null): void {
    this.voice = voice;
  }

  setRate(rate: number): void {
    this.rate = rate;
  }

  setPitch(pitch: number): void {
    this.pitch = pitch;
  }

  play(): void {
    if (this.chunks.length === 0 || this.currentIndex >= this.chunks.length) return;
    this.state = "playing";
    this.callbacks.onStateChange?.(this.state);
    this.speakCurrentChunk();
  }

  private speakCurrentChunk(): void {
    if (this.currentIndex >= this.chunks.length) {
      this.state = "idle";
      this.callbacks.onStateChange?.(this.state);
      this.callbacks.onChapterEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(this.chunks[this.currentIndex]);
    if (this.voice) utterance.voice = this.voice;
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    utterance.onend = () => {
      if (this.state !== "playing") return; // stopped or paused elsewhere; don't auto-advance
      this.currentIndex += 1;
      this.callbacks.onChunkChange?.(this.currentIndex, this.chunks.length);
      this.speakCurrentChunk();
    };
    utterance.onerror = (event) => {
      if (event.error === "interrupted" || event.error === "canceled") return;
      this.callbacks.onError?.(event.error);
    };

    this.callbacks.onChunkChange?.(this.currentIndex, this.chunks.length);
    window.speechSynthesis.speak(utterance);
  }

  pause(): void {
    if (this.state !== "playing") return;
    window.speechSynthesis.pause();
    this.state = "paused";
    this.callbacks.onStateChange?.(this.state);
  }

  resume(): void {
    if (this.state !== "paused") return;
    window.speechSynthesis.resume();
    this.state = "playing";
    this.callbacks.onStateChange?.(this.state);
  }

  stop(): void {
    window.speechSynthesis.cancel();
    this.state = "idle";
    this.currentIndex = 0;
    this.callbacks.onStateChange?.(this.state);
  }

  /** Jumps to a chunk index and continues playing from there. */
  skipToChunk(index: number): void {
    window.speechSynthesis.cancel();
    this.currentIndex = Math.max(0, Math.min(index, this.chunks.length - 1));
    this.state = "playing";
    this.callbacks.onStateChange?.(this.state);
    this.speakCurrentChunk();
  }

  getState(): PlaybackState {
    return this.state;
  }

  getProgress(): { current: number; total: number } {
    return { current: this.currentIndex, total: this.chunks.length };
  }

  getChunks(): string[] {
    return this.chunks;
  }
}
