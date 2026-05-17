"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_MAX_BYTES = 8 * 1024 * 1024; // 8 MB — fits sync payloads + IndexedDB quotas comfortably

interface PhotoFieldProps {
  value?: File | null;
  onChange: (file: File | null) => void;
  onError?: (reason: "size" | "type", file: File) => void;
  label?: string;
  maxBytes?: number;
  accept?: string;
  className?: string;
}

export function PhotoField({
  value,
  onChange,
  onError,
  label,
  maxBytes = DEFAULT_MAX_BYTES,
  accept = "image/*",
  className,
}: PhotoFieldProps) {
  const t = useTranslations("forms");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      onChange(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      onError?.("type", file);
      return;
    }
    if (file.size > maxBytes) {
      onError?.("size", file);
      return;
    }
    onChange(file);
  }

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card text-muted-foreground"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="h-full w-full rounded-lg object-cover" />
        ) : (
          <>
            <Camera className="h-7 w-7" strokeWidth={1.5} />
            <span className="text-sm font-semibold">{label ?? t("addPhoto")}</span>
          </>
        )}
      </button>
    </div>
  );
}
