import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, MessageCircle, Paperclip, Send, Smile, X } from "lucide-react";
import { API_BASE, TOKEN_KEY } from "../../config";

type LiveChatCardProps = {
  initiallyOpen?: boolean;
};

type ChatMessage = {
  id: string;
  from: string;
  time: string;
  text: string;
  outbound: boolean;
  status: "sent" | "delivered" | "read";
};

const LiveChatCard = ({ initiallyOpen = false }: LiveChatCardProps) => {
  const [open, setOpen] = useState(initiallyOpen);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [composer, setComposer] = useState("");
  const [threadId, setThreadId] = useState("");
  const [guestId, setGuestId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<number | null>(null);
  const typingRef = useRef<number | null>(null);
  const heartbeatRef = useRef<number | null>(null);

  const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
  const guestStorageKey = "chat_guest_id";

  const formatTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const mapMessage = (message: any): ChatMessage => ({
    id: message.id,
    from: message.sender_type === "system" ? "System" : "You",
    time: formatTime(message.created_at),
    text: message.content,
    outbound: message.sender_type === "external",
    status: message.read_at ? "read" : message.delivered_at ? "delivered" : "sent"
  });

  const statusIcon = (status: string) => {
    if (status === "read") return <CheckCheck size={12} className="text-emerald-500" />;
    if (status === "delivered") return <Check size={12} className="text-ink-muted" />;
    return null;
  };

  const loadMessages = async (activeThreadId: string, activeGuestId: string) => {
    if (!activeThreadId) return;
    try {
      const endpoint = API_BASE
        ? `${API_BASE}/chat/live/messages?thread_id=${encodeURIComponent(activeThreadId)}${
            activeGuestId ? `&guest_id=${encodeURIComponent(activeGuestId)}` : ""
          }`
        : `/chat/live/messages?thread_id=${encodeURIComponent(activeThreadId)}${
            activeGuestId ? `&guest_id=${encodeURIComponent(activeGuestId)}` : ""
          }`;
      const res = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) return;
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setMessages(items.map(mapMessage));
    } catch {
      // ignore
    }
  };

  const connectSocket = (activeThreadId: string, activeGuestId: string) => {
    if (!activeThreadId || socketRef.current) return;
    const wsBase = API_BASE
      ? API_BASE.replace(/^http/, "ws")
      : `${window.location.origin.replace(/^http/, "ws")}`;
    const query = token
      ? `token=${encodeURIComponent(token)}`
      : `guest_id=${encodeURIComponent(activeGuestId || "")}`;
    const socket = new WebSocket(`${wsBase}/chat/ws?${query}`);
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "subscribe", thread_id: activeThreadId }));
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "heartbeat" }));
        }
      }, 10000);
    });

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "message:new" && payload.thread_id === activeThreadId) {
          setMessages((prev) => {
            const exists = prev.some((item) => item.id === payload.message?.id);
            if (exists || !payload.message) return prev;
            return [...prev, mapMessage(payload.message)];
          });
        }
        if (payload.type === "typing" && payload.thread_id === activeThreadId) {
          setTyping(payload.status === "typing");
        }
      } catch {
        // ignore
      }
    });

    socket.addEventListener("close", () => {
      socketRef.current = null;
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    });
  };

  const initThread = async () => {
    if (!open) return;
    if (loading || threadId) return;
    try {
      setLoading(true);
      const storedGuest = typeof window !== "undefined" ? window.localStorage.getItem(guestStorageKey) : "";
      const endpoint = API_BASE ? `${API_BASE}/chat/live/start` : "/chat/live/start";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: guestName || undefined,
          email: guestEmail || undefined,
          guest_id: storedGuest || undefined
        })
      });
      if (!res.ok) return;
      const data = await res.json();
      const thread = data?.thread;
      const nextThreadId = thread?.id || "";
      const nextGuestId = data?.guest_id || storedGuest || "";
      if (nextGuestId && typeof window !== "undefined") {
        window.localStorage.setItem(guestStorageKey, nextGuestId);
      }
      setThreadId(nextThreadId);
      setGuestId(nextGuestId);
      await loadMessages(nextThreadId, nextGuestId);
      connectSocket(nextThreadId, nextGuestId);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (!token && !guestName) return;
    initThread();
  }, [open, guestName, token]);

  useEffect(() => {
    if (!open) return;
    if (threadId && !socketRef.current) {
      connectSocket(threadId, guestId);
    }
  }, [open, threadId, guestId]);

  useEffect(() => {
    if (open) return;
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !threadId) return;
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      loadMessages(threadId, guestId);
    }, 6000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [open, threadId, guestId]);

  if (!open) {
    return (
      <div className="fixed bottom-6 right-6 z-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-14 w-14 rounded-full bg-accent-primary text-white shadow-lg flex items-center justify-center"
          aria-label="Open live chat"
        >
          <MessageCircle size={22} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-0 w-[360px] max-w-[calc(100vw-2rem)]">
      <div className="rounded-2xl border border-border bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-main">
          <div>
            <p className="text-sm font-semibold text-ink">Live Support</p>
            <p className="text-xs text-ink-muted">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Support is online
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (threadId) {
                try {
                  const endpoint = API_BASE ? `${API_BASE}/chat/live/close` : "/chat/live/close";
                  await fetch(endpoint, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ thread_id: threadId, guest_id: guestId || undefined })
                  });
                } catch {
                  // ignore
                }
              }
              setOpen(false);
              setThreadId("");
              setMessages([]);
            }}
            className="h-8 w-8 rounded-full border border-border text-ink-muted hover:text-ink"
            aria-label="Close live chat"
          >
            <X size={16} className="mx-auto" />
          </button>
        </div>

        <div className="px-4 py-3 bg-page">
          {!guestName && !token ? (
            <div className="rounded-xl border border-border bg-white p-3">
              <p className="text-sm font-semibold text-ink">Start as guest</p>
              <p className="text-xs text-ink-muted mt-1">
                Enter a name so we can personalize your support.
              </p>
              <div className="mt-3 space-y-2">
                <input
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="Your name"
                  className="w-full h-10 rounded-lg border border-border px-3 text-sm"
                />
                <input
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  placeholder="Email (optional)"
                  className="w-full h-10 rounded-lg border border-border px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setGuestName(guestName.trim() || "Guest");
                    initThread();
                  }}
                  className="w-full h-10 rounded-lg bg-accent-primary text-white text-sm font-semibold"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink-muted">
              Chatting as{" "}
              <span className="font-semibold text-ink">{guestName || (token ? "You" : "Guest")}</span>
            </div>
          )}
        </div>

        <div className="h-72 overflow-y-auto px-4 py-4 space-y-4 bg-white">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] ${message.outbound ? "ml-auto" : "mr-auto"}`}
            >
              <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                <span className="font-semibold text-ink">{message.outbound ? "You" : "System"}</span>
                <span>{message.time}</span>
                {message.outbound ? statusIcon(message.status) : null}
              </div>
              <div
                className={`mt-1 rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  message.outbound ? "bg-accent-primary/10 text-ink" : "bg-gray-50 text-ink"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
          {typing ? <div className="text-xs text-ink-muted">System is typing...</div> : null}
        </div>

        <div className="border-t border-border px-4 py-3 bg-white">
          <div className="flex items-center gap-2 mb-2 text-xs text-ink-muted">
            <Paperclip size={14} />
            Attachments supported: images, pdf, docx, xlsx, zip
          </div>
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={composer}
              onChange={(event) => {
                const nextValue = event.target.value;
                setComposer(nextValue);
                if (!threadId || !socketRef.current) return;
                if (socketRef.current.readyState !== WebSocket.OPEN) return;
                socketRef.current.send(
                  JSON.stringify({
                    type: "typing",
                    thread_id: threadId,
                    status: nextValue.trim() ? "typing" : "idle"
                  })
                );
                if (typingRef.current) window.clearTimeout(typingRef.current);
                typingRef.current = window.setTimeout(() => {
                  if (socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(
                      JSON.stringify({ type: "typing", thread_id: threadId, status: "idle" })
                    );
                  }
                }, 1500);
              }}
              placeholder="Type your message..."
              className="flex-1 resize-none rounded-xl border border-border px-3 py-2 text-sm"
            />
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="h-9 w-9 rounded-lg border border-border text-ink-muted hover:text-ink"
                aria-label="Emoji"
              >
                <Smile size={16} className="mx-auto" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  const text = composer.trim();
                  if (!text || !threadId) return;
                  setComposer("");
                  const endpoint = API_BASE ? `${API_BASE}/chat/live/messages` : "/chat/live/messages";
                  await fetch(endpoint, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                      thread_id: threadId,
                      content: text,
                      guest_id: guestId || undefined
                    })
                  });
                  if (socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(
                      JSON.stringify({ type: "typing", thread_id: threadId, status: "idle" })
                    );
                  }
                  loadMessages(threadId, guestId);
                }}
                className="h-9 w-9 rounded-lg bg-accent-primary text-white"
                aria-label="Send message"
              >
                <Send size={16} className="mx-auto" />
              </button>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-ink-muted">
            Messages are sent to System. A manager will respond shortly.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveChatCard;
