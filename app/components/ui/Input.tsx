'use client';

import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  label?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, label, hint, className = '', id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full h-11 px-4 rounded-md border bg-surface
            text-foreground placeholder:text-zinc-400 dark:placeholder:text-zinc-500
            transition-colors duration-fast
            focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error
              ? 'border-error focus-visible:ring-error'
              : 'border-border'}
            ${className}
          `}
          aria-invalid={error}
          aria-describedby={hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {hint && (
          <p
            id={`${inputId}-hint`}
            className={`mt-1.5 text-sm ${error ? 'text-error' : 'text-zinc-500 dark:text-zinc-400'}`}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
