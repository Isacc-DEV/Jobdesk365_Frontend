import { useRef, useState } from "react";

const ProfileDetailBaseInfoTab = ({
  visible,
  baseInfoForm,
  updateBaseInfoForm,
  onImportJson,
  onExportJson
}) => {
  const fileInputRef = useRef(null);
  const [importError, setImportError] = useState("");

  const handleImportClick = () => {
    setImportError("");
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid JSON");
      }
      onImportJson?.(parsed);
      setImportError("");
    } catch (err) {
      setImportError("Invalid JSON file.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <section className="space-y-6" style={{ display: visible ? "block" : "none" }}>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={handleImportClick}
          className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-ink-muted hover:text-ink"
        >
          Import JSON
        </button>
        <button
          type="button"
          onClick={onExportJson}
          className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-ink-muted hover:text-ink"
        >
          Export JSON
        </button>
      </div>
      {importError ? (
        <div className="text-xs text-red-600">{importError}</div>
      ) : null}
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Name</h3>
      <div className="grid grid-cols-1 gap-4">
        <input
          type="text"
          placeholder="Prefix"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.prefix}
          onChange={(event) => updateBaseInfoForm("prefix", event.target.value)}
        />
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
        <input
          type="number"
          placeholder="Current salary"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.currentSalary}
          onChange={(event) => updateBaseInfoForm("currentSalary", event.target.value)}
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
        <input
          type="text"
          placeholder="Notice period"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.noticePeriod}
          onChange={(event) => updateBaseInfoForm("noticePeriod", event.target.value)}
        />
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
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Credentials</h3>
      <input
        type="password"
        placeholder="Password"
        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        value={baseInfoForm.password}
        onChange={(event) => updateBaseInfoForm("password", event.target.value)}
      />
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
          placeholder="Nationality"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.nationality}
          onChange={(event) => updateBaseInfoForm("nationality", event.target.value)}
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
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Identity</h3>
      <div className="grid grid-cols-1 gap-4">
        <input
          type="text"
          placeholder="Gender"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.gender}
          onChange={(event) => updateBaseInfoForm("gender", event.target.value)}
        />
        <input
          type="text"
          placeholder="Race / ethnicity"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.raceEthnicity}
          onChange={(event) => updateBaseInfoForm("raceEthnicity", event.target.value)}
        />
        <input
          type="text"
          placeholder="Sexual orientation"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.sexualOrientation}
          onChange={(event) => updateBaseInfoForm("sexualOrientation", event.target.value)}
        />
        <input
          type="text"
          placeholder="Disability status"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.disabilityStatus}
          onChange={(event) => updateBaseInfoForm("disabilityStatus", event.target.value)}
        />
        <input
          type="text"
          placeholder="Veteran status"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          value={baseInfoForm.veteranStatus}
          onChange={(event) => updateBaseInfoForm("veteranStatus", event.target.value)}
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
    </section>
  );
};

export default ProfileDetailBaseInfoTab;
