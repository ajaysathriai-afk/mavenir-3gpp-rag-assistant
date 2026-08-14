import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { SignalIcon } from "@/components/chat/SignalIcon";
import { ChatMessage, type ChatMessageData } from "@/components/chat/ChatMessage";
import type { Source } from "@/lib/rag-kb";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "3GPP Standards Assistant" },
      {
        name: "description",
        content:
          "RAG chatbot for 3GPP 5G standards — ask about network slicing, the Service-Based Architecture, PDU sessions, AMF/SMF/UPF, 5G QoS, registration and security.",
      },
      { property: "og:title", content: "3GPP Standards Assistant" },
      {
        property: "og:description",
        content:
          "Ask grounded questions about 5G (3GPP) system architecture, procedures and protocols.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

const SUGGESTIONS = [
  "What is network slicing?",
  "Explain the Service-Based Architecture",
  "How is a PDU session established?",
  "What does the UPF do?",
  "Explain 5G QoS and the 5QI",
  "How does 5G authentication work?",
];

let idCounter = 0;
const uid = () => `m_${Date.now()}_${idCounter++}`;

const WELCOME: ChatMessageData = {
  id: "welcome",
  role: "assistant",
  content:
    "**Welcome — I'm the 3GPP Standards Assistant.** 👋\n\nI answer questions about 5G (and 4G) system architecture and procedures using the 3GPP specification set. Try one of the prompts below, or ask anything about **network slicing**, the **Service-Based Architecture**, **PDU sessions**, **AMF/SMF/UPF**, **5G QoS**, **registration** or **security**.",
  sources: [],
};

function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageData[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll on new content.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Auto-grow the textarea up to a cap.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 168) + "px";
  }, [input]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const userMsg: ChatMessageData = {
        id: uid(),
        role: "user",
        content: trimmed,
      };
      const assistantId = uid();
      const assistantMsg: ChatMessageData = {
        id: assistantId,
        role: "assistant",
        content: "",
        sources: [],
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setBusy(true);

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: trimmed }),
          signal: ac.signal,
        });
        if (!res.ok || !res.body) throw new Error("bad response");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const apply = (patch: (m: ChatMessageData) => ChatMessageData) =>
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? patch(m) : m)),
          );

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const chunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const line = chunk.startsWith("data: ")
              ? chunk.slice(6)
              : chunk.startsWith("data:")
                ? chunk.slice(5)
                : null;
            if (!line) continue;
            let payload: Record<string, unknown>;
            try {
              payload = JSON.parse(line);
            } catch {
              continue;
            }
            if (typeof payload["t"] === "string") {
              apply((m) => ({ ...m, content: m.content + payload["t"] }));
            } else if (Array.isArray(payload["sources"])) {
              apply((m) => ({
                ...m,
                sources: payload["sources"] as Source[],
              }));
            } else if (payload["done"] === true) {
              apply((m) => ({ ...m, streaming: false }));
            }
          }
        }
        // ensure final flag flips off
        apply((m) => ({ ...m, streaming: false }));
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  streaming: false,
                  content:
                    "⚠️ Sorry — I couldn't reach the assistant backend. Please try again.",
                }
              : m,
          ),
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, messages],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex h-[100svh] flex-col bg-surface-gradient text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-glass backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <SignalIcon />
            <div className="leading-tight">
              <h1 className="text-[0.95rem] font-semibold tracking-tight text-foreground">
                3GPP Standards Assistant
              </h1>
              <p className="text-[0.7rem] font-medium text-muted-foreground">
                5G Core · Network Architecture RAG
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[0.7rem] font-medium">
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-status-online-bg px-2.5 py-1 text-status-online"
              style={{ animation: "header-glow 2.4s ease-in-out infinite" }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-status-online"
                style={{ animation: "signal-pulse 1.8s ease-in-out infinite" }}
              />
              Online
            </span>
          </div>
        </div>
      </header>

      {/* Transcript */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}

          {/* Suggestion chips when idle and near-top of conversation */}
          {!busy && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[0.78rem] font-medium text-foreground/80 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:bg-brand-soft hover:text-brand"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="h-2" />
        </div>
      </div>

      {/* Composer */}
      <footer className="sticky bottom-0 z-20 border-t border-border/70 bg-glass backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <div className="flex items-end gap-2 rounded-2xl border border-input bg-card px-3 py-2 shadow-sm focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/15">
            <span
              className="mb-1.5 select-none text-muted-foreground"
              aria-hidden
            >
              ⌘
            </span>
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Ask about 5G standards… (e.g. What is network slicing?)"
              className="max-h-[168px] flex-1 resize-none bg-transparent py-1.5 text-[0.9375rem] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              onClick={() => send(input)}
              disabled={busy || !input.trim()}
              className="group mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-signal text-white shadow-sm transition-all hover:enabled:-translate-y-0.5 hover:enabled:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={busy ? "animate-pulse" : ""}
              >
                <path d="M22 2 11 13" />
                <path d="M22 2 15 22l-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
          <p className="mt-1.5 text-center text-[0.7rem] text-muted-foreground">
            3GPP knowledge base · TS 23.501 / 23.502 / 33.501 / 38.331 · answers are grounded in specs but verify against the latest release.
          </p>
        </div>
      </footer>
    </div>
  );
}
