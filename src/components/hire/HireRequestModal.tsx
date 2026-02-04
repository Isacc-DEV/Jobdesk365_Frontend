import { useEffect, useState } from "react";
import Modal from "../common/Modal";

const formatPersonLabel = (person) =>
  person?.display_name ||
  person?.name ||
  person?.username ||
  person?.email ||
  person?.id ||
  "Unknown";

const formatRate = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `$${num.toFixed(2)}`;
};

const getPersonId = (person) => person?.user_id ?? person?.userId ?? person?.id ?? "";

const HireRequestModal = ({
  open,
  title,
  roleLabel,
  rateLabel = "Rate",
  submitLabel = "Send request",
  submittingLabel = "Sending...",
  people = [],
  loading = false,
  submitting = false,
  requireAssignee = true,
  showAssignee = true,
  showWhen = true,
  showDetail = true,
  showJobUrl = false,
  showMeetingUrl = false,
  showOtherNotes = false,
  initialDetail = "",
  initialWhen = "",
  initialAssigneeId = "",
  initialJobUrl = "",
  initialMeetingUrl = "",
  initialOtherNotes = "",
  error = "",
  onClose,
  onSubmit
}) => {
  const [assigneeId, setAssigneeId] = useState(initialAssigneeId);
  const [whenAt, setWhenAt] = useState(initialWhen);
  const [detail, setDetail] = useState(initialDetail);
  const [jobUrl, setJobUrl] = useState(initialJobUrl);
  const [meetingUrl, setMeetingUrl] = useState(initialMeetingUrl);
  const [otherNotes, setOtherNotes] = useState(initialOtherNotes);

  useEffect(() => {
    if (!open) return;
    setAssigneeId(initialAssigneeId || "");
    setWhenAt(initialWhen || "");
    setDetail(initialDetail || "");
    setJobUrl(initialJobUrl || "");
    setMeetingUrl(initialMeetingUrl || "");
    setOtherNotes(initialOtherNotes || "");
  }, [
    open,
    initialAssigneeId,
    initialDetail,
    initialWhen,
    initialJobUrl,
    initialMeetingUrl,
    initialOtherNotes
  ]);

  const selectedPerson = people.find(
    (person) => String(getPersonId(person)) === String(assigneeId)
  );
  const derivedRate =
    selectedPerson?.rate ??
    selectedPerson?.hourly_rate ??
    selectedPerson?.hourlyRate ??
    null;

  const handleSubmit = () => {
    if (requireAssignee && showAssignee && !assigneeId) return;
    if (showJobUrl && !jobUrl) return;
    if (showMeetingUrl && !meetingUrl) return;
    onSubmit?.({
      assigneeId: assigneeId || null,
      hourlyRate: derivedRate,
      whenAt: showWhen ? whenAt || null : null,
      detail: detail || "",
      jobUrl: jobUrl || "",
      meetingUrl: meetingUrl || "",
      otherNotes: otherNotes || ""
    });
  };

  const isInvalid =
    (requireAssignee && showAssignee && !assigneeId) ||
    (showJobUrl && !jobUrl) ||
    (showMeetingUrl && !meetingUrl);

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-ink-muted hover:text-ink"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || isInvalid}
        className="rounded-lg bg-accent-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? submittingLabel : submitLabel}
      </button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={title} footer={footer}>
      <div className="space-y-4">
        {showAssignee ? (
          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">Who ({roleLabel})</label>
            <select
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              disabled={loading || submitting}
            >
              <option value="">{loading ? "Loading..." : `Select ${roleLabel.toLowerCase()}`}</option>
              {people.map((person) => (
                <option key={person.id ?? getPersonId(person)} value={getPersonId(person)}>
                  {formatPersonLabel(person)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className={`grid grid-cols-1 gap-3 ${showWhen ? "md:grid-cols-2" : ""}`}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">{rateLabel}</label>
            <div className="w-full rounded-lg border border-border bg-gray-50 px-3 py-2 text-sm text-ink">
              {formatRate(derivedRate)}
            </div>
          </div>
          {showWhen ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-ink">When</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                value={whenAt}
                onChange={(event) => setWhenAt(event.target.value)}
              />
            </div>
          ) : null}
        </div>

        {showDetail ? (
          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">Detail</label>
            <textarea
              rows={3}
              className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              placeholder="Add detail for this request"
            />
          </div>
        ) : null}
        {showJobUrl ? (
          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">Job URL</label>
            <input
              type="url"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              value={jobUrl}
              onChange={(event) => setJobUrl(event.target.value)}
              placeholder="https://..."
              required
            />
          </div>
        ) : null}
        {showMeetingUrl ? (
          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">Meeting URL</label>
            <input
              type="url"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              value={meetingUrl}
              onChange={(event) => setMeetingUrl(event.target.value)}
              placeholder="https://..."
              required
            />
          </div>
        ) : null}
        {showOtherNotes ? (
          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">Other</label>
            <textarea
              rows={3}
              className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              value={otherNotes}
              onChange={(event) => setOtherNotes(event.target.value)}
              placeholder="Add anything to focus or prepare"
            />
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Modal>
  );
};

export default HireRequestModal;
