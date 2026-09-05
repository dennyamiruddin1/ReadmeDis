import JSZip from "jszip";
import type { BookChapter, BookParser, ParsedBook } from "./types";

function byLocalName(root: Document | Element, localName: string): Element[] {
  return Array.from(root.getElementsByTagNameNS("*", localName));
}

function firstByLocalName(root: Document | Element, localName: string): Element | null {
  return byLocalName(root, localName)[0] ?? null;
}

function parseXml(content: string): Document {
  const doc = new DOMParser().parseFromString(content, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    return new DOMParser().parseFromString(content, "text/html");
  }
  return doc;
}

function dirname(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.substring(0, idx);
}

/** Resolves an href from an OPF/XHTML file against the directory it lives in, into a zip-root-relative path. */
function resolvePath(dir: string, href: string): string {
  const decoded = decodeURIComponent(href.split("#")[0]);
  const combined = dir ? `${dir}/${decoded}` : decoded;
  const stack: string[] = [];
  for (const part of combined.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

const BLOCK_TAGS = new Set([
  "P", "DIV", "BR", "LI", "H1", "H2", "H3", "H4", "H5", "H6",
  "SECTION", "ARTICLE", "BLOCKQUOTE", "TR", "TITLE",
]);

function extractText(doc: Document): string {
  const root = doc.body ?? doc.documentElement;
  let text = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return;
    for (const child of Array.from(el.childNodes)) walk(child);
    if (BLOCK_TAGS.has(el.tagName)) text += "\n";
  };
  walk(root);
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function extractChapterTitle(doc: Document, fallback: string): string {
  const heading = doc.querySelector("h1, h2, h3") ?? firstByLocalName(doc, "title");
  const text = heading?.textContent?.trim().replace(/\s+/g, " ");
  return text && text.length > 0 && text.length < 150 ? text : fallback;
}

async function readZipFile(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path);
  if (!file) throw new Error(`EPUB is missing expected file: ${path}`);
  return file.async("string");
}

export const epubParser: BookParser = {
  name: "EPUB",
  extensions: ["epub"],
  mimeTypes: ["application/epub+zip"],

  async parse(file: File): Promise<ParsedBook> {
    const zip = await JSZip.loadAsync(file);

    const containerXml = await readZipFile(zip, "META-INF/container.xml");
    const containerDoc = parseXml(containerXml);
    const rootfile = firstByLocalName(containerDoc, "rootfile");
    const opfPath = rootfile?.getAttribute("full-path");
    if (!opfPath) throw new Error("Could not find the EPUB's content.opf (invalid container.xml).");

    const opfDir = dirname(opfPath);
    const opfXml = await readZipFile(zip, opfPath);
    const opfDoc = parseXml(opfXml);

    const title = firstByLocalName(opfDoc, "title")?.textContent?.trim() || file.name.replace(/\.epub$/i, "");
    const author = firstByLocalName(opfDoc, "creator")?.textContent?.trim() || undefined;

    const manifest = new Map<string, { href: string; mediaType: string; properties: string }>();
    for (const item of byLocalName(opfDoc, "item")) {
      const id = item.getAttribute("id");
      const href = item.getAttribute("href");
      if (!id || !href) continue;
      manifest.set(id, {
        href,
        mediaType: item.getAttribute("media-type") ?? "",
        properties: item.getAttribute("properties") ?? "",
      });
    }

    let coverUrl: string | undefined;
    const coverItem =
      Array.from(manifest.values()).find((m) => m.properties.includes("cover-image")) ??
      (() => {
        const coverMeta = byLocalName(opfDoc, "meta").find((m) => m.getAttribute("name") === "cover");
        const coverId = coverMeta?.getAttribute("content");
        return coverId ? manifest.get(coverId) : undefined;
      })();
    if (coverItem) {
      const coverPath = resolvePath(opfDir, coverItem.href);
      const coverFile = zip.file(coverPath);
      if (coverFile) {
        const base64 = await coverFile.async("base64");
        coverUrl = `data:${coverItem.mediaType};base64,${base64}`;
      }
    }

    const spineIds = byLocalName(opfDoc, "itemref")
      .map((el) => el.getAttribute("idref"))
      .filter((id): id is string => Boolean(id));

    const chapters: BookChapter[] = [];
    let chapterNumber = 0;
    for (const idref of spineIds) {
      const item = manifest.get(idref);
      if (!item) continue;
      if (!/xhtml|html|xml/.test(item.mediaType)) continue;

      const path = resolvePath(opfDir, item.href);
      const zipFile = zip.file(path);
      if (!zipFile) continue;

      const html = await zipFile.async("string");
      const doc = parseXml(html);
      const text = extractText(doc);
      if (text.replace(/\s/g, "").length < 20) continue; // skip cover/blank/nav-only pages

      chapterNumber += 1;
      chapters.push({
        id: idref,
        title: extractChapterTitle(doc, `Chapter ${chapterNumber}`),
        text,
      });
    }

    if (chapters.length === 0) {
      throw new Error("No readable chapters were found in this EPUB.");
    }

    return { title, author, coverUrl, chapters };
  },
};
