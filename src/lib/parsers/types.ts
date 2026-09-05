export interface BookChapter {
  id: string;
  title: string;
  text: string;
}

export interface ParsedBook {
  title: string;
  author?: string;
  coverUrl?: string;
  chapters: BookChapter[];
}

export interface BookParser {
  /** Human-readable name, e.g. "EPUB" */
  name: string;
  /** Lowercase file extensions without the dot, e.g. ["epub"] */
  extensions: string[];
  /** MIME types this parser accepts, e.g. ["application/epub+zip"] */
  mimeTypes: string[];
  parse(file: File): Promise<ParsedBook>;
}
