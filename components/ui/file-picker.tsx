"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FilePickerProps = {
  id: string;
  accept?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  inputKey?: React.Key;
  chooseLabel?: string;
  emptyLabel?: string;
  className?: string;
};

export function FilePicker({
  id,
  accept,
  value,
  onChange,
  disabled,
  inputKey,
  chooseLabel = "เลือกไฟล์",
  emptyLabel = "ยังไม่ได้เลือกไฟล์",
  className,
}: FilePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className={cn("w-full", className)}>
      <input
        key={inputKey}
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          onChange(f ?? null);
        }}
      />
      <div
        className={cn(
          "flex min-h-10 w-full items-center gap-3 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
          "dark:border-white/12 dark:bg-[#141416]/90",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {chooseLabel}
        </Button>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[15px]",
            value ? "text-foreground" : "text-muted-foreground",
          )}
          title={value?.name}
        >
          {value ? value.name : emptyLabel}
        </span>
      </div>
    </div>
  );
}
