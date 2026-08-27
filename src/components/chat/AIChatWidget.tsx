import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2, Bot, User, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getApiUrl, getToken } from "@/lib/api";

type Msg = { role: "user" | "assistant"; content: string; isError?: boolean; retryAfter?: number };

const CHAT_URL = getApiUrl("/api/ai-chat");

async function streamChat({
  messages,
  userName,
  onDelta,
  onDone,
}: {
  messages: Msg[];
  userName?: string;
  onDelta: (t: string) => void;
  onDone: () => void;
}) {
  const token = await getToken();
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages: messages.filter((m) => !m.isError), userName }),
  });

  if (resp.status === 401) {
    throw new Error("Please sign in to use the AI assistant.");
  }

  if (resp.status === 429) {
    const data = await resp.json().catch(() => ({}));
    const err: any = new Error(data.message || "Rate limit reached");
    err.retryAfter = data.retryAfter || 60;
    err.isRateLimit = true;
    throw err;
  }

  if (!resp.ok || !resp.body) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || "Failed to connect to AI");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        if (parsed.error) throw new Error(parsed.error);
        const c = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (c) onDelta(c);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }
  onDone();
}

function RateLimitMessage({ retryAfter, onRetry }: { retryAfter: number; onRetry: () => void }) {
  const [seconds, setSeconds] = useState(retryAfter);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return (
    <div className="flex items-start gap-2 text-sm">
      <Clock className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-yellow-500 font-medium">AI quota reached</p>
        {seconds > 0 ? (
          <p className="text-muted-foreground text-xs mt-0.5">
            Retry available in <span className="font-semibold text-foreground">{seconds}s</span>
          </p>
        ) : (
          <button
            onClick={onRetry}
            className="text-xs text-primary hover:underline mt-0.5 font-medium"
          >
            Click to retry
          </button>
        )}
      </div>
    </div>
  );
}

export function AIChatWidget() {
  const { profile } = useAuth();
  const userName = profile?.display_name || undefined;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastUserMsg, setLastUserMsg] = useState<Msg | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (overrideMessages?: Msg[], overrideUserMsg?: Msg) => {
    const text = overrideUserMsg?.content || input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Msg = overrideUserMsg || { role: "user", content: text };
    if (!overrideMessages) {
      setMessages((prev) => [...prev, userMsg]);
    }
    setLastUserMsg(userMsg);
    setLoading(true);

    const convo = overrideMessages || [...messages, userMsg];
    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.isError) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: convo,
        userName,
        onDelta: upsert,
        onDone: () => setLoading(false),
      });
    } catch (e: any) {
      if (e.isRateLimit) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "", isError: true, retryAfter: e.retryAfter },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Sorry, something went wrong: ${e.message}`, isError: true },
        ]);
      }
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleRetry = useCallback(() => {
    if (!lastUserMsg) return;
    // Remove the error message and re-send
    setMessages((prev) => prev.filter((m) => !m.isError));
    const convo = messages.filter((m) => !m.isError);
    send(convo, lastUserMsg);
  }, [lastUserMsg, messages, send]);

  if (!open) {
    return (
      <button
        data-testid="button-open-chat"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
        aria-label="Open AI Chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-4rem)] flex flex-col rounded-2xl border border-border/60 bg-background shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-secondary/50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Apexium AI</p>
            <p className="text-xs text-muted-foreground">Trading Assistant</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center space-y-3 pt-8">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Hi! I'm Apexium AI. Ask me anything about trading, chart analysis, or how to use the app.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["How do I analyze a chart?", "Explain risk settings", "What is Auto Trade?"].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border/50 bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                <Bot className="h-3 w-3 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : m.isError
                  ? "bg-yellow-500/10 border border-yellow-500/30 text-foreground"
                  : "bg-secondary/70 text-foreground"
              }`}
            >
              {m.isError && m.retryAfter != null ? (
                <RateLimitMessage retryAfter={m.retryAfter} onRetry={handleRetry} />
              ) : (
                m.content
              )}
            </div>
            {m.role === "user" && (
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                <User className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <div className="bg-secondary/70 rounded-xl px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/40 bg-secondary/30">
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex gap-2"
        >
          <Input
            data-testid="input-chat-message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about trading..."
            className="flex-1 text-sm bg-background"
            disabled={loading}
          />
          <Button
            data-testid="button-send-chat"
            type="submit"
            size="icon"
            disabled={!input.trim() || loading}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
