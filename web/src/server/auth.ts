import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/server/db";
import { account, profiles, session, user, user_roles, verification } from "@/server/db/schema";
import { sendMail } from "@/server/mail";
import { APIError } from "better-auth/api";
import { isLoginDisabled } from "@/server/services/accounts";
import { SITE_URL } from "@/lib/env";

const google = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
  : {};
const line = process.env.LINE_CLIENT_ID && process.env.LINE_CLIENT_SECRET
  ? {
      line: {
        clientId: process.env.LINE_CLIENT_ID,
        clientSecret: process.env.LINE_CLIENT_SECRET,
        // LINE only returns email when the channel has email permission; fall back to a stable placeholder.
        mapProfileToUser: (p: { sub?: string; email?: string }) => (p.email ? {} : { email: `line_${p.sub}@users.dwelly.local` }),
      },
    }
  : {};

export const enabledProviders = { google: "google" in google, line: "line" in line };

export const auth = betterAuth({
  baseURL: SITE_URL,
  // Placeholder only while unconfigured: the proxy sends every page to /setup and /api/auth returns 503.
  secret: process.env.BETTER_AUTH_SECRET || "unconfigured-placeholder-secret-never-used-for-sessions",
  trustedOrigins: [SITE_URL],
  database: drizzleAdapter(db, { provider: "mysql", schema: { user, session, account, verification } }),
  advanced: { database: { generateId: "uuid" } },
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  socialProviders: { ...google, ...line },
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  rateLimit: { enabled: true, window: 60, max: 30 },
  databaseHooks: {
    session: {
      create: {
        // Super admins can switch off sign-in per user; this blocks every method (password, OTP, Google, LINE).
        before: async (session) => {
          if (await isLoginDisabled(session.userId)) {
            throw new APIError("FORBIDDEN", { message: "LOGIN_DISABLED" });
          }
          return { data: session };
        },
      },
    },
    user: {
      create: {
        // Every account gets an app profile + default role (replaces the old auth trigger).
        after: async (u) => {
          await db.insert(profiles).values({
            id: u.id,
            display_name: (u.name || u.email.split("@")[0]).slice(0, 80),
            avatar_url: u.image ?? null,
          }).onDuplicateKeyUpdate({ set: { id: u.id } });
          await db.insert(user_roles).values({ user_id: u.id, role: "buyer" }).onDuplicateKeyUpdate({ set: { role: "buyer" } });
        },
      },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      async sendVerificationOTP({ email, otp }) {
        await sendMail(email, `รหัสเข้าสู่ระบบ Dwelly: ${otp}`, `รหัสเข้าสู่ระบบของคุณคือ ${otp}\nรหัสมีอายุ 10 นาที หากคุณไม่ได้ขอรหัสนี้ โปรดเพิกเฉยต่ออีเมลนี้`);
      },
    }),
    nextCookies(), // must be last: lets server actions set the session cookie
  ],
});
