import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Source } from "@/lib/rag-kb";

export type ChatMessageData = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  streaming?: boolean;
};

function SourcePill({ source }: { source: Source }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-softer px-2.5 py-1 text-xs font-medium text-brand transition-colors hover:border-brand/45 hover:bg-brand-soft"
      title={`${source.spec} — ${source.section}`}
    >
      <span aria-hidden>📄</span>
      <span className="tabular-nums">
        {source.spec}
        <span className="text-brand/60">, p.</span>
        {source.page}
      </span>
    </span>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1.5 py-1.5" aria-label="Assistant is thinking">
      <span
        className="typing-dot"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="typing-dot"
        style={{ animationDelay: "160ms" }}
      />
      <span
        className="typing-dot"
        style={{ animationDelay: "320ms" }}
      />
    </span>
  );
}

export function ChatMessage({ message }: { message: ChatMessageData }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end animate-msg-in">
        <div className="max-w-[78%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-[0.9375rem] leading-relaxed text-brand-foreground shadow-sm">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant
  const showTyping =
    message.streaming && message.content.length === 0 && (!message.sources || message.sources.length === 0);

  return (
    <div className="flex justify-start animate-msg-in">
      <div className="w-full max-w-[88%]">
        <div className="relative rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3.5 shadow-sm">
          {/* subtle blue left border accent */}
          <span
            className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-brand-border"
            aria-hidden
          />
          {showTyping ? (
            <TypingDots />
          ) : (
            <div className="chat-md">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {message.streaming && (
                <span className="ml-0.5 inline-block h-[1.05em] w-[2px] -translate-y-[1px] animate-pulse bg-brand align-middle" />
              )}
            </div>
          )}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="mt-2.5 pl-1">
            <div className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              <span aria-hidden>🔎</span> Sources
            </div>
            <div className="flex flex-wrap gap-1.5">
              {message.sources.map((s, i) => (
                <SourcePill key={`${s.spec}-${s.page}-${i}`} source={s} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
