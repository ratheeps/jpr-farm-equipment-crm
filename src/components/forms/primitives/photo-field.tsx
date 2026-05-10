"use client";

import * as React from "react";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoFieldProps {
  value?: File | null;
  onChange: (file: File | null) => void;
  label?: string;
  className?: string;
}

export function PhotoField({
  value,
  onChange,
  label = "Add photo",
  className,
}: PhotoFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const previewUrl = React.useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
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
            <span className="text-sm font-semibold">{label}</span>
          </>
        )}
      </button>
    </div>
  );
}
