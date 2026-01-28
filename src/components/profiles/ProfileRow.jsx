import { Eye, Trash2 } from "lucide-react";

const statusStyles = {
  Draft: "bg-gray-100 text-ink-muted",
  Applied: "bg-accent-primary/10 text-accent-primary",
  Applying: "bg-accent-primary/10 text-accent-primary",
  Interview: "bg-green-50 text-green-600",
  Interviewing: "bg-green-50 text-green-600",
  Offer: "bg-amber-50 text-amber-700",
  Closed: "bg-gray-100 text-ink-muted",
  Idle: "bg-gray-100 text-ink-muted"
};

const ProfileRow = ({ profile, onOpen, onTemplateClick, onMore, gridTemplate }) => {
  const {
    name,
    subtitle,
    templateTitle,
    email,
    emailConnected,
    bidder,
    unreadCount,
    nextInterview,
    status
  } = profile;

  const cellClass = "h-full px-2 border-r border-border flex items-center box-border min-w-0";

  const emailNode = emailConnected ? (
    <div className="flex flex-col">
      <span className="text-sm font-medium text-ink">{email ?? "—"}</span>
      <span className="text-[12px] text-green-600 font-semibold">Connected</span>
    </div>
  ) : (
    <span className="text-[12px] px-2 py-1 rounded-md bg-gray-100 text-ink-muted border border-border-soft">
      Not connected
    </span>
  );

  return (
    <button type="button" onClick={onOpen} className="group w-full text-left">
      <div
        className="relative grid items-stretch gap-0 px-4 py-3 bg-white hover:bg-[#F7FAFF] transition-colors border-b border-border"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div className={`${cellClass} gap-3`}>
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-ink">{name}</span>
            <span className="text-sm text-ink-muted">{subtitle}</span>
          </div>
        </div>

        <div className={`${cellClass} justify-start gap-2`}>
          {emailNode}
        </div>

        <div className={`${cellClass} text-sm text-ink`}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTemplateClick?.(e.currentTarget.getBoundingClientRect());
            }}
            className="text-left font-medium text-accent-primary hover:underline"
          >
            {templateTitle || "—"}
          </button>
        </div>

        <div className={`${cellClass} text-sm text-ink`}>
          {bidder ? <span className="font-medium">{bidder}</span> : <span className="text-ink-muted">Unassigned</span>}
        </div>

        <div className={`${cellClass} text-sm text-ink justify-start`}>
          {unreadCount > 0 ? (
            <span className="px-2 py-1 rounded-full bg-accent-primary/10 text-accent-primary font-semibold text-[12px]">
              {unreadCount} unread
            </span>
          ) : (
            "—"
          )}
        </div>

        <div className={`${cellClass} text-sm text-ink justify-start`}>
          {nextInterview ?? "—"}
        </div>

        <div className={`${cellClass} text-sm justify-start`}>
          <span
            className={`px-2 py-1 rounded-full text-[12px] font-semibold ${
              statusStyles[status] ?? "bg-gray-100 text-ink-muted"
            }`}
          >
            {status}
          </span>
        </div>

        <div className="flex justify-end px-2 h-full items-center box-border min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Open profile"
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
              className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-gray-100"
            >
              <Eye size={18} />
            </button>
            <button
              type="button"
              aria-label="Delete profile"
              onClick={(e) => {
                e.stopPropagation();
                onMore();
              }}
              className="p-1.5 rounded-md text-ink-muted hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </button>
  );
};

export default ProfileRow;
