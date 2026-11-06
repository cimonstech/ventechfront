'use client';

import React, { forwardRef, useId, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { FieldError, FieldHint } from '@/components/ui-states';
import { passwordToggleLabel } from '@/lib/passwordToggle';

export type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label?: string;
  error?: string;
  helperText?: string;
  /** Leading icon inside the field (e.g. Lock). */
  icon?: React.ReactNode;
};

/**
 * Shared password field with an accessible show/hide control.
 * Keeps focus on the input; never submits the form.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    { label, error, helperText, icon, className = '', id, autoComplete = 'current-password', onChange, ...props },
    ref
  ) {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const describedBy = error ? errorId : helperText ? hintId : undefined;
    const [visible, setVisible] = useState(false);
    const localRef = useRef<HTMLInputElement | null>(null);

    const setRefs = (node: HTMLInputElement | null) => {
      localRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };

    const toggle = () => {
      setVisible((current) => !current);
      requestAnimationFrame(() => {
        const el = localRef.current;
        if (!el) return;
        el.focus();
        const end = el.value.length;
        try {
          el.setSelectionRange(end, end);
        } catch {
          // ignore for unsupported input types mid-toggle
        }
      });
    };

    return (
      <div className="w-full">
        {label ? (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
            {props.required ? <span className="text-red-500 ml-1">*</span> : null}
          </label>
        ) : null}

        <div className="relative">
          {icon ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              {icon}
            </div>
          ) : null}

          <input
            {...props}
            ref={setRefs}
            id={inputId}
            type={visible ? 'text' : 'password'}
            autoComplete={autoComplete}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            onChange={onChange}
            className={`w-full rounded-lg border px-4 py-2.5 pr-12 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-[#FF7A19] disabled:cursor-not-allowed disabled:bg-gray-100 ${
              icon ? 'pl-10' : ''
            } ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'} ${className}`}
          />

          <button
            type="button"
            onClick={toggle}
            aria-label={passwordToggleLabel(visible)}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex h-full min-h-[44px] min-w-[44px] items-center justify-center text-[#3A3A3A] hover:text-[#FF7A19] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A19] rounded-r-lg"
          >
            {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </div>

        <FieldError id={errorId} message={error} />
        <FieldHint id={hintId} message={!error ? helperText : null} />
      </div>
    );
  }
);
