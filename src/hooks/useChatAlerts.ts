import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "../config";
import { clearTabIndicator, setTabIndicator } from "../lib/tabIndicator";

export type ChatNotificationTarget = {
  kind: "support" | "dm" | "channel";
  threadId?: string;
  channelId?: string;
  senderId?: string;
  at: number;
};

export const CHAT_NOTIFICATION_TARGET_STORAGE_KEY = "chat_notification_target";
export const CHAT_NOTIFICATION_TARGET_EVENT = "chat-notification-target";

export const storeChatNotificationTarget = (target: ChatNotificationTarget) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CHAT_NOTIFICATION_TARGET_STORAGE_KEY, JSON.stringify(target));
    window.dispatchEvent(new Event(CHAT_NOTIFICATION_TARGET_EVENT));
  } catch {
    // ignore storage failures
  }
};

export const consumeChatNotificationTarget = (): ChatNotificationTarget | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CHAT_NOTIFICATION_TARGET_STORAGE_KEY);
    window.sessionStorage.removeItem(CHAT_NOTIFICATION_TARGET_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const kind = String(parsed.kind || "");
    if (kind !== "support" && kind !== "dm" && kind !== "channel") return null;
    return {
      kind,
      threadId: parsed.threadId ? String(parsed.threadId) : undefined,
      channelId: parsed.channelId ? String(parsed.channelId) : undefined,
      senderId: parsed.senderId ? String(parsed.senderId) : undefined,
      at: Number(parsed.at || Date.now())
    };
  } catch {
    return null;
  }
};

type UseChatAlertsInput = {
  enabled: boolean;
  token?: string | null;
  userId?: string | null;
  route: string;
  onNavigate?: (path: string) => void;
};

type ChatAlertPermission = NotificationPermission | "unsupported";

const HEARTBEAT_INTERVAL_MS = 10000;
const RECONNECT_DELAY_MS = 2500;
const SOUND_COOLDOWN_MS = 500;

const truncate = (value: unknown, max = 140) => {
  const text = String(value || "").trim();
  if (!text) return "Open chat to view the latest message.";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
};

const isBackgroundTab = () => {
  if (typeof document === "undefined") return false;
  return document.visibilityState !== "visible" || !document.hasFocus();
};

const getNotificationPermission = (): ChatAlertPermission => {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
};

const createAudioContext = () => {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
};

export const useChatAlerts = ({
  enabled,
  token,
  userId,
  route,
  onNavigate
}: UseChatAlertsInput) => {
  const [unseenCount, setUnseenCount] = useState(0);
  const [permission, setPermission] = useState<ChatAlertPermission>(getNotificationPermission);

  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const seenEventQueueRef = useRef<string[]>([]);
  const seenEventSetRef = useRef(new Set<string>());
  const routeRef = useRef(route);
  const userIdRef = useRef(userId || "");
  const onNavigateRef = useRef(onNavigate);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastSoundRef = useRef(0);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    userIdRef.current = userId || "";
  }, [userId]);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  const clearUnseen = useCallback(() => {
    setUnseenCount(0);
    clearTabIndicator();
  }, []);

  const playSound = useCallback(async () => {
    const now = Date.now();
    if (now - lastSoundRef.current < SOUND_COOLDOWN_MS) return;
    lastSoundRef.current = now;

    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    const context = audioContextRef.current;
    if (!context) return;

    try {
      if (context.state === "suspended") {
        await context.resume();
      }
      const gain = context.createGain();
      const osc = context.createOscillator();
      const start = context.currentTime;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, start);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(start);
      osc.stop(start + 0.17);
    } catch {
      // ignore autoplay/audio errors
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    try {
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }
    } catch {
      // ignore audio unlock failures
    }

    const next = getNotificationPermission();
    if (next === "unsupported") {
      setPermission(next);
      return next;
    }
    const granted = await Notification.requestPermission();
    setPermission(granted);
    return granted;
  }, []);

  const incrementUnseen = useCallback(() => {
    setUnseenCount((prev) => {
      const next = prev + 1;
      setTabIndicator(next);
      return next;
    });
  }, []);

  const shouldHandleEvent = useCallback((scope: string, roomId: string, message: any) => {
    const messageId = String(message?.id || "").trim();
    const senderId = String(message?.sender_id || message?.sender_type || "").trim();
    const createdAt = String(message?.created_at || "").trim();
    const content = String(message?.content || "").trim();
    const key = messageId
      ? `${scope}:${messageId}`
      : `${scope}:${roomId}:${senderId}:${createdAt}:${content}`;

    if (seenEventSetRef.current.has(key)) return false;
    seenEventSetRef.current.add(key);
    seenEventQueueRef.current.push(key);

    if (seenEventQueueRef.current.length > 1000) {
      const old = seenEventQueueRef.current.shift();
      if (old) seenEventSetRef.current.delete(old);
    }
    return true;
  }, []);

  const handleNotificationClick = useCallback((target: ChatNotificationTarget) => {
    storeChatNotificationTarget(target);
    try {
      window.focus();
    } catch {
      // ignore focus failure
    }
    const isOnChatRoute = routeRef.current.startsWith("/chat");
    onNavigateRef.current?.("/chat");
    if (isOnChatRoute && typeof document !== "undefined" && document.visibilityState === "visible") {
      clearTabIndicator();
    }
  }, []);

  const emitAlert = useCallback(
    (title: string, body: string, target: ChatNotificationTarget, tag: string) => {
      if (!isBackgroundTab()) return;

      incrementUnseen();
      void playSound();

      const currentPermission = getNotificationPermission();
      setPermission((prev) => (prev === currentPermission ? prev : currentPermission));

      if (currentPermission !== "granted") return;
      try {
        const notification = new Notification(title, {
          body,
          tag,
          icon: "/favicon.svg"
        });
        notification.onclick = () => {
          notification.close();
          handleNotificationClick(target);
        };
      } catch {
        // ignore notification failures
      }
    },
    [handleNotificationClick, incrementUnseen, playSound]
  );

  useEffect(() => {
    if (!enabled || !token) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (reconnectRef.current) {
        window.clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      clearUnseen();
      return;
    }

    let manualClose = false;

    const cleanupSocket = () => {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };

    const buildWsUrl = () => {
      const wsBase = API_BASE.replace(/^http/i, "ws");
      return `${wsBase}/chat/ws?token=${encodeURIComponent(token)}`;
    };

    const connect = () => {
      if (manualClose) return;
      cleanupSocket();

      const socket = new WebSocket(buildWsUrl());
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        if (heartbeatRef.current) {
          window.clearInterval(heartbeatRef.current);
        }
        heartbeatRef.current = window.setInterval(() => {
          if (socket.readyState !== WebSocket.OPEN) return;
          socket.send(JSON.stringify({ type: "heartbeat" }));
        }, HEARTBEAT_INTERVAL_MS);
      });

      socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(String(event.data || "{}"));
          const currentUserId = userIdRef.current;

          if (payload.type === "message:new" && payload.thread_id && payload.message) {
            const message = payload.message || {};
            const threadId = String(payload.thread_id);
            if (!shouldHandleEvent("support", threadId, message)) return;
            const senderType = String(message.sender_type || "");
            const senderId = message.sender_id ? String(message.sender_id) : "";
            const fromOther =
              senderType === "external" || (Boolean(senderId) && senderId !== currentUserId);
            if (!fromOther) return;

            emitAlert(
              senderType === "external" ? "New support message" : "New support thread message",
              truncate(message.content),
              {
                kind: "support",
                threadId,
                senderId: senderId || undefined,
                at: Date.now()
              },
              `support-${threadId}`
            );
            return;
          }

          if (payload.type === "dm:message:new" && payload.thread_id && payload.message) {
            const message = payload.message || {};
            const threadId = String(payload.thread_id);
            if (!shouldHandleEvent("dm", threadId, message)) return;
            const senderId = message.sender_id ? String(message.sender_id) : "";
            if (!senderId || senderId === currentUserId) return;

            emitAlert(
              "New direct message",
              truncate(message.content),
              {
                kind: "dm",
                threadId,
                senderId,
                at: Date.now()
              },
              `dm-${threadId}`
            );
            return;
          }

          if (payload.type === "channel:message:new" && payload.channel_id && payload.message) {
            const message = payload.message || {};
            const channelId = String(payload.channel_id);
            if (!shouldHandleEvent("channel", channelId, message)) return;
            const senderId = message.sender_id ? String(message.sender_id) : "";
            if (!senderId || senderId === currentUserId) return;

            emitAlert(
              "New channel message",
              truncate(message.content),
              {
                kind: "channel",
                channelId,
                senderId,
                at: Date.now()
              },
              `channel-${channelId}`
            );
          }
        } catch {
          // ignore invalid socket payloads
        }
      });

      socket.addEventListener("close", () => {
        if (heartbeatRef.current) {
          window.clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        socketRef.current = null;
        if (manualClose) return;
        reconnectRef.current = window.setTimeout(() => {
          reconnectRef.current = null;
          connect();
        }, RECONNECT_DELAY_MS);
      });
    };

    connect();

    return () => {
      manualClose = true;
      cleanupSocket();
      if (reconnectRef.current) {
        window.clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
    };
  }, [clearUnseen, emitAlert, enabled, shouldHandleEvent, token]);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  return {
    unseenCount,
    permission,
    requestPermission,
    clearUnseen
  };
};
