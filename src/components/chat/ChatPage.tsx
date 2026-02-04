import { useMemo, useState } from "react";
import {
  AtSign,
  Bold,
  Code,
  Code2,
  Italic,
  Link,
  List,
  ListOrdered,
  Mic,
  MoreHorizontal,
  Quote,
  Search,
  Smile,
  Strikethrough,
  Underline,
  Video,
  Plus,
  Send
} from "lucide-react";

const ChatPage = () => {
  const threads = useMemo(
    () => [
      {
        id: "t1",
        name: "Eugene",
        role: "Recruiter",
        status: "Online",
        lastMessage: "2m ago",
        unread: true
      },
      {
        id: "t2",
        name: "Alex Chen",
        role: "Hiring Manager",
        status: "Yesterday",
        lastMessage: "Yesterday",
        unread: false
      },
      {
        id: "t3",
        name: "HR Bot",
        role: "System",
        status: "3 days ago",
        lastMessage: "3 days ago",
        unread: false
      }
    ],
    []
  );

  const messages = useMemo(
    () => ({
      t1: [
        {
          id: "m1",
          from: "Eugene",
          time: "10:41 AM",
          text: "Hi Robin, are you available for an interview tomorrow?",
          outbound: false
        },
        {
          id: "m2",
          from: "You",
          time: "10:43 AM",
          text: "Yes, tomorrow works great. What time works best?",
          outbound: true
        }
      ],
      t2: [
        {
          id: "m3",
          from: "Alex Chen",
          time: "Yesterday",
          text: "Can you share the latest resume draft?",
          outbound: false
        }
      ],
      t3: [
        {
          id: "m4",
          from: "HR Bot",
          time: "3 days ago",
          text: "Reminder: please update the candidate profile status.",
          outbound: false
        }
      ]
    }),
    []
  );

  const [activeThreadId, setActiveThreadId] = useState(threads[0]?.id);
  const activeThread = threads.find((thread) => thread.id === activeThreadId);
  const activeMessages = messages[activeThreadId] || [];

  return (
    <main className="min-h-[calc(100vh-64px)] px-4 py-6">
      <div className="mx-auto flex flex-col gap-6">
        <div className="grid grid-cols-[260px_1fr] gap-6">
          <aside className="border border-border bg-white p-4  shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Direct Messages
            </div>
            <div className="mt-4 space-y-2">
              {threads.map((thread) => {
                const isActive = thread.id === activeThreadId;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setActiveThreadId(thread.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left transition-colors ${
                      isActive
                        ? "bg-accent-primary/10 text-ink"
                        : "text-ink-muted hover:text-ink hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-ink">
                          {thread.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div>
                          <div
                            className={`text-sm ${
                              thread.unread ? "font-semibold text-ink" : "text-ink"
                            }`}
                          >
                            {thread.name}
                          </div>
                          <div className="text-xs text-ink-muted">
                            {thread.role} � {thread.lastMessage}
                          </div>
                        </div>
                      </div>
                      {thread.unread ? (
                        <span className="h-2 w-2 rounded-full bg-accent-primary" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="mt-4 w-full rounded-xl border border-border bg-gray-50 px-3 py-2 text-sm font-semibold text-accent-primary hover:bg-white"
            >
              + New message
            </button>
          </aside>

          <section className="flex flex-col gap-4 border border-border bg-white p-4 shadow-sm">
            {activeThread ? (
              <>
                <div className="flex items-center justify-between rounded-2xl border border-border bg-white px-5 py-4">
                  <div>
                    <h1 className="text-lg font-semibold text-ink">{activeThread.name}</h1>
                    <p className="text-sm text-ink-muted">
                      {activeThread.role} � {activeThread.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="h-9 w-9 rounded-lg border border-border text-ink-muted hover:text-ink"
                      aria-label="Search in conversation"
                    >
                      <Search size={16} className="mx-auto" />
                    </button>
                    <button
                      type="button"
                      className="h-9 w-9 rounded-lg border border-border text-ink-muted hover:text-ink"
                      aria-label="More actions"
                    >
                      <MoreHorizontal size={16} className="mx-auto" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 rounded-2xl border border-border bg-white p-6 space-y-6">
                  {activeMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[720px] ${message.outbound ? "ml-auto" : ""}`}
                    >
                      <div className="flex items-center gap-2 text-xs text-ink-muted">
                        <span className="font-semibold text-ink">
                          {message.from}
                        </span>
                        <span>{message.time}</span>
                      </div>
                      <div
                        className={`mt-2 rounded-xl px-4 py-3 text-sm leading-relaxed ${
                          message.outbound
                            ? "bg-accent-primary/10 text-ink"
                            : "bg-gray-50 text-ink"
                        }`}
                      >
                        {message.text}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
                    <button type="button" className="text-ink-muted hover:text-ink">
                      <Bold size={16} />
                    </button>
                    <button type="button" className="text-ink-muted hover:text-ink">
                      <Italic size={16} />
                    </button>
                    <button type="button" className="text-ink-muted hover:text-ink">
                      <Underline size={16} />
                    </button>
                    <button type="button" className="text-ink-muted hover:text-ink">
                      <Strikethrough size={16} />
                    </button>
                    <span className="h-5 w-px bg-border" />
                    <button type="button" className="text-ink-muted hover:text-ink">
                      <Link size={16} />
                    </button>
                    <button type="button" className="text-ink-muted hover:text-ink">
                      <ListOrdered size={16} />
                    </button>
                    <button type="button" className="text-ink-muted hover:text-ink">
                      <List size={16} />
                    </button>
                    <button type="button" className="text-ink-muted hover:text-ink">
                      <Quote size={16} />
                    </button>
                    <button type="button" className="text-ink-muted hover:text-ink">
                      <Code2 size={16} />
                    </button>
                    <button type="button" className="text-ink-muted hover:text-ink">
                      <Code size={16} />
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    placeholder={`Message ${activeThread.name}`}
                    className="w-full resize-none border-none px-0 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-ink-muted">
                    <div className="flex flex-wrap items-center gap-3">
                      <button type="button" className="text-ink-muted hover:text-ink">
                        <Plus size={18} />
                      </button>
                      <button type="button" className="text-ink-muted hover:text-ink">
                        <span className="text-sm font-semibold">Aa</span>
                      </button>
                      <button type="button" className="text-ink-muted hover:text-ink">
                        <Smile size={18} />
                      </button>
                      <button type="button" className="text-ink-muted hover:text-ink">
                        <AtSign size={18} />
                      </button>
                      <button type="button" className="text-ink-muted hover:text-ink">
                        <Video size={18} />
                      </button>
                      <button type="button" className="text-ink-muted hover:text-ink">
                        <Mic size={18} />
                      </button>
                      <button type="button" className="text-ink-muted hover:text-ink">
                        <span className="text-sm font-semibold">Notes</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-full bg-accent-primary px-4 py-2 text-sm font-semibold text-white"
                    >
                      <Send size={16} />
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white p-10 text-center">
                <div className="text-lg font-semibold text-ink">Select a conversation</div>
                <p className="mt-2 text-sm text-ink-muted">
                  Choose a direct message to start messaging.
                </p>
                <button
                  type="button"
                  className="mt-6 rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Start a new message
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default ChatPage;