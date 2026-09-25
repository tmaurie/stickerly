import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ICON, X } from "./icons";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition disabled:pointer-events-none disabled:opacity-50";

export const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-action text-white shadow-[0_3px_0_var(--color-action-shadow)] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-action-shadow)]",
  secondary: "bg-white text-ink border border-line hover:border-ink-soft/40",
  ghost: "text-ink-soft hover:bg-white hover:text-ink",
  danger: "text-red-700 hover:bg-red-50",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  const sizing = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2";
  return (
    <button
      type="button"
      className={`${BUTTON_BASE} ${sizing} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
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
      className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
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
