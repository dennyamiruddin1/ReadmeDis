import type { GenerateOptions, KokoroTTS } from "kokoro-js";

type VoiceId = NonNullable<GenerateOptions["voice"]>;

export type PlaybackState = "idle" | "loading" | "buffering" | "playing" | "paused";

export interface SpeechEngineCallbacks {
  onChunkChange?: (index: number, total: number) => void;
  onStateChange?: (state: PlaybackState) => void;
  onChapterEnd?: () => void;
  onError?: (message: string) => void;
  /** Fired while the Kokoro model files download on first use. `ratio` is 0..1. */
  onModelProgress?: (ratio: number) => void;
  /**
   * Rough estimate, in whole seconds, of the wait before audio starts playing
   * from the current position (model download, if still needed, plus synthesis
   * of the first chunk). `0` means the audio is already buffered.
   */
  onEstimateChange?: (seconds: number) => void;
}

/** Hugging Face repo for the ONNX build that kokoro-js loads. */
const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

const MAX_CHUNK_LENGTH = 220;

/** Fallback guess for the one-time model download+init, refined once we've timed a real load. */
const MODEL_LOAD_ESTIMATE_MS = { wasm: 15000, webgpu: 30000 };
/** Fallback ms-per-character synthesis rate, refined from measured runs and persisted. */
const MS_PER_CHAR_DEFAULT = { wasm: 55, webgpu: 14 };
const RATE_STORAGE_KEY = "readmedis:kokoro:ms-per-char";

export interface KokoroVoice {
  id: string;
  name: string;
  accent: "American English" | "British English";
  gender: "Female" | "Male";
}

/** The voices bundled with Kokoro-82M v1.0. `af_heart` is the default reference voice. */
export const KOKORO_VOICES: KokoroVoice[] = [
  { id: "af_heart", name: "Heart", accent: "American English", gender: "Female" },
  { id: "af_bella", name: "Bella", accent: "American English", gender: "Female" },
  { id: "af_nicole", name: "Nicole", accent: "American English", gender: "Female" },
  { id: "af_aoede", name: "Aoede", accent: "American English", gender: "Female" },
  { id: "af_kore", name: "Kore", accent: "American English", gender: "Female" },
  { id: "af_sarah", name: "Sarah", accent: "American English", gender: "Female" },
  { id: "af_nova", name: "Nova", accent: "American English", gender: "Female" },
  { id: "af_sky", name: "Sky", accent: "American English", gender: "Female" },
  { id: "af_alloy", name: "Alloy", accent: "American English", gender: "Female" },
  { id: "af_jessica", name: "Jessica", accent: "American English", gender: "Female" },
  { id: "af_river", name: "River", accent: "American English", gender: "Female" },
  { id: "am_fenrir", name: "Fenrir", accent: "American English", gender: "Male" },
  { id: "am_michael", name: "Michael", accent: "American English", gender: "Male" },
  { id: "am_puck", name: "Puck", accent: "American English", gender: "Male" },
  { id: "am_adam", name: "Adam", accent: "American English", gender: "Male" },
  { id: "am_echo", name: "Echo", accent: "American English", gender: "Male" },
  { id: "am_eric", name: "Eric", accent: "American English", gender: "Male" },
  { id: "am_liam", name: "Liam", accent: "American English", gender: "Male" },
  { id: "am_onyx", name: "Onyx", accent: "American English", gender: "Male" },
  { id: "am_santa", name: "Santa", accent: "American English", gender: "Male" },
  { id: "bf_emma", name: "Emma", accent: "British English", gender: "Female" },
  { id: "bf_isabella", name: "Isabella", accent: "British English", gender: "Female" },
  { id: "bf_alice", name: "Alice", accent: "British English", gender: "Female" },
  { id: "bf_lily", name: "Lily", accent: "British English", gender: "Female" },
  { id: "bm_george", name: "George", accent: "British English", gender: "Male" },
  { id: "bm_fable", name: "Fable", accent: "British English", gender: "Male" },
  { id: "bm_lewis", name: "Lewis", accent: "British English", gender: "Male" },
  { id: "bm_daniel", name: "Daniel", accent: "British English", gender: "Male" },
];

export const DEFAULT_VOICE_ID = "af_heart";

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

interface KokoroProgressEvent {
  status?: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

/**
 * Text-to-speech engine backed by Kokoro-JS. Unlike the Web Speech API, Kokoro
 * synthesises an audio buffer per chunk locally (WASM, or WebGPU where available);
 * this class plays those buffers back through a single `<audio>` element and
 * prefetches the next chunk so playback stays gapless.
 */
export class SpeechEngine {
  private chunks: string[] = [];
  private currentIndex = 0;
  private state: PlaybackState = "idle";
  private voice = DEFAULT_VOICE_ID;
  private speed = 1;
  private callbacks: SpeechEngineCallbacks;

  private tts: KokoroTTS | null = null;
  private loadPromise: Promise<KokoroTTS> | null = null;
  private audio: HTMLAudioElement | null = null;
  /** chunk index -> object URL for the generated wav */
  private cache = new Map<number, string>();
  private inflight = new Map<number, Promise<string | null>>();
  /** Bumped on stop/skip/reload so stale async work resolves into a no-op. */
  private playToken = 0;

  private device: "wasm" | "webgpu" = "wasm";
  private modelLoadMs = MODEL_LOAD_ESTIMATE_MS.wasm;
  private lastModelProgress = 0;
  private msPerChar = MS_PER_CHAR_DEFAULT.wasm;
  private rateSamples = 0;

  constructor(callbacks: SpeechEngineCallbacks = {}) {
    this.callbacks = callbacks;
    try {
      const saved = Number(localStorage.getItem(RATE_STORAGE_KEY));
      if (Number.isFinite(saved) && saved > 0) {
        this.msPerChar = saved;
        this.rateSamples = 3; // treat a persisted rate as established but still adjustable
      }
    } catch {
      // localStorage unavailable (private mode, SSR) -- fall back to the default rate.
    }
  }

  static isSupported(): boolean {
    return typeof window !== "undefined" && typeof WebAssembly !== "undefined";
  }

  private setState(state: PlaybackState): void {
    if (this.state === state) return;
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  private async ensureModel(): Promise<KokoroTTS> {
    if (this.tts) return this.tts;
    if (!this.loadPromise) {
      if (this.state === "idle") this.setState("loading");
      const useWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;
      this.device = useWebGPU ? "webgpu" : "wasm";
      this.modelLoadMs = MODEL_LOAD_ESTIMATE_MS[this.device];
      if (this.rateSamples === 0) this.msPerChar = MS_PER_CHAR_DEFAULT[this.device];
      this.lastModelProgress = 0;
      this.emitEstimate();
      const startedAt = Date.now();
      this.loadPromise = (async () => {
        const { KokoroTTS } = await import("kokoro-js");
        const tts = await KokoroTTS.from_pretrained(MODEL_ID, {
          dtype: useWebGPU ? "fp32" : "q8",
          device: useWebGPU ? "webgpu" : "wasm",
          progress_callback: (event: KokoroProgressEvent) => {
            if (typeof event.progress === "number") {
              this.lastModelProgress = Math.min(1, Math.max(0, event.progress / 100));
              this.callbacks.onModelProgress?.(this.lastModelProgress);
              this.emitEstimate();
            }
          },
        });
        this.tts = tts;
        this.modelLoadMs = Date.now() - startedAt;
        this.lastModelProgress = 1;
        this.callbacks.onModelProgress?.(1);
        this.emitEstimate();
        return tts;
      })();
      this.loadPromise.catch(() => {
        // Allow a later play() to retry a failed download.
        this.loadPromise = null;
      });
    }
    return this.loadPromise;
  }

  loadText(text: string): void {
    this.stopInternal();
    this.chunks = chunkText(text);
    this.currentIndex = 0;
    this.clearCache();
    this.setState("idle");
    this.emitEstimate();
  }

  /** Seconds until audio can start from `index`: remaining model load + first-chunk synthesis. */
  estimateSecondsToAudio(index: number = this.currentIndex): number {
    if (index < 0 || index >= this.chunks.length || this.cache.has(index)) return 0;
    let ms = 0;
    if (!this.tts) {
      const remaining = this.loadPromise ? 1 - this.lastModelProgress : 1;
      ms += this.modelLoadMs * Math.max(0, Math.min(1, remaining));
    }
    ms += this.chunks[index].length * this.msPerChar;
    return Math.max(1, Math.round(ms / 1000));
  }

  private emitEstimate(): void {
    this.callbacks.onEstimateChange?.(this.estimateSecondsToAudio());
  }

  /** Folds a measured synthesis run into the rolling ms-per-character rate and persists it. */
  private recordSynthesisRate(chars: number, elapsedMs: number): void {
    if (chars <= 0 || elapsedMs <= 0) return;
    const perChar = elapsedMs / chars;
    this.rateSamples = Math.min(this.rateSamples + 1, 10);
    this.msPerChar += (perChar - this.msPerChar) / this.rateSamples;
    try {
      localStorage.setItem(RATE_STORAGE_KEY, String(Math.round(this.msPerChar)));
    } catch {
      // Non-fatal: estimates just won't carry over to the next session.
    }
  }

  setVoice(voiceId: string | null): void {
    const next = voiceId ?? DEFAULT_VOICE_ID;
    if (next === this.voice) return;
    this.voice = next;
    this.onSynthParamsChanged();
  }

  setRate(rate: number): void {
    // Kokoro speaking speed; kept as `setRate` so the caller's API is unchanged.
    const clamped = Math.min(2, Math.max(0.5, rate));
    if (clamped === this.speed) return;
    this.speed = clamped;
    this.onSynthParamsChanged();
  }

  /** Voice/speed changes invalidate every cached buffer; restart the current chunk if mid-playback. */
  private onSynthParamsChanged(): void {
    const wasPlaying = this.state === "playing" || this.state === "buffering";
    this.clearCache();
    this.emitEstimate();
    if (wasPlaying) void this.playFrom(this.currentIndex);
  }

  private clearCache(): void {
    for (const url of this.cache.values()) URL.revokeObjectURL(url);
    this.cache.clear();
    this.inflight.clear();
  }

  private generateChunk(index: number): Promise<string | null> {
    if (index < 0 || index >= this.chunks.length) return Promise.resolve(null);
    const cached = this.cache.get(index);
    if (cached) return Promise.resolve(cached);
    const pending = this.inflight.get(index);
    if (pending) return pending;

    const job = (async () => {
      const tts = await this.ensureModel();
      const synthStart = Date.now();
      const raw = await tts.generate(this.chunks[index], {
        voice: this.voice as VoiceId,
        speed: this.speed,
      });
      this.recordSynthesisRate(this.chunks[index].length, Date.now() - synthStart);
      const url = URL.createObjectURL(raw.toBlob());
      this.cache.set(index, url);
      this.inflight.delete(index);
      this.emitEstimate();
      return url;
    })();

    this.inflight.set(index, job);
    job.catch(() => this.inflight.delete(index));
    return job;
  }

  play(): void {
    if (this.chunks.length === 0 || this.currentIndex >= this.chunks.length) return;
    if (this.state === "paused" && this.audio) {
      this.resume();
      return;
    }
    void this.playFrom(this.currentIndex);
  }

  private async playFrom(index: number): Promise<void> {
    const token = ++this.playToken;
    this.teardownAudio();

    if (index >= this.chunks.length) {
      this.currentIndex = this.chunks.length;
      this.setState("idle");
      this.callbacks.onChapterEnd?.();
      return;
    }

    this.currentIndex = index;
    this.callbacks.onChunkChange?.(index, this.chunks.length);
    this.setState(this.cache.has(index) ? "playing" : "buffering");
    this.emitEstimate();

    let url: string | null;
    try {
      url = await this.generateChunk(index);
    } catch (err) {
      if (token !== this.playToken) return;
      this.setState("idle");
      this.callbacks.onError?.(
        err instanceof Error ? err.message : "Kokoro failed to synthesise this passage.",
      );
      return;
    }
    if (token !== this.playToken || !url) return;

    const audio = new Audio(url);
    this.audio = audio;
    audio.playbackRate = 1;
    audio.onended = () => {
      if (token !== this.playToken) return;
      void this.playFrom(this.currentIndex + 1);
    };
    audio.onerror = () => {
      if (token !== this.playToken) return;
      this.callbacks.onError?.("Audio playback error.");
    };

    this.setState("playing");
    try {
      await audio.play();
    } catch (err) {
      if (token !== this.playToken) return;
      this.callbacks.onError?.(
        err instanceof Error ? err.message : "The browser blocked audio playback.",
      );
      return;
    }

    // Warm the next chunk so the handoff is seamless.
    void this.generateChunk(index + 1).catch(() => {});
  }

  pause(): void {
    if (this.state !== "playing" && this.state !== "buffering") return;
    this.audio?.pause();
    this.setState("paused");
  }

  resume(): void {
    if (this.state !== "paused") return;
    if (this.audio) {
      void this.audio.play().catch(() => {});
      this.setState("playing");
    } else {
      void this.playFrom(this.currentIndex);
    }
  }

  stop(): void {
    this.stopInternal();
    this.currentIndex = 0;
    this.setState("idle");
    this.callbacks.onChunkChange?.(0, this.chunks.length);
    this.emitEstimate();
  }

  private stopInternal(): void {
    this.playToken++;
    this.teardownAudio();
  }

  private teardownAudio(): void {
    if (!this.audio) return;
    this.audio.onended = null;
    this.audio.onerror = null;
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.audio = null;
  }

  /** Jumps to a chunk index and continues playing from there. */
  skipToChunk(index: number): void {
    const target = Math.max(0, Math.min(index, this.chunks.length - 1));
    this.stopInternal();
    void this.playFrom(target);
  }

  /** Releases audio + object URLs. Call on unmount. */
  dispose(): void {
    this.stopInternal();
    this.clearCache();
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
