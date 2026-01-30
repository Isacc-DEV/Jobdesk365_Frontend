import { useMemo, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CalendarPage = () => {
  const calendars = useMemo(
    () => [
      { id: "cal-1", email: "james@outlook.com", color: "bg-blue-500", active: true },
      { id: "cal-2", email: "robin@gmail.com", color: "bg-teal-500", active: true },
      { id: "cal-3", email: "hr@company.com", color: "bg-purple-500", active: true }
    ],
    []
  );

  const [activeView, setActiveView] = useState("Month");

  const days = useMemo(() => Array.from({ length: 35 }, (_, index) => index + 1), []);

  const events = useMemo(
    () => [
      {
        id: "ev-1",
        day: 9,
        title: "Interview",
        time: "10:00 – 11:00",
        tone: "bg-blue-100 text-blue-700"
      },
      {
        id: "ev-2",
        day: 12,
        title: "Team Sync",
        time: "14:00 – 15:00",
        tone: "bg-cyan-100 text-cyan-700"
      },
      {
        id: "ev-3",
        day: 17,
        title: "HR Call",
        time: "16:30 – 17:00",
        tone: "bg-purple-100 text-purple-700"
      }
    ],
    []
  );

  const views = ["Month", "Week", "Day"];

  return (
    <main className="bg-main min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
      <div className="mx-auto flex flex-col gap-6">
        <div className="grid grid-cols-[260px_1fr] gap-6">
          <aside className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Calendars
            </div>
            <div className="mt-4 space-y-2">
              {calendars.map((calendar) => (
                <div
                  key={calendar.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-ink-muted bg-gray-50"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${calendar.color}`} />
                  {calendar.email}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="mt-4 w-full rounded-xl border border-border bg-gray-50 px-3 py-2 text-sm font-semibold text-accent-primary hover:bg-white"
            >
              + Connect calendar
            </button>
          </aside>

          <section className="flex flex-col gap-4">
            <header>
              <h1 className="text-2xl font-semibold text-ink">Calendar</h1>
              <p className="text-sm text-ink-muted">
                Multiple calendars · Color-coded events
              </p>
            </header>

            <div className="flex flex-wrap items-center gap-2">
              {views.map((view) => {
                const isActive = activeView === view;
                return (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setActiveView(view)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-accent-primary text-white"
                        : "bg-gray-100 text-ink-muted hover:text-ink"
                    }`}
                  >
                    {view}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-border bg-white p-5">
              <div className="flex items-center justify-between mb-4 text-xs text-ink-muted">
                <span className="flex items-center gap-2">
                  <Calendar size={14} />
                  March 2026
                </span>
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
                >
                  Select month
                  <ChevronDown size={14} />
                </button>
              </div>

              <div className="grid grid-cols-7 text-xs text-ink-muted mb-3">
                {weekDays.map((day) => (
                  <div key={day} className="px-2 py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-3">
                {days.map((day) => {
                  const dayEvents = events.filter((event) => event.day === day);
                  return (
                    <div
                      key={day}
                      className="min-h-[90px] rounded-xl border border-border/60 bg-gray-50/40 px-2 py-2"
                    >
                      <div className="text-xs text-ink-muted">{day <= 31 ? day : ""}</div>
                      <div className="mt-2 space-y-2">
                        {dayEvents.map((event) => (
                          <div
                            key={event.id}
                            className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${event.tone}`}
                          >
                            <div>{event.title}</div>
                            <div className="text-[11px] font-medium">{event.time}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default CalendarPage;