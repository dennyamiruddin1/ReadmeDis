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
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${
        isDragging
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
          : "border-zinc-300 hover:border-indigo-400 dark:border-zinc-700"
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
      <p className="text-lg font-medium text-zinc-800 dark:text-zinc-100">
        Drop a {label} file here, or click to browse
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Everything runs locally in your browser -- nothing is uploaded anywhere.
      </p>
    </div>
  );
}
