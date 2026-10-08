"use client";

import { createContext, useContext, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Alert, buttonClass } from "@/components/ui";
import type { ActionResult } from "@/lib/types";

const PendingContext = createContext(false);
const StateContext = createContext<ActionResult<unknown> | null>(null);

export function SubmitButton({
  children, pendingText = "กำลังบันทึก…", variant = "primary", size = "md", className, name, value, disabled, plain = false,
}: {
  children: ReactNode; pendingText?: string; variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg"; className?: string; name?: string; value?: string; disabled?: boolean;
  /** Use only `className` (prototype-styled screens) instead of the button variants. */
  plain?: boolean;
}) {
  const pending = useContext(PendingContext);
  return (
    <button type="submit" name={name} value={value} disabled={pending || disabled} className={plain ? className : buttonClass(variant, size, className)}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionResult<unknown> | null }) {
  if (!state) return null;
  if (state.ok) return state.message ? <Alert tone="accent">{state.message}</Alert> : null;
  return <Alert tone="danger">{state.error}</Alert>;
}

/** Field-level error from the nearest ActionForm. */
export function FieldError({ name }: { name: string }) {
  const state = useContext(StateContext);
  const msg = state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined;
  return msg ? <span className="text-xs text-red-300">{msg}</span> : null;
}

export type FormAction = (formData: FormData) => Promise<ActionResult<unknown>>;

/**
 * Form bound to a server action returning ActionResult. Uses onSubmit (not the
 * `action` prop) so React does not reset user input when validation fails.
 */
export function ActionForm({
  action, children, className, resetOnSuccess = false, onSuccess, showMessage = true,
}: {
  action: FormAction; children: ReactNode; className?: string; resetOnSuccess?: boolean;
  onSuccess?: (result: ActionResult<unknown>) => void; showMessage?: boolean;
}) {
  const [state, setState] = useState<ActionResult<unknown> | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(form, submitter);
    startTransition(async () => {
      try {
        const result = await action(fd);
        if (!result) return; // action redirected; the router is navigating
        setState(result);
        if (result.ok) {
          if (resetOnSuccess) form.reset();
          onSuccess?.(result);
        }
      } catch (err) {
        // redirect() inside an action surfaces as a thrown navigation signal — rethrow it.
        if (err && typeof err === "object" && "digest" in err) throw err;
        setState({ ok: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" });
      }
    });
  }

  return (
    <PendingContext.Provider value={pending}>
      <StateContext.Provider value={state}>
        <form onSubmit={handleSubmit} className={className} noValidate={false}>
          {children}
          {showMessage && state && (
            <div className="mt-3">
              <FormMessage state={state} />
            </div>
          )}
        </form>
      </StateContext.Provider>
    </PendingContext.Provider>
  );
}
