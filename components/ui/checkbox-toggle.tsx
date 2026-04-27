"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const sizeClass = {
  md: "text-[20px]",
  sm: "text-[16px]",
} as const;

export type CheckboxToggleProps = {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: keyof typeof sizeClass;
  className?: string;
  "aria-label"?: string;
};

export function CheckboxToggle({
  id,
  checked,
  onCheckedChange,
  disabled,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: CheckboxToggleProps) {
  return (
    <label
      className={cn(
        "hungry-squid-toggle relative inline-flex flex-shrink-0",
        "cursor-pointer select-none items-center justify-center",
        "rounded-full bg-white dark:bg-card",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
        sizeClass[size],
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className={cn(
          "cursor-pointer appearance-none",
          disabled && "cursor-not-allowed",
        )}
      />
      <div className="hungry-squid-checkmark" aria-hidden />
      <svg
        width={50}
        height={50}
        xmlns="http://www.w3.org/2000/svg"
        className="hungry-squid-celebrate"
        aria-hidden
      >
        <polygon points="0,0 10,10" />
        <polygon points="0,25 10,25" />
        <polygon points="0,50 10,40" />
        <polygon points="50,0 40,10" />
        <polygon points="50,25 40,25" />
        <polygon points="50,50 40,40" />
      </svg>
    </label>
  );
}
