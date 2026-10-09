import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const cn = clsx;

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary: "bg-[var(--accent)] text-[var(--bg)] hover:brightness-110 shadow-md",
  secondary: "bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)]",
  ghost: "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]",
  danger: "bg-rose-500/15 text-rose-400 border border-rose-500/40 hover:bg-rose-500/25",
};
const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-xl",
  md: "h-10 px-4 text-xs rounded-xl",
  lg: "h-11 px-5 text-sm rounded-2xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 font-extrabold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
    variantClass[variant],
    sizeClass[size],
    extra,
  );
}

export function Button({
  variant = "primary", size = "md", className, ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary", size = "md", className, ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

const fieldBase =
  "w-full rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:border-[var(--accent)] focus:outline-none transition-colors";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "py-3 min-h-28", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldBase, "h-10 pr-8", className)} {...props} />;
}

export function Field({
  label, hint, error, children, className, required,
}: { label: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] font-bold text-[var(--text-secondary)]">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      {children}
      {error ? <span className="text-xs text-red-300">{error}</span> : hint ? <span className="text-xs text-subtle">{hint}</span> : null}
    </label>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm", className)} {...props} />;
}

type Tone = "neutral" | "accent" | "warning" | "danger" | "info";
const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-line",
  accent: "bg-accent/10 text-accent-strong border-accent/30",
  warning: "bg-warning/10 text-amber-300 border-warning/30",
  danger: "bg-danger/10 text-red-300 border-danger/30",
  info: "bg-info/10 text-sky-300 border-info/30",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", toneClass[tone], className)}
      {...props}
    />
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl bg-[var(--surface)] border border-dashed border-[var(--border)] px-6 py-10 text-center">
      <p className="font-extrabold text-sm text-[var(--text-primary)]">{title}</p>
      {body && <p className="mt-1 text-xs text-[var(--text-secondary)]">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-lg font-black tracking-tight text-[var(--text-primary)]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={cn("rounded-2xl border px-3.5 py-3 text-xs", toneClass[tone])}>{children}</div>;
}
