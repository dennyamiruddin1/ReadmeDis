import type { BookParser } from "./types";
import { epubParser } from "./epubParser";

/**
 * All supported book formats are registered here. To support a new format later
 * (PDF, TXT, MOBI, ...), implement a `BookParser` and add it to this list --
 * nothing else in the app needs to change.
 */
const parsers: BookParser[] = [epubParser];

export function getSupportedExtensions(): string[] {
  return parsers.flatMap((p) => p.extensions);
}

export function getParserForFile(file: File): BookParser {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const parser = parsers.find(
    (p) => p.extensions.includes(extension) || p.mimeTypes.includes(file.type)
  );
  if (!parser) {
    throw new Error(
      `Unsupported file type ".${extension}". Supported formats: ${getSupportedExtensions()
        .map((e) => `.${e}`)
        .join(", ")}`
    );
  }
  return parser;
}
