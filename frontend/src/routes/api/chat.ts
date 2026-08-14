import { createFileRoute } from "@tanstack/react-router";
import { retrieve } from "@/lib/rag-kb";

type ChatMessage = { role: "user" | "assistant"; content: string };
type ChatRequestBody = { messages?: ChatMessage[]; message?: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ChatRequestBody;
        try {
          body = (await request.json()) as ChatRequestBody;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const messages = Array.isArray(body.messages) ? body.messages : [];
        // Take the most recent user message.
        const lastUser = [...messages]
          .reverse()
          .find((m) => m && m.role === "user" && typeof m.content === "string");
        const query =
          (lastUser?.content ?? body.message ?? "").toString().trim();

        if (!query) {
          return new Response("No user message", { status: 400 });
        }

        const { answer, sources } = retrieve(query);

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const emit = (obj: unknown) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(obj)}\n\n`),
              );
            };

            // Stream the answer as small word-chunks for the typing effect.
            const tokens = tokenize(answer);
            for (const tok of tokens) {
              emit({ t: tok });
              await sleep(16);
            }

            if (sources.length > 0) {
              await sleep(60);
              emit({ sources });
            }
            await sleep(40);
            emit({ done: true });
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Split the answer into small chunks (≈2–4 words) while preserving
// markdown line breaks so the streamed text reflows naturally.
function tokenize(text: string): string[] {
  const out: string[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trim() === "") {
      out.push("\n");
      continue;
    }
    const words = line.split(/(\s+)/); // keep whitespace runs
    let buf = "";
    for (const w of words) {
      buf += w;
      // flush roughly every 3 word-ish chunks
      if (buf.length >= 14) {
        out.push(buf);
        buf = "";
      }
    }
    if (buf) out.push(buf);
    if (i < lines.length - 1) out.push("\n");
  }
  return out;
}
