import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useUser } from "../../hooks/useUser";

const labelClass = "text-sm font-semibold text-ink";
const inputClass =
  "h-11 w-full rounded-xl border border-border bg-[#F9FAFB] px-3 text-sm text-ink focus:outline focus:outline-2 focus:outline-accent-primary";

const tabs = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "billing", label: "Billing/Payment" },
  { id: "plan", label: "Plan" },
  { id: "setting", label: "Setting" }
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
  setting: {
    title: "Setting",
    subtitle: "Configure account preferences and defaults."
  }
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

  const handleChange =
    (field: keyof ProfileForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = () => {
    if (activeTab !== "profile") return;
    updateUser(form);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const heading = tabHeadings[activeTab] || tabHeadings.profile;

  return (
    <main className="bg-main min-h-[calc(100vh-64px)] border-t border-border px-8 py-8">
      <div className="max-w-1xl mx-auto grid grid-cols-[220px_1fr] gap-6">
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
          <header className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-accent-primary/15 text-accent-primary font-bold text-xl grid place-items-center">
              {user.name?.[0] ?? "U"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink">{heading.title}</h1>
              <p className="text-sm text-ink-muted">{heading.subtitle}</p>
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
                <div className="space-y-2">
                  <label className={labelClass}>Role / Title</label>
                  <input className={inputClass} value={form.role || ""} onChange={handleChange("role")} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Location</label>
                  <input className={inputClass} value={form.location || ""} onChange={handleChange("location")} />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className={labelClass}>Bio</label>
                  <textarea
                    className={`${inputClass} h-24 resize-none`}
                    value={form.bio || ""}
                    onChange={handleChange("bio")}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className={labelClass}>Phone</label>
                  <input className={inputClass} value={form.phone || ""} onChange={handleChange("phone")} />
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
          ) : (
            <div className="rounded-2xl border border-border bg-white p-6 text-sm text-ink-muted">
              {heading.subtitle}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default UserProfilePage;
