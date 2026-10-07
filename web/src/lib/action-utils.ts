import "server-only";
import type { z } from "zod";
import { AppError } from "@/server/services/core";
import type { ActionResult } from "@/lib/types";

/** Turn a thrown error into an ActionResult; business-rule errors carry their own Thai message. */
export function fail(err: unknown, fallback = "เกิดข้อผิดพลาด กรุณาลองใหม่"): ActionResult<never> {
  if (err instanceof AppError) return { ok: false, error: err.message };
  // Let Next.js redirects / notFound propagate.
  if (err && typeof err === "object" && "digest" in err) throw err;
  const code = (err as { code?: string } | null)?.code;
  if (code === "ER_DUP_ENTRY") return { ok: false, error: "ข้อมูลนี้มีอยู่แล้ว" };
  console.error("[action]", err);
  return { ok: false, error: fallback };
}

/** Run a service call and map success/failure to ActionResult. */
export async function attempt<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data, message };
  } catch (err) {
    return fail(err);
  }
}

export function invalid(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  const first = error.issues[0];
  return { ok: false, error: first ? first.message : "ข้อมูลไม่ถูกต้อง", fieldErrors };
}

/** FormData -> plain object; empty strings become undefined so optional fields validate cleanly. */
export function formObject(fd: FormData): Record<string, string | string[] | undefined> {
  const out: Record<string, string | string[] | undefined> = {};
  for (const key of new Set(fd.keys())) {
    const values = fd.getAll(key).filter((v): v is string => typeof v === "string");
    if (key.endsWith("[]")) out[key.slice(0, -2)] = values.filter(Boolean);
    else out[key] = values[0] === "" ? undefined : values[0];
  }
  return out;
}
