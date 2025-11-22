"use client";

import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`bg-background text-foreground border-input placeholder:text-muted-foreground focus-visible:ring-ring block w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 ${className}`}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
