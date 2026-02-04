const ProfileDetailProfileTab = ({
  visible,
  profileForm,
  updateProfileForm,
  assignedBidderLabel,
  emailStatusLabel,
  emailActionLabel,
  onConnectEmail,
  emailConnecting = false
}) => (
  <section className="space-y-4" style={{ display: visible ? "block" : "none" }}>
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-ink">Profile Name</label>
      <input
        type="text"
        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        value={profileForm.name}
        onChange={(event) => updateProfileForm("name", event.target.value)}
      />
    </div>
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-ink">Profile Description</label>
      <textarea
        rows={2}
        className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        value={profileForm.description}
        onChange={(event) => updateProfileForm("description", event.target.value)}
      />
    </div>
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-ink">Assigned Employee</label>
      <div className="rounded-lg border border-border bg-gray-50 px-3 py-2 text-sm text-ink">
        {assignedBidderLabel || "Unassigned"}
      </div>
    </div>
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-ink">Email Address</label>
      <input
        type="email"
        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        value={profileForm.email}
        onChange={(event) => updateProfileForm("email", event.target.value)}
      />
    </div>
    <div className="rounded-xl border border-border px-4 py-3 bg-gray-50">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink">Email Connection Status</p>
          <span
            className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
              profileForm.emailStatus === "connected"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {emailStatusLabel}
          </span>
        </div>
        {emailActionLabel ? (
          <button
            type="button"
            onClick={onConnectEmail}
            disabled={!onConnectEmail || emailConnecting}
            className="px-3 py-1.5 rounded-lg border border-border text-sm font-semibold text-ink hover:text-ink disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {emailConnecting ? "Connecting..." : emailActionLabel}
          </button>
        ) : null}
      </div>
    </div>
  </section>
);

export default ProfileDetailProfileTab;
