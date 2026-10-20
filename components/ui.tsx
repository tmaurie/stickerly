"use client";

import { useEffect, useId, useRef, useState, type ComponentPropsWithRef, type ReactNode } from "react";
import { ICON, X } from "./icons";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dangerSolid";

export const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition disabled:pointer-events-none disabled:opacity-50";

export const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-action text-white shadow-[0_3px_0_var(--color-action-shadow)] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-action-shadow)]",
  secondary: "bg-white text-ink border border-line hover:border-ink-soft/40",
  ghost: "text-ink-soft hover:bg-white hover:text-ink",
  danger: "text-danger hover:bg-danger-soft",
  dangerSolid:
    "bg-danger text-white shadow-[0_3px_0_var(--color-danger-shadow)] hover:brightness-110 active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-danger-shadow)]",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
  // React 19 passes `ref` as an ordinary prop, so no forwardRef wrapper.
}: ComponentPropsWithRef<"button"> & { variant?: Variant; size?: "sm" | "md" }) {
  const sizing = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2";
  return (
    <button
      type="button"
      className={`${BUTTON_BASE} ${sizing} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

/**
 * A destructive action that asks before it fires, in place of `confirm()`.
 *
 * The native dialog blocked the thread, could not be translated or styled, and
 * looked nothing like the rest of the app. This arms in place instead: the
 * question replaces the button, focus moves to the confirming control so a
 * keyboard or screen-reader user lands on it, that control is described by the
 * question, and Escape disarms.
 */
export function ConfirmButton({
  label,
  question,
  confirmLabel,
  onConfirm,
  size = "sm",
  className = "",
}: {
  label: string;
  question: string;
  confirmLabel: string;
  onConfirm: () => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const questionId = useId();

  useEffect(() => {
    if (armed) confirmRef.current?.focus();
  }, [armed]);

  if (!armed) {
    return (
      <Button variant="danger" size={size} className={className} onClick={() => setArmed(true)}>
        {label}
      </Button>
    );
  }

  return (
    <span
      className="flex flex-wrap items-center gap-2"
      onKeyDown={(event) => {
        if (event.key === "Escape") setArmed(false);
      }}
    >
      <span id={questionId} className="text-sm text-ink-soft">
        {question}
      </span>
      <Button
        ref={confirmRef}
        variant="dangerSolid"
        size={size}
        aria-describedby={questionId}
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
      <Button variant="ghost" size={size} onClick={() => setArmed(false)}>
        Annuler
      </Button>
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-blob border border-line bg-paper ${className}`}>{children}</div>;
}

export function ErrorNote({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger"
    >
      <span className="flex-1">{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Fermer">
          <X {...ICON} />
        </button>
      )}
    </div>
  );
}
