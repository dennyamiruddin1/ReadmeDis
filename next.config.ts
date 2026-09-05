import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cross-origin isolation. Required for SharedArrayBuffer, which onnxruntime-web
  // needs to run the Kokoro model on multiple CPU threads (a large speed-up,
  // especially on iOS Safari where there is no usable WebGPU path). Safe here
  // because every cross-origin fetch the app makes (Hugging Face model files) is
  // CORS-enabled, and the WASM runtime is served same-origin from /public/ort.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
