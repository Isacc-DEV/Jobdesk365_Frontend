import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useUser } from "../../hooks/useUser";
import { API_BASE, BACKEND_ORIGIN, TOKEN_KEY } from "../../config";

const labelClass = "text-sm font-semibold text-ink";
const inputClass =
  "h-11 w-full rounded-xl border border-border bg-[#F9FAFB] px-3 text-sm text-ink focus:outline focus:outline-2 focus:outline-accent-primary";

const tabs = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "billing", label: "Billing/Payment" },
  { id: "plan", label: "Plan" }
];

const tabHeadings = {
  profile: {
    title: "Your Profile",
    subtitle: "View or update your information."
  },
  security: {
    title: "Security",
    subtitle: "Manage password and security preferences."
  },
  billing: {
    title: "Billing & Payment",
    subtitle: "Manage billing details and payment methods."
  },
  plan: {
    title: "Plan",
    subtitle: "Review your subscription and plan details."
  },
};

const FRAME_SIZE = 320;
const CIRCLE_SIZE = 220;
const OUTPUT_SIZE = 512;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

const resolveAvatarUrl = (value: string) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base =
    BACKEND_ORIGIN ||
    (typeof window !== "undefined" ? window.location.origin : "");
  if (!base) return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
};

type ProfileForm = {
  name: string;
  email: string;
  role: string;
  location: string;
  bio: string;
  phone: string;
};

const emptyForm: ProfileForm = {
  name: "",
  email: "",
  role: "",
  location: "",
  bio: "",
  phone: ""
};

const UserProfilePage = () => {
  const { user, updateUser, loading, error, saving } = useUser();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSrc, setAvatarSrc] = useState("");
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropPreview, setCropPreview] = useState("");
  const [cropZoom, setCropZoom] = useState(1);
  const [cropCenter, setCropCenter] = useState({ x: FRAME_SIZE / 2, y: FRAME_SIZE / 2 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fallbackName =
      user.display_name ||
      user.name ||
      user.username ||
      (user.email ? user.email.split("@")[0] : "User");
    setForm({
      name: user.name || fallbackName,
      email: user.email || "",
      role: user.role || user.plan || "",
      location: user.location || "",
      bio: user.bio || "",
      phone: user.phone || ""
    });
  }, [user]);

  const photoLink = user?.photo_link || "";

  useEffect(() => {
    setAvatarSrc(resolveAvatarUrl(photoLink));
  }, [photoLink]);

  useEffect(() => {
    if (!cropPreview) return;
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = cropPreview;
  }, [cropPreview]);

  useEffect(() => {
    if (!cropPreview) return;
    return () => {
      URL.revokeObjectURL(cropPreview);
    };
  }, [cropPreview]);

  const getBaseScale = () => {
    if (!imageSize.width || !imageSize.height) return 1;
    return Math.min(FRAME_SIZE / imageSize.width, FRAME_SIZE / imageSize.height);
  };

  const getCircleSize = () => CIRCLE_SIZE / cropZoom;

  const getImageRect = () => {
    if (!imageSize.width || !imageSize.height) {
      return { scale: 1, width: 0, height: 0, left: 0, top: 0 };
    }
    const scale = getBaseScale();
    const width = imageSize.width * scale;
    const height = imageSize.height * scale;
    const left = (FRAME_SIZE - width) / 2;
    const top = (FRAME_SIZE - height) / 2;
    return { scale, width, height, left, top };
  };

  const clampCropCenter = (pos) => {
    if (!imageSize.width || !imageSize.height) return pos;
    const rect = getImageRect();
    const radius = getCircleSize() / 2;
    const minX = rect.left + radius;
    const maxX = rect.left + rect.width - radius;
    const minY = rect.top + radius;
    const maxY = rect.top + rect.height - radius;
    const clamp = (value, min, max) =>
      min > max ? (min + max) / 2 : Math.max(min, Math.min(max, value));
    return {
      x: clamp(pos.x, minX, maxX),
      y: clamp(pos.y, minY, maxY)
    };
  };

  useEffect(() => {
    setCropCenter((prev) => clampCropCenter(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropZoom, imageSize.width, imageSize.height]);

  if (loading) {
    return (
      <main className="bg-main min-h-[calc(100vh-64px)] border-t border-border px-8 py-8 grid place-items-center">
        <p className="text-ink-muted">Loading your profile...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="bg-main min-h-[calc(100vh-64px)] border-t border-border px-8 py-8 grid place-items-center">
        <p className="text-red-500">{error}</p>
      </main>
    );
  }

  if (!user) return null;

  const displayName =
    user.display_name ||
    user.name ||
    user.username ||
    (user.email ? user.email.split("@")[0] : "User");
  const rawBalance = user?.balance ?? null;
  const balanceValue =
    rawBalance === null || rawBalance === undefined || Number.isNaN(Number(rawBalance))
      ? null
      : Number(rawBalance);
  const balanceLabel = balanceValue === null ? "--" : `$${balanceValue.toFixed(2)}`;

  const billingSummary = [
    { label: "Plan", value: user.plan || "Scale", meta: "Billed monthly" },
    { label: "Next invoice", value: "$79.00", meta: "Apr 10, 2026" },
    { label: "Billing email", value: user.email || "billing@company.com", meta: "Receipts and invoices" },
    { label: "Payment status", value: "Active", meta: "Auto-pay on" }
  ];

  const paymentMethods = [
    {
      id: "card",
      badge: "CC",
      label: "Card",
      description: "Visa, Mastercard, Amex",
      status: "Primary",
      statusClass: "border-emerald-100 bg-emerald-50 text-emerald-700",
      detail: "**** 4242 • exp 08/27",
      actionLabel: "Manage",
      secondaryLabel: "Edit"
    },
    {
      id: "paypal",
      badge: "PP",
      label: "PayPal",
      description: "Fast checkout with PayPal",
      status: "Not connected",
      statusClass: "border-border bg-gray-50 text-ink-muted",
      detail: "Connect your PayPal account to enable billing.",
      actionLabel: "Connect"
    },
    {
      id: "payoneer",
      badge: "PY",
      label: "Payoneer",
      description: "Global payouts for teams",
      status: "Not connected",
      statusClass: "border-border bg-gray-50 text-ink-muted",
      detail: "Link Payoneer for international billing.",
      actionLabel: "Connect"
    },
    {
      id: "crypto",
      badge: "CR",
      label: "Cryptocurrency",
      description: "USDC, USDT, BTC",
      status: "Wallet not set",
      statusClass: "border-amber-100 bg-amber-50 text-amber-700",
      detail: "Add a wallet address to receive invoices.",
      actionLabel: "Add wallet"
    }
  ];

  const invoices = [
    {
      id: "INV-2026-021",
      date: "Feb 1, 2026",
      amount: "$79.00",
      status: "Paid",
      statusClass: "bg-emerald-50 text-emerald-700"
    },
    {
      id: "INV-2026-020",
      date: "Jan 1, 2026",
      amount: "$79.00",
      status: "Paid",
      statusClass: "bg-emerald-50 text-emerald-700"
    },
    {
      id: "INV-2025-019",
      date: "Dec 1, 2025",
      amount: "$79.00",
      status: "Paid",
      statusClass: "bg-emerald-50 text-emerald-700"
    }
  ];

  const handleChange =
    (field: keyof ProfileForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = () => {
    if (activeTab !== "profile") return;
    updateUser({ display_name: form.name, bio: form.bio });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const handlePasswordSave = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setPasswordError("Missing token.");
      return;
    }
    setPasswordSaving(true);
    try {
      const endpoint = API_BASE ? `${API_BASE}/auth/password` : "/auth/password";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
      });
      if (res.status === 401) {
        window.location.href = "/auth";
        return;
      }
      if (!res.ok) {
        const message = (await res.text()) || "Unable to change password.";
        throw new Error(message);
      }
      setPasswordSuccess("Password updated.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message || "Unable to change password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const openCropper = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setCropFile(file);
    setCropPreview(previewUrl);
    setCropZoom(1);
    setCropCenter({ x: FRAME_SIZE / 2, y: FRAME_SIZE / 2 });
    setAvatarError("");
    setCropOpen(true);
  };

  const closeCropper = () => {
    setCropOpen(false);
    setCropFile(null);
    setCropPreview("");
    setCropZoom(1);
    setCropCenter({ x: FRAME_SIZE / 2, y: FRAME_SIZE / 2 });
    setImageSize({ width: 0, height: 0 });
  };

  const getPoint = (event) => {
    if ("touches" in event && event.touches[0]) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    return { x: event.clientX, y: event.clientY };
  };

  const handleCropDragStart = (event) => {
    event.preventDefault();
    const start = getPoint(event);
    const startPos = cropCenter;
    const handleMove = (moveEvent) => {
      moveEvent.preventDefault();
      const point = getPoint(moveEvent);
      const next = {
        x: startPos.x + (point.x - start.x),
        y: startPos.y + (point.y - start.y)
      };
      setCropCenter(clampCropCenter(next));
    };
    const handleEnd = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
  };

  const createCroppedBlob = async () => {
    if (!cropPreview || !imageSize.width || !imageSize.height) {
      throw new Error("Image not ready.");
    }
    const img = new Image();
    img.src = cropPreview;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas not supported.");
    }
    const rect = getImageRect();
    const radius = getCircleSize() / 2;
    const cropLeft = (cropCenter.x - radius - rect.left) / rect.scale;
    const cropTop = (cropCenter.y - radius - rect.top) / rect.scale;
    const cropSize = getCircleSize() / rect.scale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(
      img,
      cropLeft,
      cropTop,
      cropSize,
      cropSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );
    ctx.restore();
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Unable to crop image."));
      }, "image/png", 0.92);
    });
  };

  const uploadCroppedAvatar = async () => {
    if (!cropFile) return;
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setAvatarError("Missing token.");
      return;
    }
    setAvatarUploading(true);
    try {
      const blob = await createCroppedBlob();
      const filename = `avatar-${Date.now()}.png`;
      const formData = new FormData();
      formData.append("avatar", new File([blob], filename, { type: "image/png" }));
      const endpoint = API_BASE ? `${API_BASE}/auth/me/avatar` : "/auth/me/avatar";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.status === 401) {
        window.location.href = "/auth";
        return;
      }
      if (!res.ok) {
        const message = (await res.text()) || "Upload failed.";
        throw new Error(message);
      }
      const data = await res.json();
      const uploadedLink = data?.photo_link || data?.url || "";
      if (!uploadedLink) throw new Error("Upload failed.");
      const updated = await updateUser({ photo_link: uploadedLink });
      setAvatarSrc(resolveAvatarUrl(uploadedLink));
      closeCropper();
      if (!updated) {
        setAvatarError("Avatar uploaded, but profile sync is delayed. Refresh the page if needed.");
      }
    } catch (err) {
      setAvatarError(err.message || "Unable to upload avatar.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarError("");
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select an image file.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Please upload an image smaller than 5MB.");
      event.target.value = "";
      return;
    }
    openCropper(file);
    event.target.value = "";
  };

  const heading = tabHeadings[activeTab] || tabHeadings.profile;

  const handleWheelZoom = (event) => {
    event.preventDefault();
    const delta = -event.deltaY;
    const step = 0.002;
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cropZoom + delta * step));
    setCropZoom(next);
  };

  return (
    <main className="bg-main min-h-[calc(100vh-64px)] border-t border-border px-8 py-8">
      <div className="max-w-[1440px] mx-auto grid grid-cols-[220px_1fr] gap-6">
        <aside className="rounded-2xl border border-border bg-white p-4 h-fit">
          <div className="space-y-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-accent-primary/10 text-accent-primary"
                      : "text-ink-muted hover:text-ink hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex flex-col gap-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {avatarSrc ? (
                  <div className="w-[72px] h-[72px] rounded-full overflow-hidden border border-border bg-white">
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      className="w-full h-full object-cover object-center"
                      onError={() => {
                        setAvatarSrc("");
                        setAvatarError("Avatar image is not accessible.");
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-[72px] h-[72px] rounded-full bg-accent-primary/15 text-accent-primary font-bold text-2xl grid place-items-center">
                    {displayName?.[0] ?? "U"}
                  </div>
                )}
                <label className="absolute -bottom-2 -right-2 cursor-pointer rounded-full bg-white border border-border px-2 py-1 text-[11px] font-semibold text-ink shadow-sm">
                  {avatarUploading ? "Uploading..." : "Change"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={avatarUploading}
                  />
                </label>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-ink">{heading.title}</h1>
                <p className="text-sm text-ink-muted">{heading.subtitle}</p>
                {avatarError ? <p className="text-xs text-red-500 mt-1">{avatarError}</p> : null}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Balance</p>
              <p className="mt-1 text-lg font-semibold text-ink">{balanceLabel}</p>
              <p className="text-xs text-ink-muted">Available credits</p>
            </div>
          </header>

          {activeTab === "profile" ? (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={labelClass}>Full name</label>
                  <input className={inputClass} value={form.name || ""} onChange={handleChange("name")} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Email</label>
                  <input
                    className={`${inputClass} bg-gray-50`}
                    value={form.email || ""}
                    onChange={handleChange("email")}
                    readOnly
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className={labelClass}>Bio</label>
                  <textarea
                    className={`${inputClass} h-24 resize-none`}
                    value={form.bio || ""}
                    onChange={handleChange("bio")}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 h-11 rounded-xl bg-accent-primary text-white font-semibold disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                {saved ? <span className="text-sm text-green-600">Saved</span> : null}
              </div>
            </>
          ) : activeTab === "security" ? (
            <div className="grid gap-6">
              <div className="rounded-2xl border border-border bg-white p-6">
                <h2 className="text-lg font-semibold text-ink">Change password</h2>
                <p className="text-sm text-ink-muted mt-1">
                  Update your password to keep your account secure.
                </p>
                <div className="mt-6 grid gap-4 max-w-md">
                  <div className="space-y-2">
                    <label className={labelClass}>Old password</label>
                    <input
                      type="password"
                      className={inputClass}
                      value={oldPassword}
                      onChange={(event) => setOldPassword(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>New password</label>
                    <input
                      type="password"
                      className={inputClass}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>Confirm new password</label>
                    <input
                      type="password"
                      className={inputClass}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </div>
                  {passwordError ? <p className="text-sm text-red-500">{passwordError}</p> : null}
                  {passwordSuccess ? <p className="text-sm text-green-600">{passwordSuccess}</p> : null}
                  <button
                    type="button"
                    onClick={handlePasswordSave}
                    disabled={passwordSaving}
                    className="px-5 h-11 rounded-xl bg-accent-primary text-white font-semibold disabled:opacity-60"
                  >
                    {passwordSaving ? "Updating..." : "Update password"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-white p-6">
                <h2 className="text-lg font-semibold text-ink">Last login</h2>
                <div className="mt-4 grid gap-2 text-sm text-ink">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-ink-muted">Time</span>
                    <span>
                      {user?.last_login_at
                        ? new Date(user.last_login_at).toLocaleString()
                        : "Not available"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Place</span>
                    <span>{user?.last_login_place || "Not available"}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "billing" ? (
            <div className="grid gap-6">
              <div className="rounded-2xl border border-border bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink-muted">Billing summary</p>
                    <h2 className="mt-2 text-lg font-semibold text-ink">Your subscription</h2>
                    <p className="text-sm text-ink-muted">
                      Manage payment methods and billing details in one place.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-4 h-10 rounded-xl border border-border text-sm font-semibold text-ink hover:-translate-y-[1px] hover:shadow-soft transition"
                  >
                    Manage plan
                  </button>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {billingSummary.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-border bg-main p-4"
                    >
                      <p className="text-xs uppercase tracking-wide text-ink-muted">{item.label}</p>
                      <p className="mt-2 text-lg font-semibold text-ink">{item.value}</p>
                      <p className="mt-1 text-xs text-ink-muted">{item.meta}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink-muted">Payment methods</p>
                    <h2 className="mt-2 text-lg font-semibold text-ink">
                      Card, PayPal, Payoneer, and Crypto
                    </h2>
                    <p className="text-sm text-ink-muted">
                      Choose your preferred payment method for subscription charges.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-4 h-10 rounded-xl bg-accent-primary text-white text-sm font-semibold hover:opacity-90 transition"
                  >
                    Add method
                  </button>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="rounded-2xl border border-border bg-main p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-xl bg-accent-primary/10 text-accent-primary grid place-items-center text-xs font-bold">
                            {method.badge}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-ink">{method.label}</p>
                            <p className="text-xs text-ink-muted">{method.description}</p>
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${method.statusClass}`}
                        >
                          {method.status}
                        </span>
                      </div>
                      <p className="mt-4 text-sm text-ink">{method.detail}</p>
                      <div className="mt-5 flex items-center gap-2">
                        <button
                          type="button"
                          className="px-3 h-9 rounded-lg bg-accent-primary text-white text-sm font-semibold hover:opacity-90 transition"
                        >
                          {method.actionLabel}
                        </button>
                        {method.secondaryLabel ? (
                          <button
                            type="button"
                            className="px-3 h-9 rounded-lg border border-border text-sm font-semibold text-ink hover:-translate-y-[1px] hover:shadow-soft transition"
                          >
                            {method.secondaryLabel}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-2xl border border-border bg-white p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-ink-muted">Billing details</p>
                      <h2 className="mt-2 text-lg font-semibold text-ink">Invoice information</h2>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className={labelClass}>Billing name</label>
                      <input
                        className={inputClass}
                        defaultValue={user.name || displayName}
                        placeholder="Company or individual"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Billing email</label>
                      <input
                        className={inputClass}
                        defaultValue={user.email || ""}
                        placeholder="billing@company.com"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className={labelClass}>Address</label>
                      <input className={inputClass} placeholder="Street address" />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>City</label>
                      <input className={inputClass} placeholder="City" />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Country/Region</label>
                      <select className={inputClass} defaultValue="US">
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="GB">United Kingdom</option>
                        <option value="AU">Australia</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Postal code</label>
                      <input className={inputClass} placeholder="ZIP / Postal code" />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Tax ID (optional)</label>
                      <input className={inputClass} placeholder="VAT / EIN" />
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      className="px-5 h-11 rounded-xl bg-accent-primary text-white font-semibold hover:opacity-90 transition"
                    >
                      Save billing info
                    </button>
                    <span className="text-xs text-ink-muted">
                      Your billing data is stored securely.
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-white p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-ink-muted">Invoices</p>
                      <h2 className="mt-2 text-lg font-semibold text-ink">Recent activity</h2>
                    </div>
                    <button
                      type="button"
                      className="text-sm font-semibold text-accent-primary hover:opacity-90"
                    >
                      View all
                    </button>
                  </div>
                  <div className="mt-5 space-y-3">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-main px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-ink">{invoice.id}</p>
                          <p className="text-xs text-ink-muted">{invoice.date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-ink">{invoice.amount}</span>
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${invoice.statusClass}`}
                          >
                            {invoice.status}
                          </span>
                          <button
                            type="button"
                            className="text-xs font-semibold text-accent-primary hover:opacity-90"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-white p-6 text-sm text-ink-muted">
              {heading.subtitle}
            </div>
          )}
        </section>
      </div>
      {cropOpen ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[420px] max-w-[90vw]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Edit avatar</h2>
              <button
                type="button"
                onClick={closeCropper}
                className="text-sm text-ink-muted hover:text-ink"
              >
                Close
              </button>
            </div>
            <div className="mt-5 flex flex-col items-center gap-4">
              <div
                className="relative rounded-2xl border border-border bg-[#F7F7F7] overflow-hidden"
                style={{ width: FRAME_SIZE, height: FRAME_SIZE }}
                onWheel={handleWheelZoom}
              >
                {cropPreview ? (
                  <img
                    src={cropPreview}
                    alt="Avatar preview"
                    className="absolute select-none pointer-events-none"
                    style={{
                      width: imageSize.width ? `${imageSize.width * getBaseScale()}px` : "auto",
                      height: imageSize.height ? `${imageSize.height * getBaseScale()}px` : "auto",
                      left: imageSize.width
                        ? `${(FRAME_SIZE - imageSize.width * getBaseScale()) / 2}px`
                        : "50%",
                      top: imageSize.height
                        ? `${(FRAME_SIZE - imageSize.height * getBaseScale()) / 2}px`
                        : "50%",
                      transform: imageSize.width ? "none" : "translate(-50%, -50%)",
                      transformOrigin: "center"
                    }}
                    draggable={false}
                  />
                ) : null}
                <div
                  className="absolute rounded-full border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] cursor-grab"
                  style={{
                    width: getCircleSize(),
                    height: getCircleSize(),
                    left: cropCenter.x - getCircleSize() / 2,
                    top: cropCenter.y - getCircleSize() / 2
                  }}
                  onMouseDown={handleCropDragStart}
                  onTouchStart={handleCropDragStart}
                />
              </div>
              <div className="w-full">
                <label className="text-xs text-ink-muted">Zoom</label>
                <input
                  type="range"
                  min={ZOOM_MIN}
                  max={ZOOM_MAX}
                  step="0.01"
                  value={cropZoom}
                  onChange={(event) => setCropZoom(Number(event.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeCropper}
                  className="px-4 h-10 rounded-xl border border-border text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={uploadCroppedAvatar}
                  disabled={avatarUploading || !cropPreview}
                  className="px-4 h-10 rounded-xl bg-accent-primary text-white text-sm font-semibold disabled:opacity-60"
                >
                  {avatarUploading ? "Uploading..." : "Save"}
                </button>
              </div>
              <p className="text-xs text-ink-muted text-center">
                Drag the circle to select the area. Scroll or use zoom to resize the circle.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};

export default UserProfilePage;
