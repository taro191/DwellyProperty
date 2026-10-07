import type { NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { chatBus, isMember, messagesSince } from "@/server/services/chat";
import type { Message } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream of new messages in a conversation (members only).
 * Clients pass ?since=<iso> to catch up on anything missed while disconnected.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/chat/[id]/stream">) {
  const { id } = await ctx.params;
  const viewer = await getViewer();
  if (!viewer || !(await isMember(id, viewer.id))) return new Response("Forbidden", { status: 403 });

  const since = req.nextUrl.searchParams.get("since");
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };
      if (since) for (const m of await messagesSince(id, since)) send("message", m);

      const onMessage = (m: Message) => send("message", m);
      const ping = setInterval(() => send("ping", Date.now()), 25_000); // keep proxies from closing the connection
      chatBus.on(`conv:${id}`, onMessage);
      cleanup = () => {
        clearInterval(ping);
        chatBus.off(`conv:${id}`, onMessage);
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering
    },
  });
}
