const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

const ProfileDetailProfileTab = ({
  visible,
  profileForm,
  updateProfileForm,
  selectedBidder,
  bidderOptions,
  emailStatusLabel,
  emailActionLabel
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
      <label className="text-sm font-medium text-ink">Assigned Bidder</label>
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gray-100 text-ink-muted flex items-center justify-center text-xs font-semibold">
          {selectedBidder?.avatar ? (
            <img
              src={selectedBidder.avatar}
              alt={selectedBidder.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : selectedBidder?.name ? (
            getInitials(selectedBidder.name)
          ) : (
            "-"
          )}
        </div>
        <select
          className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={profileForm.assignedBidderId}
          onChange={(event) => updateProfileForm("assignedBidderId", event.target.value)}
        >
          <option value="">Unassigned</option>
          {bidderOptions.map((bidder) => (
            <option key={bidder.id} value={bidder.id}>
              {bidder.name}
            </option>
          ))}
        </select>
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
            onClick={() => updateProfileForm("emailStatus", "connected")}
            className="px-3 py-1.5 rounded-lg border border-border text-sm font-semibold text-ink hover:text-ink"
          >
            {emailActionLabel}
          </button>
        ) : null}
      </div>
    </div>
  </section>
);

export default ProfileDetailProfileTab;
