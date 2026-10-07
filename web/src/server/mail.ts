import "server-only";
import nodemailer from "nodemailer";

let transport: ReturnType<typeof nodemailer.createTransport> | null | undefined;

function getTransport() {
  if (transport === undefined) {
    transport = process.env.SMTP_HOST
      ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? 587),
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
        })
      : null;
  }
  return transport;
}

/** Sends mail via SMTP; without SMTP configured (local dev) it logs to the console instead. */
export async function sendMail(to: string, subject: string, text: string) {
  const t = getTransport();
  if (!t) {
    console.info(`[mail:dev] to=${to} subject="${subject}"\n${text}`);
    return;
  }
  await t.sendMail({ from: process.env.MAIL_FROM ?? "Dwelly <no-reply@dwelly.co>", to, subject, text });
}
