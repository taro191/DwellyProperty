import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";
import { isConfigured } from "@/lib/env";

const handler = toNextJsHandler(auth);
const notConfigured = () => new Response("Auth is not configured", { status: 503 });

export const GET = isConfigured ? handler.GET : notConfigured;
export const POST = isConfigured ? handler.POST : notConfigured;
