"use client";

import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
  size?: "default" | "sm";
};

export function Button({
  className = "",
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-60";
  const variants = {
    default: "bg-primary text-primary-foreground hover:opacity-90",
    outline:
      "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
  } as const;
  const sizes = {
    default: "px-4 py-2",
    sm: "px-3 py-1.5 text-xs",
  } as const;
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
