import { useEffect, useMemo, useRef, useState } from "react";
import {
  AtSign,
  Bold,
  CheckCircle2,
  Clock,
  Code,
  Hash,
  Heart,
  Italic,
  Link2,
  List,
  ListOrdered,
  Mic,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Shield,
  Smile,
  Strikethrough,
  ThumbsUp,
  Underline,
  Users
} from "lucide-react";
import { API_BASE, TOKEN_KEY } from "../../config";
import { useUser } from "../../hooks/useUser";
import LiveChatCard from "./LiveChatCard";

type ChatThread = {
  id: string;
  user_id?: string | null;
  guest_id?: string | null;
  user_type: "client" | "guest" | string;
  display_name?: string | null;
  status: "open" | "assigned" | "waiting" | "closed" | string;
  assigned_manager_id?: string | null;
  watchers?: string[] | null;
  last_activity_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  closed_at?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number | string | null;
};

type ChatUser = {
  id: string;
  email?: string | null;
  username?: string | null;
  display_name?: string | null;
  photo_link?: string | null;
  roles?: string[] | null;
};

type ChatMessage = {
  id: string;
  thread_id: string;
  sender_type: "system" | "internal" | "external" | string;
  sender_id?: string | null;
  content: string;
  created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
  reactions?: ReactionItem[];
  attachments?: any[];
  reads?: Array<{ user_id: string; read_at: string }>;
};

type ChatChannel = {
  id: string;
  key: string;
  name: string;
  position?: number | null;
  is_support?: boolean | null;
};

type ChatChannelMessage = {
  id: string;
  channel_id: string;
  sender_id?: string | null;
  content: string;
  created_at: string;
  reactions?: ReactionItem[];
  attachments?: any[];
};

type ChatDmThread = {
  id: string;
  user_a_id: string;
  user_b_id: string;
};

type ChatDmMessage = {
  id: string;
  thread_id: string;
  sender_id?: string | null;
  content: string;
  created_at: string;
  reactions?: ReactionItem[];
  attachments?: any[];
};

type ReactionItem = {
  id?: string;
  user_id?: string | null;
  emoji?: string | null;
};

type MentionOption = {
  id: string;
  label: string;
  secondaryLabel?: string | null;
  avatarUrl?: string | null;
  status?: string | null;
  mention: string;
};

type PresenceItem = {
  id: string;
  type: string;
  status: string;
  display_name?: string;
  roles?: string[];
  last_seen_at: number;
};

const statusDot = (status: string) => {
  if (status === "online") return "bg-emerald-500";
  if (status === "idle") return "bg-amber-400";
  if (status === "responding") return "bg-sky-500";
  return "bg-gray-300";
};

const threadStatusClass = (status: string) => {
  if (status === "open") return "bg-emerald-50 text-emerald-700";
  if (status === "assigned") return "bg-sky-50 text-sky-700";
  if (status === "waiting") return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-ink-muted";
};

const normalizeArray = (value: unknown): string[] => (Array.isArray(value) ? value : []);

const formatTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const delta = Date.now() - date.getTime();
  if (delta < 60000) return `${Math.max(1, Math.floor(delta / 1000))}s ago`;
  if (delta < 3600000) return `${Math.floor(delta / 60000)}m ago`;
  if (delta < 86400000) return `${Math.floor(delta / 3600000)}h ago`;
  return `${Math.floor(delta / 86400000)}d ago`;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const sanitizeUrl = (value: string) => {
  const decoded = decodeHtmlEntities(value.trim());
  if (!decoded) return "";
  if (decoded.startsWith("mailto:")) return decoded;
  try {
    const url = new URL(decoded, "https://jobdesk.local");
    if (url.protocol === "http:" || url.protocol === "https:") {
      return decoded;
    }
    return "";
  } catch {
    return "";
  }
};

const formatMessageContent = (value: string) => {
  const underlineOpen = "__JD_U_OPEN__";
  const underlineClose = "__JD_U_CLOSE__";
  const source = value
    .replace(/<u>/g, underlineOpen)
    .replace(/<\/u>/g, underlineClose);
  let html = escapeHtml(source);
  html = html.replace(new RegExp(underlineOpen, "g"), "<u>");
  html = html.replace(new RegExp(underlineClose, "g"), "</u>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    const safeUrl = sanitizeUrl(url);
    if (!safeUrl) return text;
    return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer">${text}</a>`;
  });
  html = html.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");
  html = html.replace(/`([^`]+?)`/g, "<code>$1</code>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");
  html = html.replace(/\n/g, "<br />");
  return html;
};

const formatFileSize = (value?: number | null) => {
  if (!value && value !== 0) return "";
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
};

const getAttachmentLabel = (attachment: any) =>
  attachment?.name || attachment?.file_url || "Attachment";

const getAttachmentExtension = (attachment: any) => {
  const label = String(getAttachmentLabel(attachment) || "");
  const clean = label.split(/[?#]/)[0];
  const dotIndex = clean.lastIndexOf(".");
  if (dotIndex === -1) return "FILE";
  const ext = clean.slice(dotIndex + 1).replace(/[^a-zA-Z0-9]/g, "").slice(0, 4);
  return ext ? ext.toUpperCase() : "FILE";
};

const AttachmentList = ({ attachments }: { attachments?: any[] }) => {
  if (!Array.isArray(attachments) || !attachments.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment: any, index: number) => {
        const label = getAttachmentLabel(attachment);
        const ext = getAttachmentExtension(attachment);
        const size = formatFileSize(attachment?.size_bytes);
        const meta = [ext !== "FILE" ? ext : null, size].filter(Boolean).join(" • ");
        return (
          <a
            key={attachment?.id || attachment?.file_url || `${label}-${index}`}
            href={attachment?.file_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border bg-page px-3 py-2 text-xs text-ink hover:bg-white"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-white text-[11px] font-semibold text-slate-600">
              {ext}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{label}</p>
              {meta ? <p className="text-[11px] text-ink-muted">{meta}</p> : null}
            </div>
          </a>
        );
      })}
    </div>
  );
};

const getDisplayName = (user?: ChatUser | null) =>
  user?.display_name || user?.username || user?.email || "User";

const getUserLabels = ({
  username,
  displayName,
  email,
  fallback = "User"
}: {
  username?: string | null;
  displayName?: string | null;
  email?: string | null;
  fallback?: string;
}) => {
  const cleanUsername = username?.trim() || "";
  const cleanDisplayName = displayName?.trim() || "";
  const cleanEmail = email?.trim() || "";
  const primaryLabel = cleanUsername || cleanDisplayName || cleanEmail || fallback;
  const secondaryLabel =
    cleanUsername && cleanDisplayName && cleanDisplayName !== cleanUsername
      ? cleanDisplayName
      : "";
  return { primaryLabel, secondaryLabel };
};

const getInitials = (value: string) => {
  const cleaned = value.replace(/[^a-zA-Z0-9]+/g, " ").trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
};

const reactionOptions = [
  { key: "thumbs_up", label: "Like", icon: ThumbsUp, style: "text-sky-600 bg-sky-50" },
  { key: "heart", label: "Heart", icon: Heart, style: "text-rose-500 bg-rose-50" },
  { key: "smile", label: "Smile", emoji: "😊", style: "text-amber-600 bg-amber-50" },
  { key: "clap", label: "Clap", emoji: "👏", style: "text-emerald-600 bg-emerald-50" },
  { key: "party", label: "Party", emoji: "🎉", style: "text-fuchsia-600 bg-fuchsia-50" },
  { key: "fire", label: "Fire", emoji: "🔥", style: "text-orange-600 bg-orange-50" },
  { key: "thinking", label: "Thinking", emoji: "🤔", style: "text-slate-600 bg-slate-100" },
  { key: "eyes", label: "Eyes", emoji: "👀", style: "text-indigo-600 bg-indigo-50" }
];

const emojiPickerOptions = [
  "😀",
  "😅",
  "😂",
  "😍",
  "😎",
  "😇",
  "🤔",
  "😮",
  "😢",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🙏",
  "🎉",
  "🔥",
  "💯",
  "✅",
  "❗",
  "❓",
  "❤️",
  "✨",
  "💡"
];

const summarizeReactions = (reactions?: ReactionItem[]) => {
  const counts = new Map<string, number>();
  (reactions || []).forEach((reaction) => {
    const key = String(reaction?.emoji || "").trim();
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries()).map(([key, count]) => ({ key, count }));
};

const ReactionBar = ({
  reactions,
  onReact,
  showOnHover = true,
  currentUserId
}: {
  reactions?: ReactionItem[];
  onReact: (emoji: string, hasReacted: boolean) => void;
  showOnHover?: boolean;
  currentUserId?: string | null;
}) => {
  const summary = summarizeReactions(reactions);
  const userReactionSet = useMemo(() => {
    if (!currentUserId) return new Set<string>();
    const set = new Set<string>();
    (reactions || []).forEach((reaction) => {
      if (reaction.user_id !== currentUserId) return;
      const key = String(reaction?.emoji || "").trim();
      if (!key) return;
      set.add(key);
    });
    return set;
  }, [reactions, currentUserId]);

  const availableOptions = reactionOptions.filter((option) => !userReactionSet.has(option.key));
  if (!summary.length && !availableOptions.length) return null;
  const renderReactionIcon = (key: string) => {
    const option = reactionOptions.find((item) => item.key === key);
    if (option) {
      if (option.icon) {
        const Icon = option.icon;
        return <Icon size={12} className="text-current" />;
      }
      if (option.emoji) {
        return <span className="text-xs">{option.emoji}</span>;
      }
    }
    return <span className="text-[10px] text-current">{key}</span>;
  };
  const hasSummary = summary.length > 0;
  const wrapperClass = hasSummary
    ? "mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted"
    : showOnHover
    ? "mt-2 hidden flex-wrap items-center gap-2 text-xs text-ink-muted group-hover:flex"
    : "mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted";
  const buttonsClass = showOnHover
    ? "hidden items-center gap-1 group-hover:flex"
    : "flex items-center gap-1";

  return (
    <div className={wrapperClass}>
      {summary.map((item) => {
        const userReacted = userReactionSet.has(item.key);
        const summaryClass = `inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 ${
          reactionOptions.find((option) => option.key === item.key)?.style || "bg-page"
        }`;
        return userReacted ? (
          <button
            key={item.key}
            type="button"
            onClick={() => onReact(item.key, true)}
            className={`${summaryClass} cursor-pointer`}
            aria-label={`Remove ${item.key}`}
          >
            {renderReactionIcon(item.key)}
            <span>{item.count}</span>
          </button>
        ) : (
          <span key={item.key} className={summaryClass}>
            {renderReactionIcon(item.key)}
            <span>{item.count}</span>
          </span>
        );
      })}
      {availableOptions.length ? (
        <div className={buttonsClass}>
          {availableOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onReact(option.key, false)}
                className={`flex h-6 w-6 items-center justify-center rounded-full border border-border ${option.style}`}
                aria-label={option.label}
              >
                {Icon ? <Icon size={12} /> : <span className="text-xs">{option.emoji}</span>}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

type MessageInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend?: () => void;
  canSend?: boolean;
  placeholder: string;
  pendingFiles?: File[];
  onRemoveFile?: (index: number) => void;
  onAttachClick?: () => void;
  mentionOptions?: MentionOption[];
  showModeToggle?: boolean;
  mode?: "external" | "internal";
  onModeChange?: (mode: "external" | "internal") => void;
  helperText?: string;
  disabled?: boolean;
};

const MessageInput = ({
  value,
  onChange,
  onSend,
  canSend = false,
  placeholder,
  pendingFiles = [],
  onRemoveFile,
  onAttachClick,
  mentionOptions = [],
  showModeToggle = false,
  mode = "external",
  onModeChange,
  helperText,
  disabled = false
}: MessageInputProps) => {
  const toolbarButton =
    "flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-slate-50 hover:text-ink";
  const iconButton =
    "flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-slate-50 hover:text-ink";
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hasValue = value.trim().length > 0;
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleClick = (event: MouseEvent) => {
      if (!pickerRef.current) return;
      if (pickerRef.current.contains(event.target as Node)) return;
      setShowMentionPicker(false);
      setShowEmojiPicker(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  const applySelection = (
    nextValue: string,
    selectionStart: number,
    selectionEnd?: number
  ) => {
    onChange(nextValue);
    window.requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const end = selectionEnd ?? selectionStart;
      el.setSelectionRange(selectionStart, end);
    });
  };

  const getSelection = () => {
    const el = textareaRef.current;
    const currentValue = value ?? "";
    const start = el?.selectionStart ?? currentValue.length;
    const end = el?.selectionEnd ?? start;
    return {
      currentValue,
      start,
      end,
      before: currentValue.slice(0, start),
      selected: currentValue.slice(start, end),
      after: currentValue.slice(end)
    };
  };

  const replaceSelection = (replacement: string, cursorOffset = replacement.length) => {
    if (disabled) return;
    const { before, after, start } = getSelection();
    const nextValue = `${before}${replacement}${after}`;
    applySelection(nextValue, start + cursorOffset);
  };

  const wrapSelection = (prefix: string, suffix = prefix) => {
    if (disabled) return;
    const { before, after, selected, start, end } = getSelection();
    if (start === end) {
      const nextValue = `${before}${prefix}${suffix}${after}`;
      applySelection(nextValue, start + prefix.length);
      return;
    }
    const nextValue = `${before}${prefix}${selected}${suffix}${after}`;
    applySelection(nextValue, start + prefix.length, start + prefix.length + selected.length);
  };

  const prefixLines = (prefix: string, ordered = false) => {
    if (disabled) return;
    const { currentValue, start, end } = getSelection();
    const lineStart = currentValue.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = currentValue.indexOf("\n", end);
    const sliceEnd = lineEnd === -1 ? currentValue.length : lineEnd;
    const segment = currentValue.slice(lineStart, sliceEnd);
    const lines = segment.split("\n");
    const nextLines = lines.map((line, index) => {
      const linePrefix = ordered ? `${index + 1}. ` : prefix;
      return `${linePrefix}${line}`;
    });
    const joined = nextLines.join("\n");
    const nextValue = `${currentValue.slice(0, lineStart)}${joined}${currentValue.slice(sliceEnd)}`;
    applySelection(nextValue, lineStart, lineStart + joined.length);
  };

  const handleLink = () => {
    if (disabled) return;
    if (typeof window === "undefined") return;
    const url = window.prompt("Enter URL");
    if (!url) return;
    const { selected } = getSelection();
    const label = selected || "link";
    replaceSelection(`[${label}](${url})`, `[${label}](${url})`.length);
  };

  const handleCode = () => {
    const { selected } = getSelection();
    if (selected.includes("\n")) {
      wrapSelection("```\n", "\n```");
      return;
    }
    wrapSelection("`", "`");
  };

  const handleAttach = () => {
    if (disabled) return;
    if (onAttachClick) {
      onAttachClick();
      return;
    }
  };

  const handleMention = () => {
    if (disabled) return;
    setShowEmojiPicker(false);
    setShowMentionPicker((prev) => !prev);
  };

  const handleEmoji = () => {
    if (disabled) return;
    setShowMentionPicker(false);
    setShowEmojiPicker((prev) => !prev);
  };

  const handleMic = () => {
    replaceSelection("🎤 ");
  };

  const handleMentionSelect = (option: MentionOption) => {
    replaceSelection(`@${option.mention} `, option.mention.length + 2);
    setShowMentionPicker(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    replaceSelection(emoji);
    setShowEmojiPicker(false);
  };
  return (
    <div className="border-t border-border px-6 py-4">
      {showModeToggle && onModeChange ? (
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => onModeChange("external")}
            disabled={disabled}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              mode === "external"
                ? "bg-accent-primary text-white"
                : "bg-gray-100 text-ink-muted"
            }`}
          >
            External reply as System
          </button>
          <button
            type="button"
            onClick={() => onModeChange("internal")}
            disabled={disabled}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              mode === "internal" ? "bg-slate-800 text-white" : "bg-gray-100 text-ink-muted"
            }`}
          >
            Internal note
          </button>
        </div>
      ) : null}
      <div className={`rounded-2xl border border-border bg-white ${disabled ? "opacity-70" : ""}`}>
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => wrapSelection("**", "**")}
              className={toolbarButton}
              disabled={disabled}
              aria-label="Bold"
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              onClick={() => wrapSelection("_", "_")}
              className={toolbarButton}
              disabled={disabled}
              aria-label="Italic"
            >
              <Italic size={14} />
            </button>
            <button
              type="button"
              onClick={() => wrapSelection("<u>", "</u>")}
              className={toolbarButton}
              disabled={disabled}
              aria-label="Underline"
            >
              <Underline size={14} />
            </button>
            <button
              type="button"
              onClick={() => wrapSelection("~~", "~~")}
              className={toolbarButton}
              disabled={disabled}
              aria-label="Strikethrough"
            >
              <Strikethrough size={14} />
            </button>
            <span className="mx-1 h-4 w-px bg-border" />
            <button
              type="button"
              onClick={handleLink}
              className={toolbarButton}
              disabled={disabled}
              aria-label="Link"
            >
              <Link2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => prefixLines("- ")}
              className={toolbarButton}
              disabled={disabled}
              aria-label="List"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => prefixLines("1. ", true)}
              className={toolbarButton}
              disabled={disabled}
              aria-label="Ordered list"
            >
              <ListOrdered size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={handleCode}
            className={toolbarButton}
            disabled={disabled}
            aria-label="Code"
          >
            <Code size={14} />
          </button>
        </div>
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={3}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return;
              if ((event.nativeEvent as KeyboardEvent).isComposing) return;
              if (!onSend || !canSend) return;
              event.preventDefault();
              onSend();
            }}
            placeholder=""
            disabled={disabled}
            className="relative z-10 w-full resize-none border-none bg-transparent px-3 py-3 text-[15px] font-chat font-normal leading-relaxed text-transparent caret-ink placeholder:text-transparent selection:bg-sky-200/60 selection:text-transparent focus:outline-none"
          />
          <div
            className="pointer-events-none absolute inset-0 px-3 py-3 text-[15px] font-chat font-normal leading-relaxed whitespace-pre-wrap break-words [&_strong]:font-semibold [&_em]:italic [&_del]:line-through [&_u]:underline [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px] [&_code]:text-slate-700 [&_a]:text-sky-600 [&_a]:underline"
            aria-hidden="true"
            dangerouslySetInnerHTML={{
              __html: hasValue ? formatMessageContent(value) : ""
            }}
          />
          {!hasValue ? (
            <div className="pointer-events-none absolute left-3 top-3 text-[15px] font-chat text-ink-muted">
              {placeholder}
            </div>
          ) : null}
        </div>
        {pendingFiles.length ? (
          <div className="flex flex-wrap gap-2 px-3 pb-2">
            {pendingFiles.map((file, index) => (
              <span
                key={`${file.name}-${index}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-page px-3 py-1 text-xs text-ink"
              >
                {file.name}
                {onRemoveFile ? (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(index)}
                    className="text-ink-muted hover:text-ink"
                    disabled={disabled}
                  >
                    x
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        ) : null}
        <div
          ref={pickerRef}
          className="relative flex items-center justify-between border-t border-border px-3 py-2"
        >
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleAttach}
              className={iconButton}
              disabled={disabled || !onAttachClick}
              aria-label="Attach"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              onClick={handleMention}
              className={iconButton}
              disabled={disabled}
              aria-label="Mention"
            >
              <AtSign size={16} />
            </button>
            <button
              type="button"
              onClick={handleEmoji}
              className={iconButton}
              disabled={disabled}
              aria-label="Emoji"
            >
              <Smile size={16} />
            </button>
            <button
              type="button"
              onClick={handleMic}
              className={iconButton}
              disabled={disabled}
              aria-label="Voice"
            >
              <Mic size={16} />
            </button>
          </div>
          <div className="absolute left-3 bottom-12 z-20">
            {showMentionPicker ? (
              <div className="w-72 rounded-xl border border-border bg-white shadow-soft">
                <div className="max-h-64 overflow-y-auto py-1">
                  {mentionOptions.length ? (
                    mentionOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleMentionSelect(option)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative h-8 w-8 shrink-0">
                            {option.avatarUrl ? (
                              <img
                                src={option.avatarUrl}
                                alt={option.label}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                                {getInitials(option.label)}
                              </div>
                            )}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${statusDot(
                                option.status || "offline"
                              )}`}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-ink">{option.label}</p>
                            {option.secondaryLabel ? (
                              <p className="text-xs text-ink-muted">{option.secondaryLabel}</p>
                            ) : null}
                          </div>
                        </div>
                        <span className="text-xs text-ink-muted">@{option.mention}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-ink-muted">No users found.</div>
                  )}
                </div>
              </div>
            ) : null}
            {showEmojiPicker ? (
              <div className="mt-2 w-64 rounded-xl border border-border bg-white shadow-soft">
                <div className="grid grid-cols-8 gap-1 p-2">
                  {emojiPickerOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-slate-50"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onSend?.()}
            disabled={disabled || !canSend || !onSend}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-primary text-white disabled:opacity-50"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
      {helperText ? <p className="mt-2 text-xs text-ink-muted">{helperText}</p> : null}
    </div>
  );
};

const ChatPage = () => {
  const { user, loading } = useUser();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isEmployee = roles.some((role) => role === "admin" || role === "manager" || role === "worker");
  const isManager = roles.some((role) => role === "admin" || role === "manager");
  const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;

  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [channelMessages, setChannelMessages] = useState<ChatChannelMessage[]>([]);
  const [dmMessages, setDmMessages] = useState<ChatDmMessage[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(null);
  const [activeDmThreadId, setActiveDmThreadId] = useState<string | null>(null);
  const [composerMode, setComposerMode] = useState<"external" | "internal">("external");
  const [composer, setComposer] = useState("");
  const [channelComposer, setChannelComposer] = useState("");
  const [dmComposer, setDmComposer] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [channelFiles, setChannelFiles] = useState<File[]>([]);
  const [dmFiles, setDmFiles] = useState<File[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingChannelMessages, setLoadingChannelMessages] = useState(false);
  const [loadingDmMessages, setLoadingDmMessages] = useState(false);
  const [error, setError] = useState("");
  const [threadTyping, setThreadTyping] = useState<Record<string, boolean>>({});
  const [presence, setPresence] = useState<Record<string, PresenceItem>>({});

  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const typingRef = useRef<number | null>(null);
  const activeThreadRef = useRef<string | null>(null);
  const activeChannelRef = useRef<string | null>(null);
  const activeDmThreadRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const channelFileInputRef = useRef<HTMLInputElement | null>(null);
  const dmFileInputRef = useRef<HTMLInputElement | null>(null);
  const userSearchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    activeThreadRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    activeDmThreadRef.current = activeDmThreadId;
  }, [activeDmThreadId]);

  const buildUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const supportUnread = threads.reduce((sum, thread) => {
    const count = Number(thread.unread_count || 0);
    return sum + (Number.isFinite(count) ? count : 0);
  }, 0);

  const supportChannelId = useMemo(
    () => channels.find((channel) => channel.is_support)?.id || "",
    [channels]
  );

  useEffect(() => {
    const selected = channels.find((channel) => channel.id === activeChannelId);
    activeChannelRef.current = selected?.id || null;
  }, [channels, activeChannelId]);

  const channelsWithUnread = useMemo(
    () =>
      channels.map((channel) => ({
        ...channel,
        unread: channel.id === supportChannelId ? supportUnread : 0
      })),
    [channels, supportChannelId, supportUnread]
  );

  const userMap = useMemo(() => new Map(users.map((item) => [item.id, item])), [users]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) || null,
    [threads, activeThreadId]
  );

  const openThreads = useMemo(() => {
    const items = threads.filter((thread) => thread.status !== "closed");
    return items.sort((a, b) => {
      const aTime = new Date(a.last_activity_at || a.updated_at || 0).getTime();
      const bTime = new Date(b.last_activity_at || b.updated_at || 0).getTime();
      return bTime - aTime;
    });
  }, [threads]);

  useEffect(() => {
    if (!activeThread) return;
    if (activeThread.status === "closed") {
      setActiveThreadId(null);
      return;
    }
    if (!activeThread.assigned_manager_id) return;
    if (activeThread.assigned_manager_id === user?.id) return;
    setActiveThreadId(null);
  }, [activeThread?.assigned_manager_id, activeThread?.id, activeThread?.status, user?.id]);

  const activeMessages = messages;

  const watcherNames = useMemo(() => {
    const ids = normalizeArray(activeThread?.watchers);
    if (!ids.length) return "None";
    return ids
      .map((id) => getDisplayName(userMap.get(id)))
      .filter(Boolean)
      .join(", ");
  }, [activeThread?.watchers, userMap]);

  const assignedManagerName = useMemo(() => {
    if (!activeThread?.assigned_manager_id) return "Unassigned";
    return getDisplayName(userMap.get(activeThread.assigned_manager_id));
  }, [activeThread?.assigned_manager_id, userMap]);

  const handleComposerChange = (nextValue: string) => {
    setComposer(nextValue);
    if (composerMode !== "external") return;
    if (!socketRef.current || !activeThreadId) return;
    if (socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(
      JSON.stringify({
        type: "typing",
        thread_id: activeThreadId,
        status: nextValue.trim() ? "typing" : "idle"
      })
    );
    if (typingRef.current) window.clearTimeout(typingRef.current);
    typingRef.current = window.setTimeout(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "typing",
            thread_id: activeThreadId,
            status: "idle"
          })
        );
      }
    }, 1500);
  };
  const employeeUsers = useMemo(() => {
    const presenceStatus = (id: string, fallback = "offline") =>
      presence[id]?.status || fallback;

    return users
      .filter((item) => Array.isArray(item.roles))
      .filter((item) =>
        item.roles?.some((role) => role === "admin" || role === "manager" || role === "worker")
      )
      .filter((item) => item.id !== user?.id)
      .map((item) => {
        const labels = getUserLabels({
          username: item.username,
          displayName: item.display_name,
          email: item.email,
          fallback: "User"
        });
        const mentionLabel =
          item.username || item.display_name || item.email || labels.primaryLabel || "user";
        return {
          id: item.id,
          primaryLabel: labels.primaryLabel,
          secondaryLabel: labels.secondaryLabel,
          avatarUrl: item.photo_link || null,
          role:
            item.roles?.includes("admin")
              ? "Admin"
              : item.roles?.includes("manager")
              ? "Manager"
              : "Worker",
          status: presenceStatus(item.id),
          type: "employee",
          mentionLabel
        };
      });
  }, [users, presence, user?.id]);

  const mentionOptions = useMemo(
    () =>
      employeeUsers.map((item) => ({
        id: item.id,
        label: item.primaryLabel,
        secondaryLabel: item.secondaryLabel || item.role,
        avatarUrl: item.avatarUrl,
        status: item.status,
        mention: item.mentionLabel
      })),
    [employeeUsers]
  );

  const fetchThreads = async () => {
    const res = await fetch(buildUrl("/chat/threads"), {
      headers: authHeaders
    });
    if (!res.ok) throw new Error("Unable to load threads");
    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    setThreads(items);
  };

  const fetchUsers = async () => {
    const res = await fetch(buildUrl("/chat/users"), {
      headers: authHeaders
    });
    if (!res.ok) throw new Error("Unable to load users");
    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    setUsers(items);
  };

  const fetchChannels = async () => {
    const res = await fetch(buildUrl("/chat/channels"), {
      headers: authHeaders
    });
    if (!res.ok) throw new Error("Unable to load channels");
    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    setChannels(items);
  };

  const fetchMessages = async (threadId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(buildUrl(`/chat/threads/${threadId}/messages`), {
        headers: authHeaders
      });
      if (!res.ok) throw new Error("Unable to load messages");
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setMessages(items);
      await markThreadRead(threadId);
    } catch (err: any) {
      setError(err?.message || "Unable to load messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchChannelMessages = async (channelId: string) => {
    setLoadingChannelMessages(true);
    try {
      const res = await fetch(buildUrl(`/chat/channels/${channelId}/messages`), {
        headers: authHeaders
      });
      if (!res.ok) throw new Error("Unable to load channel messages");
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setChannelMessages(items);
    } catch (err: any) {
      setError(err?.message || "Unable to load channel messages");
    } finally {
      setLoadingChannelMessages(false);
    }
  };

  const fetchDmThread = async (userId: string) => {
    const res = await fetch(buildUrl("/chat/dm/threads"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify({ user_id: userId })
    });
    if (!res.ok) throw new Error("Unable to load DM thread");
    const data = await res.json();
    return data?.thread as ChatDmThread | undefined;
  };

  const fetchDmMessages = async (threadId: string) => {
    setLoadingDmMessages(true);
    try {
      const res = await fetch(buildUrl(`/chat/dm/threads/${threadId}/messages`), {
        headers: authHeaders
      });
      if (!res.ok) throw new Error("Unable to load DM messages");
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setDmMessages(items);
    } catch (err: any) {
      setError(err?.message || "Unable to load DM messages");
    } finally {
      setLoadingDmMessages(false);
    }
  };

  const markThreadRead = async (threadId: string) => {
    try {
      await fetch(buildUrl(`/chat/threads/${threadId}/read`), {
        method: "POST",
        headers: authHeaders
      });
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                unread_count: 0
              }
            : thread
        )
      );
      setMessages((prev) =>
        prev.map((message) =>
          message.sender_type === "external" && !message.read_at
            ? { ...message, read_at: new Date().toISOString() }
            : message
        )
      );
    } catch {
      // ignore read updates
    }
  };

  const updateThread = async (threadId: string, payload: Record<string, any>) => {
    try {
      const res = await fetch(buildUrl(`/chat/threads/${threadId}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Unable to update thread");
      const data = await res.json();
      const updated = data?.thread;
      if (updated) {
        setThreads((prev) => prev.map((thread) => (thread.id === updated.id ? updated : thread)));
      }
    } catch (err: any) {
      setError(err?.message || "Unable to update thread");
    }
  };

  const assignThread = async (threadId: string, managerId?: string) => {
    try {
      const res = await fetch(buildUrl(`/chat/threads/${threadId}/assign`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({ manager_id: managerId })
      });
      if (!res.ok) throw new Error("Unable to assign thread");
      const data = await res.json();
      const updated = data?.thread;
      if (updated) {
        setThreads((prev) => prev.map((thread) => (thread.id === updated.id ? updated : thread)));
      }
    } catch (err: any) {
      setError(err?.message || "Unable to assign thread");
    }
  };

  const sendMessage = async () => {
    if (!activeThreadId) return;
    const text = composer.trim();
    const hasFiles = pendingFiles.length > 0;
    if (!text && !hasFiles) return;
    const content = text || "Attachment";
    setComposer("");
    try {
      const res = await fetch(buildUrl(`/chat/threads/${activeThreadId}/messages`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({ content, mode: composerMode })
      });
      if (!res.ok) throw new Error("Unable to send message");
      const data = await res.json();
      const message = data?.message as ChatMessage;
      if (message) {
        setMessages((prev) => {
          const exists = prev.some((item) => item.id === message.id);
          if (exists) return prev;
          return [...prev, { ...message, attachments: [], reads: [] }];
        });
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === activeThreadId
              ? {
                  ...thread,
                  last_message: message.content,
                  last_message_at: message.created_at,
                  last_activity_at: message.created_at,
                  status: thread.status === "open" ? "assigned" : thread.status
                }
              : thread
          )
        );
        if (pendingFiles.length) {
          const files = [...pendingFiles];
          setPendingFiles([]);
          for (const file of files) {
            const formData = new FormData();
            formData.append("file", file);
            const uploadRes = await fetch(buildUrl(`/chat/messages/${message.id}/attachments`), {
              method: "POST",
              headers: authHeaders,
              body: formData
            });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              const attachment = uploadData?.attachment;
              if (attachment) {
                setMessages((prev) =>
                  prev.map((item) =>
                    item.id === message.id
                      ? {
                          ...item,
                          attachments: [...(item.attachments || []), attachment]
                        }
                      : item
                  )
                );
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || "Unable to send message");
    }
  };

  const sendChannelMessage = async () => {
    const channel = channels.find((item) => item.id === activeChannelId);
    if (!channel?.id) return;
    const text = channelComposer.trim();
    const hasFiles = channelFiles.length > 0;
    if (!text && !hasFiles) return;
    const content = text || "Attachment";
    setChannelComposer("");
    try {
      const res = await fetch(buildUrl(`/chat/channels/${channel.id}/messages`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({ content })
      });
      if (!res.ok) throw new Error("Unable to send channel message");
      const data = await res.json();
      const message = data?.message as ChatChannelMessage;
      if (message) {
        setChannelMessages((prev) => {
          const exists = prev.some((item) => item.id === message.id);
          if (exists) return prev;
          return [
            ...prev,
            { ...message, reactions: message.reactions || [], attachments: message.attachments || [] }
          ];
        });
        if (channelFiles.length) {
          const files = [...channelFiles];
          setChannelFiles([]);
          for (const file of files) {
            const formData = new FormData();
            formData.append("file", file);
            const uploadRes = await fetch(
              buildUrl(`/chat/channel-messages/${message.id}/attachments`),
              {
                method: "POST",
                headers: authHeaders,
                body: formData
              }
            );
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              const attachment = uploadData?.attachment;
              if (attachment) {
                setChannelMessages((prev) =>
                  prev.map((item) =>
                    item.id === message.id
                      ? {
                          ...item,
                          attachments: [...(item.attachments || []), attachment]
                        }
                      : item
                  )
                );
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || "Unable to send channel message");
    }
  };

  const sendDmMessage = async () => {
    if (!activeDmThreadId) return;
    const text = dmComposer.trim();
    const hasFiles = dmFiles.length > 0;
    if (!text && !hasFiles) return;
    const content = text || "Attachment";
    setDmComposer("");
    try {
      const res = await fetch(buildUrl(`/chat/dm/threads/${activeDmThreadId}/messages`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({ content })
      });
      if (!res.ok) throw new Error("Unable to send DM");
      const data = await res.json();
      const message = data?.message as ChatDmMessage;
      if (message) {
        setDmMessages((prev) => {
          const exists = prev.some((item) => item.id === message.id);
          if (exists) return prev;
          return [
            ...prev,
            { ...message, reactions: message.reactions || [], attachments: message.attachments || [] }
          ];
        });
        if (dmFiles.length) {
          const files = [...dmFiles];
          setDmFiles([]);
          for (const file of files) {
            const formData = new FormData();
            formData.append("file", file);
            const uploadRes = await fetch(buildUrl(`/chat/dm-messages/${message.id}/attachments`), {
              method: "POST",
              headers: authHeaders,
              body: formData
            });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              const attachment = uploadData?.attachment;
              if (attachment) {
                setDmMessages((prev) =>
                  prev.map((item) =>
                    item.id === message.id
                      ? {
                          ...item,
                          attachments: [...(item.attachments || []), attachment]
                        }
                      : item
                  )
                );
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || "Unable to send DM");
    }
  };

  const addReactionToList = <T extends { id: string; reactions?: ReactionItem[] }>(
    list: T[],
    messageId: string,
    reaction: ReactionItem
  ) =>
    list.map((item) =>
      item.id === messageId ? { ...item, reactions: [...(item.reactions || []), reaction] } : item
    );

  const removeReactionFromList = <T extends { id: string; reactions?: ReactionItem[] }>(
    list: T[],
    messageId: string,
    emoji: string,
    userId?: string | null
  ) =>
    list.map((item) => {
      if (item.id !== messageId) return item;
      return {
        ...item,
        reactions: (item.reactions || []).filter(
          (reaction) =>
            !(reaction.emoji === emoji && (!userId || reaction.user_id === userId))
        )
      };
    });

  const handleReaction = async (
    context: "support" | "channel" | "dm",
    messageId: string,
    emoji: string,
    hasReacted: boolean
  ) => {
    const endpoint =
      context === "support"
        ? `/chat/messages/${messageId}/reactions`
        : context === "channel"
        ? `/chat/channel-messages/${messageId}/reactions`
        : `/chat/dm-messages/${messageId}/reactions`;
    try {
      const res = await fetch(buildUrl(endpoint), {
        method: hasReacted ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({ emoji })
      });
      if (!res.ok) throw new Error("Unable to react");
      const data = await res.json();
      const reaction = data?.reaction || { emoji, user_id: user?.id || null };
      if (context === "support") {
        setMessages((prev) =>
          hasReacted
            ? removeReactionFromList(prev, messageId, emoji, user?.id)
            : addReactionToList(prev, messageId, reaction)
        );
      } else if (context === "channel") {
        setChannelMessages((prev) =>
          hasReacted
            ? removeReactionFromList(prev, messageId, emoji, user?.id)
            : addReactionToList(prev, messageId, reaction)
        );
      } else {
        setDmMessages((prev) =>
          hasReacted
            ? removeReactionFromList(prev, messageId, emoji, user?.id)
            : addReactionToList(prev, messageId, reaction)
        );
      }
    } catch (err: any) {
      setError(err?.message || "Unable to add reaction");
    }
  };
  useEffect(() => {
    if (!isEmployee || !token) return;
    let mounted = true;
    setLoadingThreads(true);
    setLoadingChannels(true);
    setError("");
    Promise.all([fetchThreads(), fetchUsers(), fetchChannels()])
      .catch((err) => {
        if (mounted) setError(err?.message || "Unable to load chat data");
      })
      .finally(() => {
        if (mounted) {
          setLoadingThreads(false);
          setLoadingChannels(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [isEmployee, token]);

  useEffect(() => {
    if (activeThreadId || !threads.length) return;
    const nextThread = threads.find(
      (thread) =>
        thread.status !== "closed" &&
        (!thread.assigned_manager_id || thread.assigned_manager_id === user?.id)
    );
    if (nextThread) {
      setActiveThreadId(nextThread.id);
    }
  }, [threads, activeThreadId, user?.id]);

  useEffect(() => {
    if (!channels.length) return;
    if (activeChannelId && channels.some((channel) => channel.id === activeChannelId)) return;
    const nextActive = channels.find((channel) => channel.is_support)?.id || channels[0].id;
    setActiveChannelId(nextActive);
  }, [channels, activeChannelId]);

  useEffect(() => {
    if (!activeThreadId || !token) return;
    if (activeThread?.status === "closed") return;
    fetchMessages(activeThreadId);
  }, [activeThreadId, activeThread?.status, token]);

  useEffect(() => {
    if (!token) return;
    const isSupport = Boolean(activeChannelId && activeChannelId === supportChannelId);
    if (!activeChannelId || isSupport) {
      setChannelMessages([]);
      return;
    }
    fetchChannelMessages(activeChannelId);
  }, [activeChannelId, supportChannelId, token]);

  useEffect(() => {
    if (!token) return;
    if (!activeEmployeeId) {
      setActiveDmThreadId(null);
      setDmMessages([]);
      return;
    }
    let mounted = true;
    setLoadingDmMessages(true);
    fetchDmThread(activeEmployeeId)
      .then((thread) => {
        if (!mounted || !thread?.id) return;
        setActiveDmThreadId(thread.id);
        return fetchDmMessages(thread.id);
      })
      .catch((err) => {
        if (mounted) setError(err?.message || "Unable to load DM");
      })
      .finally(() => {
        if (mounted) setLoadingDmMessages(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeEmployeeId, token]);

  useEffect(() => {
    if (!isEmployee || !token) return;
    if (socketRef.current) return;

    const wsBase = API_BASE
      ? API_BASE.replace(/^http/, "ws")
      : `${window.location.origin.replace(/^http/, "ws")}`;

    const socket = new WebSocket(`${wsBase}/chat/ws?token=${encodeURIComponent(token)}`);
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "heartbeat" }));
        }
      }, 10000);
      const currentThread = activeThreadRef.current;
      if (currentThread) {
        socket.send(JSON.stringify({ type: "subscribe", thread_id: currentThread }));
      }
    });

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "presence:snapshot" || payload.type === "presence:update") {
          const items = Array.isArray(payload.items) ? payload.items : [];
          const next: Record<string, PresenceItem> = {};
          items.forEach((item) => {
            if (item?.id) {
              next[item.id] = item;
            }
          });
          setPresence(next);
        }

        if (payload.type === "thread:new" && payload.thread?.id) {
          setThreads((prev) => {
            const exists = prev.some((thread) => thread.id === payload.thread.id);
            if (exists) return prev;
            return [payload.thread, ...prev];
          });
        }

        if (payload.type === "thread:update" && payload.thread?.id) {
          setThreads((prev) =>
            prev.map((thread) => (thread.id === payload.thread.id ? payload.thread : thread))
          );
        }

        if (payload.type === "typing" && payload.thread_id) {
          const threadId = String(payload.thread_id);
          const isExternalTyping = payload.sender_type !== "employee";
          setThreadTyping((prev) => ({
            ...prev,
            [threadId]: isExternalTyping && payload.status === "typing"
          }));
        }

        if (payload.type === "message:new" && payload.thread_id && payload.message) {
          const threadId = String(payload.thread_id);
          const message = payload.message as ChatMessage;

          setThreads((prev) =>
            prev.map((thread) => {
              if (thread.id !== threadId) return thread;
              const unread = Number(thread.unread_count || 0) || 0;
              const shouldIncrement =
                message.sender_type === "external" && activeThreadRef.current !== threadId;
              return {
                ...thread,
                last_message: message.content,
                last_message_at: message.created_at,
                last_activity_at: message.created_at,
                unread_count: shouldIncrement ? unread + 1 : unread
              };
            })
          );

          if (activeThreadRef.current === threadId) {
            setMessages((prev) => {
              const exists = prev.some((item) => item.id === message.id);
              if (exists) return prev;
              return [...prev, { ...message, attachments: [], reads: [] }];
            });
            if (message.sender_type === "external") {
              markThreadRead(threadId);
            }
          }
        }

        if (payload.type === "channel:message:new" && payload.channel_id && payload.message) {
          const channelId = String(payload.channel_id);
          const message = payload.message as ChatChannelMessage;
          if (activeChannelRef.current === channelId) {
            setChannelMessages((prev) => {
              const exists = prev.some((item) => item.id === message.id);
              if (exists) return prev;
              return [
                ...prev,
                { ...message, reactions: message.reactions || [], attachments: message.attachments || [] }
              ];
            });
          }
        }

        if (payload.type === "dm:message:new" && payload.thread_id && payload.message) {
          const threadId = String(payload.thread_id);
          const message = payload.message as ChatDmMessage;
          if (activeDmThreadRef.current === threadId) {
            setDmMessages((prev) => {
              const exists = prev.some((item) => item.id === message.id);
              if (exists) return prev;
              return [
                ...prev,
                { ...message, reactions: message.reactions || [], attachments: message.attachments || [] }
              ];
            });
          }
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

    return () => {
      socket.close();
    };
  }, [isEmployee, token]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    if (!activeThreadId) return;
    socket.send(JSON.stringify({ type: "subscribe", thread_id: activeThreadId }));
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "unsubscribe", thread_id: activeThreadId }));
      }
    };
  }, [activeThreadId]);
  if (loading) {
    return (
      <main className="min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
        <div className="rounded-2xl border border-border bg-white p-6 text-sm text-ink-muted">
          Loading chat workspace...
        </div>
      </main>
    );
  }

  if (!isEmployee) {
    return (
      <main className="min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
        <div className="rounded-2xl border border-border bg-white p-6 text-sm text-ink">
          Live chat is available from the support card.
        </div>
        <LiveChatCard />
      </main>
    );
  }

  if (!token) {
    return (
      <main className="min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
        <div className="rounded-2xl border border-border bg-white p-6 text-sm text-ink">
          Missing auth token.
        </div>
      </main>
    );
  }

  const activeChannel = channels.find((channel) => channel.id === activeChannelId);
  const activeChannelName =
    activeChannel?.name || activeChannel?.key || activeChannelId || "channel";
  const isSupportChannel = !activeChannelId || activeChannelId === supportChannelId;
  const canSend = Boolean(activeThreadId) && (composer.trim().length > 0 || pendingFiles.length > 0);
  const canSendChannel =
    Boolean(activeChannelId) &&
    !isSupportChannel &&
    (channelComposer.trim().length > 0 || channelFiles.length > 0);
  const canSendDm =
    Boolean(activeDmThreadId) && (dmComposer.trim().length > 0 || dmFiles.length > 0);
  const dmPartner = employeeUsers.find((item) => item.id === activeEmployeeId) || null;
  const trimmedUserSearch = userSearch.trim().toLowerCase();
  const hasUserSearch = trimmedUserSearch.length > 0;
  const filteredEmployeeUsers = trimmedUserSearch
    ? employeeUsers.filter((person) => {
        const target = `${person.primaryLabel} ${person.secondaryLabel || ""} ${person.role || ""}`;
        return target.toLowerCase().includes(trimmedUserSearch);
      })
    : employeeUsers;
  return (
    <main className="min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
      <div className="flex flex-col gap-6">
        {error ? (
          <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        ) : null}

        <div
          className={`grid h-[calc(100vh-112px)] gap-6 ${
            isSupportChannel ? "grid-cols-[320px_280px_1fr]" : "grid-cols-[360px_1fr]"
          }`}
        >
          <aside className="border border-border bg-white p-4 shadow-sm h-full flex flex-col">
            <div className="space-y-6 flex-1 min-h-0 overflow-y-auto pr-1">
              <section>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                  Channels
                </div>
                <div className="space-y-1.5 mt-2">
                  {loadingChannels ? (
                    <div className="px-3 py-2 text-xs text-ink-muted">Loading channels...</div>
                  ) : null}
                  {channelsWithUnread.map((channel) => {
                    const isActive = channel.id === activeChannelId;
                    return (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => {
                          setActiveEmployeeId(null);
                          setActiveChannelId(channel.id);
                        }}
                        className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-[13px] font-medium ${
                          isActive ? "bg-sky-50 text-ink" : "text-ink-muted"
                        }`}
                      >
                        <span className="truncate">#{channel.name || channel.key}</span>
                        {channel.unread ? (
                          <span className="ml-2 rounded-full bg-accent-primary px-2 py-0.5 text-[11px] font-semibold text-white">
                            {channel.unread}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                  {!loadingChannels && channelsWithUnread.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-ink-muted">
                      No channels yet.
                    </div>
                  ) : null}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                    Users
                  </div>
                  <div
                    className="group relative"
                    onClick={() => userSearchRef.current?.focus()}
                  >
                    <div
                      className={`flex items-center gap-2 overflow-hidden rounded-full border border-border bg-white px-3 py-2 text-xs text-ink-muted shadow-sm transition-all duration-200 ${
                        hasUserSearch ? "w-56" : "w-10"
                      } group-hover:w-56 group-focus-within:w-56`}
                    >
                      <Search size={16} />
                      <input
                        ref={userSearchRef}
                        value={userSearch}
                        onChange={(event) => setUserSearch(event.target.value)}
                        placeholder="Search"
                        className={`bg-transparent text-[11px] text-ink outline-none transition-all duration-200 ${
                          hasUserSearch ? "w-40 text-[13px]" : "w-0"
                        } group-hover:w-40 group-focus-within:w-40`}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {filteredEmployeeUsers.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => {
                        setActiveEmployeeId(person.id);
                      }}
                      className={`w-full rounded-xl px-3 py-2 text-left transition-colors ${
                        activeEmployeeId === person.id ? "bg-accent-primary/10" : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative">
                            {person.avatarUrl ? (
                              <img
                                src={person.avatarUrl}
                                alt={person.primaryLabel}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                                {getInitials(person.primaryLabel)}
                              </div>
                            )}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${statusDot(
                                person.status
                              )}`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-semibold text-ink truncate">
                                {person.primaryLabel}
                              </span>
                              {person.secondaryLabel ? (
                                <span className="text-xs text-ink-muted truncate">
                                  ({person.secondaryLabel})
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[11px] text-ink-muted">{person.role}</div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {!filteredEmployeeUsers.length ? (
                    <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-ink-muted">
                      No users found.
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </aside>
          {isSupportChannel ? (
            <aside className="border border-border bg-white p-4 shadow-sm h-full flex flex-col">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                Support threads
              </div>
              <div className="mt-3 flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                {openThreads.map((thread) => {
                  const assignedToOther =
                    thread.assigned_manager_id && thread.assigned_manager_id !== user?.id;
                  const assignedName = thread.assigned_manager_id
                    ? getDisplayName(userMap.get(thread.assigned_manager_id))
                    : "Unassigned";
                  const isActive = activeThreadId === thread.id;
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => {
                        if (assignedToOther) return;
                        setActiveEmployeeId(null);
                        setActiveThreadId(thread.id);
                      }}
                      className={`w-full rounded-xl px-3 py-2 text-left transition-colors ${
                        assignedToOther
                          ? "cursor-not-allowed opacity-60"
                          : isActive
                          ? "bg-accent-primary/10"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-ink truncate">
                              {thread.display_name || "Guest"}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${threadStatusClass(
                                thread.status
                              )}`}
                            >
                              {thread.status}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-ink-muted truncate">
                            {thread.last_message || "No messages yet."}
                          </p>
                          <p className="mt-1 text-[10px] text-ink-muted">
                            {assignedToOther ? `Assigned to ${assignedName}` : assignedName}
                          </p>
                        </div>
                        {Number(thread.unread_count || 0) > 0 ? (
                          <span className="rounded-full bg-accent-primary px-2 py-0.5 text-[11px] font-semibold text-white">
                            {thread.unread_count}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
                {!openThreads.length ? (
                  <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-ink-muted">
                    No open threads.
                  </div>
                ) : null}
              </div>
            </aside>
          ) : null}
          <section className="border border-border bg-white shadow-sm h-full flex flex-col overflow-hidden">
            {!isSupportChannel ? (
              <div className="flex h-full flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <div className="sticky top-0 z-10 border-b border-border bg-white px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-ink-muted">
                      <Hash size={16} />
                      {activeChannelName}
                    </div>
                    <p className="text-sm text-ink-muted mt-2">
                      Operational messages and announcements live here.
                    </p>
                  </div>
                  <div className="px-6 py-6 space-y-4">
                    {loadingChannelMessages ? (
                      <div className="text-sm text-ink-muted">Loading messages...</div>
                    ) : null}
                    {channelMessages.map((message) => {
                      const sender = userMap.get(message.sender_id || "");
                      const senderName = getDisplayName(sender);
                      const isMine = message.sender_id === user?.id;
                      return (
                        <div key={message.id} className="group flex gap-3 max-w-[720px]">
                          <div className="relative mt-1 h-8 w-8 shrink-0">
                            {sender?.photo_link ? (
                              <img
                                src={sender.photo_link}
                                alt={senderName}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                                {getInitials(senderName)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-xs text-ink-muted">
                              <span className="font-semibold text-ink">{senderName}</span>
                              <span>{formatTime(message.created_at)}</span>
                            </div>
                            <div
                              className={`mt-2 px-4 py-3 text-[15px] font-chat font-normal leading-relaxed whitespace-pre-wrap break-words [&_strong]:font-semibold [&_em]:italic [&_del]:line-through [&_u]:underline [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px] [&_code]:text-slate-700 [&_a]:text-sky-600 [&_a]:underline`}
                              dangerouslySetInnerHTML={{
                                __html: formatMessageContent(message.content || "")
                              }}
                            />
                            <AttachmentList attachments={message.attachments} />
                            <ReactionBar
                              reactions={message.reactions}
                              currentUserId={user?.id}
                              onReact={(emoji, hasReacted) =>
                                handleReaction("channel", message.id, emoji, hasReacted)
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                    {!loadingChannelMessages && channelMessages.length === 0 ? (
                      <div className="text-sm text-ink-muted">No messages yet.</div>
                    ) : null}
                  </div>
                </div>
                <MessageInput
                  value={channelComposer}
                  onChange={setChannelComposer}
                  onSend={sendChannelMessage}
                  placeholder={`Message #${activeChannelName}`}
                  canSend={canSendChannel}
                  mentionOptions={mentionOptions}
                  pendingFiles={channelFiles}
                  onRemoveFile={(index) =>
                    setChannelFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
                  }
                  onAttachClick={() => channelFileInputRef.current?.click()}
                />
                <input
                  ref={channelFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    if (!files.length) return;
                    setChannelFiles((prev) => [...prev, ...files]);
                    event.target.value = "";
                  }}
                />
              </div>
            ) : activeEmployeeId ? (
              <div className="flex h-full flex-col min-h-0">
                <div className="border-b border-border px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {dmPartner?.avatarUrl ? (
                        <img
                          src={dmPartner.avatarUrl}
                          alt={dmPartner.primaryLabel}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-ink-muted">
                          {getInitials(dmPartner?.primaryLabel || "U")}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${statusDot(
                          dmPartner?.status || "offline"
                        )}`}
                      />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-ink">
                        {dmPartner?.primaryLabel || "Direct message"}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {dmPartner?.secondaryLabel || dmPartner?.role || "Employee"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-4">
                  {loadingDmMessages ? (
                    <div className="text-sm text-ink-muted">Loading messages...</div>
                  ) : null}
                  {dmMessages.map((message) => {
                    const sender = userMap.get(message.sender_id || "");
                    const senderName = getDisplayName(sender);
                    const isMine = message.sender_id === user?.id;
                    return (
                      <div key={message.id} className="group flex gap-3 max-w-[720px]">
                        <div className="relative mt-1 h-8 w-8 shrink-0">
                          {sender?.photo_link ? (
                            <img
                              src={sender.photo_link}
                              alt={senderName}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                              {getInitials(senderName)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-xs text-ink-muted">
                            <span className="font-semibold text-ink">{senderName}</span>
                            <span>{formatTime(message.created_at)}</span>
                          </div>
                          <div
                            className={`mt-2 rounded-xl px-4 py-3 text-[15px] font-chat font-normal leading-relaxed whitespace-pre-wrap break-words [&_strong]:font-semibold [&_em]:italic [&_del]:line-through [&_u]:underline [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px] [&_code]:text-slate-700 [&_a]:text-sky-600 [&_a]:underline ${
                              isMine
                                ? "bg-sky-50 text-sky-900 border border-sky-100"
                                : "bg-white border border-border"
                            }`}
                            dangerouslySetInnerHTML={{
                              __html: formatMessageContent(message.content || "")
                            }}
                          />
                          <AttachmentList attachments={message.attachments} />
                          <ReactionBar
                            reactions={message.reactions}
                            currentUserId={user?.id}
                            onReact={(emoji, hasReacted) =>
                              handleReaction("dm", message.id, emoji, hasReacted)
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                  {!loadingDmMessages && dmMessages.length === 0 ? (
                    <div className="text-sm text-ink-muted">No messages yet.</div>
                  ) : null}
                </div>
                <MessageInput
                  value={dmComposer}
                  onChange={setDmComposer}
                  onSend={sendDmMessage}
                  canSend={canSendDm}
                  mentionOptions={mentionOptions}
                  placeholder={`Message ${dmPartner?.primaryLabel || "user"}`}
                  pendingFiles={dmFiles}
                  onRemoveFile={(index) =>
                    setDmFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
                  }
                  onAttachClick={() => dmFileInputRef.current?.click()}
                  helperText="Direct message"
                />
                <input
                  ref={dmFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    if (!files.length) return;
                    setDmFiles((prev) => [...prev, ...files]);
                    event.target.value = "";
                  }}
                />
              </div>
            ) : activeThread ? (
              <div className="flex h-full flex-col min-h-0">
                <div className="border-b border-border px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Thread</p>
                      <h2 className="mt-1 text-lg font-semibold text-ink">
                        {activeThread.display_name || "Support"}
                      </h2>
                      <p className="text-sm text-ink-muted">User type: {activeThread.user_type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${threadStatusClass(
                          activeThread.status
                        )}`}
                      >
                        {activeThread.status}
                      </span>
                      {isManager && activeThread.assigned_manager_id !== user?.id ? (
                        <button
                          type="button"
                          onClick={() => assignThread(activeThread.id, user?.id)}
                          className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-ink-muted hover:text-ink"
                        >
                          Assign to me
                        </button>
                      ) : null}
                      {activeThread.status !== "closed" ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateThread(activeThread.id, {
                              status: "closed",
                              closed_at: new Date().toISOString()
                            })
                          }
                          className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-ink-muted hover:text-ink"
                        >
                          Close
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="h-9 w-9 rounded-lg border border-border text-ink-muted hover:text-ink"
                        aria-label="Thread actions"
                      >
                        <MoreHorizontal size={16} className="mx-auto" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-ink-muted">
                    <div className="flex items-center gap-2">
                      <Shield size={14} />
                      Assigned manager: <span className="text-ink">{assignedManagerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} />
                      Watchers: <span className="text-ink">{watcherNames}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      Last activity:{" "}
                      <span className="text-ink">{formatRelativeTime(activeThread.last_activity_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-4">
                  {loadingMessages ? (
                    <div className="text-sm text-ink-muted">Loading messages...</div>
                  ) : null}
                  {activeMessages.map((message) => {
                    const isInternal = message.sender_type === "internal";
                    const isExternal = message.sender_type === "external";
                    const senderName = isExternal
                      ? activeThread.display_name || "User"
                      : isInternal
                      ? getDisplayName(userMap.get(message.sender_id || ""))
                      : "System";
                    const readNames = (message.reads || [])
                      .map((read) => getDisplayName(userMap.get(read.user_id)))
                      .filter(Boolean);
                    return (
                      <div key={message.id} className="max-w-[720px] group">
                        <div className="flex items-center gap-2 text-xs text-ink-muted">
                          <span className="font-semibold text-ink">{senderName}</span>
                          <span>{formatTime(message.created_at)}</span>
                          {isInternal ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              Internal
                            </span>
                          ) : null}
                        </div>
                        <div
                          className={`mt-2 rounded-xl px-4 py-3 text-[15px] font-chat font-normal leading-relaxed whitespace-pre-wrap break-words [&_strong]:font-semibold [&_em]:italic [&_del]:line-through [&_u]:underline [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px] [&_code]:text-slate-700 [&_a]:text-sky-600 [&_a]:underline ${
                            isInternal
                              ? "bg-slate-50 text-slate-700 border border-slate-200"
                              : "bg-white border border-border"
                          }`}
                          dangerouslySetInnerHTML={{
                            __html: formatMessageContent(message.content || "")
                          }}
                        />
                        <AttachmentList attachments={message.attachments} />
                        <ReactionBar
                          reactions={message.reactions}
                          currentUserId={user?.id}
                          onReact={(emoji, hasReacted) =>
                            handleReaction("support", message.id, emoji, hasReacted)
                          }
                        />
                        {isExternal ? (
                          <div className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            {readNames.length ? `Read by ${readNames.join(", ")}` : "Unread"}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {activeThreadId && threadTyping[activeThreadId] ? (
                    <div className="text-xs text-ink-muted">User is typing...</div>
                  ) : null}
                </div>
                <MessageInput
                  value={composer}
                  onChange={handleComposerChange}
                  onSend={sendMessage}
                  canSend={canSend}
                  placeholder={
                    composerMode === "internal"
                      ? "Add internal note for managers and workers..."
                      : "Reply to user (sent as System)..."
                  }
                  pendingFiles={pendingFiles}
                  onRemoveFile={(index) =>
                    setPendingFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
                  }
                  onAttachClick={() => fileInputRef.current?.click()}
                  showModeToggle
                  mode={composerMode}
                  onModeChange={setComposerMode}
                  mentionOptions={mentionOptions}
                  helperText="Typing indicator enabled"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    if (!files.length) return;
                    setPendingFiles((prev) => [...prev, ...files]);
                    event.target.value = "";
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto p-6 text-sm text-ink-muted">
                  {loadingThreads ? "Loading threads..." : "Select a thread to begin."}
                </div>
                <MessageInput
                  value={composer}
                  onChange={handleComposerChange}
                  onSend={sendMessage}
                  canSend={canSend}
                  placeholder="Select a thread to start messaging."
                  pendingFiles={pendingFiles}
                  onRemoveFile={(index) =>
                    setPendingFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
                  }
                  onAttachClick={() => fileInputRef.current?.click()}
                  showModeToggle
                  mode={composerMode}
                  onModeChange={setComposerMode}
                  mentionOptions={mentionOptions}
                  helperText="Select a thread to enable sending."
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    if (!files.length) return;
                    setPendingFiles((prev) => [...prev, ...files]);
                    event.target.value = "";
                  }}
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default ChatPage;
