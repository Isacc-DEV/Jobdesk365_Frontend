const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-3 text-sm text-ink">
    <span>{label}</span>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-accent-primary" : "bg-gray-200"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  </label>
);

const ProfileDetailBaseInfoTab = ({ visible, baseInfoForm, updateBaseInfoForm }) => (
  <section className="space-y-6" style={{ display: visible ? "block" : "none" }}>
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Name</h3>
      <div className="grid grid-cols-1 gap-4">
        <input
          type="text"
          placeholder="First name"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.firstName}
          onChange={(event) => updateBaseInfoForm("firstName", event.target.value)}
        />
        <input
          type="text"
          placeholder="Last name"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.lastName}
          onChange={(event) => updateBaseInfoForm("lastName", event.target.value)}
        />
      </div>
    </div>

    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Compensation</h3>
      <div className="grid grid-cols-1 gap-4">
        <input
          type="number"
          placeholder="Desired annual salary"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.desiredSalary}
          onChange={(event) => updateBaseInfoForm("desiredSalary", event.target.value)}
        />
        <select
          className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.currency}
          onChange={(event) => updateBaseInfoForm("currency", event.target.value)}
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="CAD">CAD</option>
          <option value="INR">INR</option>
        </select>
      </div>
    </div>

    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Contact</h3>
      <div className="grid grid-cols-1 gap-4">
        <input
          type="email"
          readOnly
          className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-gray-50 text-ink-muted"
          value={baseInfoForm.email}
        />
        <input
          type="text"
          placeholder="Phone country code"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.phoneCountryCode}
          onChange={(event) => updateBaseInfoForm("phoneCountryCode", event.target.value)}
        />
        <input
          type="text"
          placeholder="Phone number"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.phoneNumber}
          onChange={(event) => updateBaseInfoForm("phoneNumber", event.target.value)}
        />
      </div>
    </div>

    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Location</h3>
      <div className="grid grid-cols-1 gap-4">
        <input
          type="text"
          placeholder="City"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.city}
          onChange={(event) => updateBaseInfoForm("city", event.target.value)}
        />
        <input
          type="text"
          placeholder="State"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.state}
          onChange={(event) => updateBaseInfoForm("state", event.target.value)}
        />
        <input
          type="text"
          placeholder="Country"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.country}
          onChange={(event) => updateBaseInfoForm("country", event.target.value)}
        />
        <input
          type="text"
          placeholder="Postal code"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.postalCode}
          onChange={(event) => updateBaseInfoForm("postalCode", event.target.value)}
        />
      </div>
    </div>

    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Links</h3>
      <input
        type="url"
        placeholder="LinkedIn URL"
        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        value={baseInfoForm.linkedInUrl}
        onChange={(event) => updateBaseInfoForm("linkedInUrl", event.target.value)}
      />
    </div>

    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Work Authorization</h3>
      <div className="flex flex-col gap-3">
        <Toggle
          label="Authorized to work"
          checked={baseInfoForm.authorizedToWork}
          onChange={(value) => updateBaseInfoForm("authorizedToWork", value)}
        />
        <Toggle
          label="Needs sponsorship"
          checked={baseInfoForm.needsSponsorship}
          onChange={(value) => updateBaseInfoForm("needsSponsorship", value)}
        />
      </div>
    </div>

    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Education</h3>
      <div className="grid grid-cols-1 gap-4">
        <input
          type="text"
          placeholder="Highest degree"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.highestDegree}
          onChange={(event) => updateBaseInfoForm("highestDegree", event.target.value)}
        />
        <input
          type="text"
          placeholder="School"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.school}
          onChange={(event) => updateBaseInfoForm("school", event.target.value)}
        />
        <input
          type="text"
          placeholder="Field"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.field}
          onChange={(event) => updateBaseInfoForm("field", event.target.value)}
        />
        <input
          type="number"
          placeholder="Graduation year"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.graduationYear}
          onChange={(event) => updateBaseInfoForm("graduationYear", event.target.value)}
        />
      </div>
    </div>
  </section>
);

export default ProfileDetailBaseInfoTab;
