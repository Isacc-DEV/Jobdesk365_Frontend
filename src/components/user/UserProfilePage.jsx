import { useState, useEffect } from "react";
import { useUser } from "../../hooks/useUser";

const labelClass = "text-sm font-semibold text-ink";
const inputClass =
  "h-11 w-full rounded-xl border border-border bg-[#F9FAFB] px-3 text-sm text-ink focus:outline focus:outline-2 focus:outline-accent-primary";

const UserProfilePage = () => {
  const { user, updateUser, loading, error, saving } = useUser();
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);

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

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = () => {
    updateUser(form);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="bg-main min-h-[calc(100vh-64px)] border-t border-border px-8 py-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <header className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent-primary/15 text-accent-primary font-bold text-xl grid place-items-center">
            {user.name?.[0] ?? "U"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">Your Profile</h1>
            <p className="text-sm text-ink-muted">View or update your information.</p>
          </div>
        </header>

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
      </div>
    </main>
  );
};

export default UserProfilePage;
