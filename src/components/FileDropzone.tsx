"use client";

import { useRef, useState } from "react";

interface FileDropzoneProps {
  extensions: string[];
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function FileDropzone({ extensions, onFileSelected, disabled }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const accept = extensions.map((ext) => `.${ext}`).join(",");
  const label = extensions.map((ext) => ext.toUpperCase()).join(", ");

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-3 rounded-3xl border-4 border-dashed bg-white/60 p-12 text-center shadow-sm transition-colors dark:bg-slate-900/40 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${
        isDragging
          ? "border-pink-400 bg-pink-50 dark:bg-pink-950/30"
          : "border-sky-300 hover:border-sky-400 dark:border-sky-700"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-lg font-medium text-sky-800 dark:text-sky-100">
        🫧 Drop a {label} file here, or click to browse
      </p>
      <p className="text-sm text-sky-500 dark:text-sky-400">
        Everything runs locally in your browser -- nothing is uploaded anywhere.
      </p>
    </div>
  );
}
