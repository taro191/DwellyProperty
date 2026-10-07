import "server-only";
import nodemailer from "nodemailer";

/**
 * Mail transport, chosen by MAIL_TRANSPORT (or inferred):
 * - "smtp"     when SMTP_HOST is set (SMTP_PORT, SMTP_USER, SMTP_PASSWORD)
 * - "sendmail" the server's local MTA (Plesk/Postfix) — default in production, no credentials needed
 * - "log"      print to the server log — default in development
 */
type Mode = "smtp" | "sendmail" | "log";

function mode(): Mode {
  const m = process.env.MAIL_TRANSPORT as Mode | undefined;
  if (m === "smtp" || m === "sendmail" || m === "log") return m;
  if (process.env.SMTP_HOST) return "smtp";
  return process.env.NODE_ENV === "production" ? "sendmail" : "log";
}

let transport: ReturnType<typeof nodemailer.createTransport> | null | undefined;

function getTransport() {
  if (transport !== undefined) return transport;
  const m = mode();
  if (m === "smtp") {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
  } else if (m === "sendmail") {
    transport = nodemailer.createTransport({ sendmail: true, newline: "unix", path: process.env.SENDMAIL_PATH ?? "/usr/sbin/sendmail" });
  } else {
    transport = null;
  }
  return transport;
}

export async function sendMail(to: string, subject: string, text: string) {
  const t = getTransport();
  if (!t) {
    console.info(`[mail:dev] to=${to} subject="${subject}"\n${text}`);
    return;
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM ?? "Dwelly <no-reply@localhost>", to, subject, text });
  } catch (err) {
    console.error(`[mail] ${mode()} send failed`, err);
    throw err;
  }
}
