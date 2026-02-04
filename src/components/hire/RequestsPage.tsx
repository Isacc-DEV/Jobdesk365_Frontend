import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import { API_BASE, TOKEN_KEY } from "../../config";
import { requestsService } from "../../services/requestsService";
import { useUser } from "../../hooks/useUser";
import HireRequestModal from "./HireRequestModal";

const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `$${num.toFixed(2)}`;
};

const formatRate = (value, role) => {
  const base = formatMoney(value);
  if (base === "-") return base;
  const normalizedRole = String(role || "").toLowerCase();
  const suffix = normalizedRole === "caller" ? "/hr" : "/app";
  return `${base}${suffix}`;
};

const formatRoleLabel = (role) => {
  const normalizedRole = String(role || "").toLowerCase();
  if (normalizedRole === "bidder") return "Bidder";
  if (normalizedRole === "caller") return "Caller";
  if (!normalizedRole) return "-";
  return normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);
};

const formatWhen = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const formatWho = (request) => {
  const name = request.assignee_display_name || request.assignee_email || "-";
  const username = request.assignee_username || "";
  if (!name || name === "-") return "-";
  return username ? `${name} (${username})` : name;
};

const renderDetail = (detail) => {
  if (!detail) return "-";
  if (typeof detail === "string") return detail;
  if (typeof detail !== "object") return String(detail);

  const profileName = detail.profile_name || detail.profileName || detail.profile;
  const jobUrl = detail.job_url || detail.jobUrl;
  const meetingUrl = detail.meeting_url || detail.meetingUrl;
  const other = detail.other || detail.notes || detail.text;
  const action = detail.action || detail.request_action || detail.type;
  const note = detail.note;

  const rows = [];
  if (profileName) rows.push({ label: "Profile", value: profileName });
  if (action) rows.push({ label: "Action", value: action });
  if (jobUrl) rows.push({ label: "Job URL", value: jobUrl });
  if (meetingUrl) rows.push({ label: "Meeting URL", value: meetingUrl });
  if (other) rows.push({ label: "Other", value: other });
  if (note) rows.push({ label: "Note", value: note });

  if (!rows.length) return "-";

  return (
    <div className="space-y-1 text-xs text-ink">
      {rows.map((row) => (
        <div key={row.label}>
          <span className="font-semibold text-ink-muted">{row.label}: </span>
          <span>{row.value}</span>
        </div>
      ))}
    </div>
  );
};

const formatStatusLabel = (status) => {
  if (status === "pending") return "Pending";
  if (status === "working") return "Working";
  return "Complete";
};

const formatRequester = (request) =>
  request.requester_username || request.requester_email || request.user_id || "-";

const getPersonId = (person) => person?.user_id ?? person?.userId ?? person?.id ?? "";

const getBidderAction = (request) => {
  const detail = request?.detail;
  if (!detail || typeof detail !== "object") return "";
  const action = detail.action || detail.request_action || detail.type;
  return action ? String(action).toLowerCase() : "";
};

const RequestTable = ({
  title,
  items,
  isAdmin,
  onStatusChange,
  onEdit,
  onDelete,
  updatingId
}) => (
  <div className="border border-border bg-white">
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <span className="text-xs text-ink-muted">{items.length} items</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            <th className="px-4 py-3">Request ID</th>
            <th className="px-4 py-3">Requested by</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Detail</th>
            <th className="px-4 py-3">Who</th>
            <th className="px-4 py-3">Rate</th>
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-6 text-center text-ink-muted">
                No requests yet.
              </td>
            </tr>
          ) : (
            items.map((request) => (
              <tr key={request.id} className="border-t border-border">
                <td className="px-4 py-3 text-xs text-ink-muted">
                  {String(request.id).slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-sm text-ink">
                  {formatRequester(request)}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-ink">
                    {formatRoleLabel(request.role)}
                  </span>
                </td>
                <td className="px-4 py-3">{renderDetail(request.detail)}</td>
                <td className="px-4 py-3">{formatWho(request)}</td>
                <td className="px-4 py-3">{formatRate(request.hourly_rate, request.role)}</td>
                <td className="px-4 py-3">{formatWhen(request.when_at)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-ink">
                    {formatStatusLabel(request.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {isAdmin ? (
                    request.status === "pending" ? (
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => onStatusChange?.(request, "working")}
                          disabled={updatingId === request.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-muted hover:text-ink disabled:opacity-60"
                          aria-label="Accept request"
                          title="Accept"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onStatusChange?.(request, "closed")}
                          disabled={updatingId === request.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
                          aria-label="Reject request"
                          title="Reject"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-ink-muted">-</span>
                    )
                  ) : request.status === "pending" ? (
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit?.(request)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-muted hover:text-ink"
                        aria-label="Edit request"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete?.(request)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        aria-label="Delete request"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-ink-muted">-</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const RequestsPage = () => {
  const { user } = useUser();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isAdmin = roles.includes("admin") || roles.includes("manager");
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editRequest, setEditRequest] = useState(null);
  const [editDetail, setEditDetail] = useState({ job_url: "", meeting_url: "", other: "", text: "" });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRequest, setAssignRequest] = useState(null);
  const [assignPeople, setAssignPeople] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      setRequestsError("");
      const items = await requestsService.listRequests({ scope: isAdmin ? "all" : undefined });
      setRequests(items);
    } catch (err) {
      setRequestsError(err?.message || "Unable to load requests.");
    } finally {
      setRequestsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const getRequestProfile = (request) => {
    const detail = request?.detail;
    if (!detail || typeof detail !== "object") return null;
    const profileId = detail.profile_id || detail.profileId;
    const profileName = detail.profile_name || detail.profileName || detail.profile;
    if (!profileId) return null;
    return { id: profileId, name: profileName || profileId };
  };

  const loadAssignPeople = useCallback(async () => {
    try {
      setAssignLoading(true);
      setAssignError("");
      const items = await requestsService.listTalents("bidder");
      setAssignPeople(items);
    } catch (err) {
      setAssignError(err?.message || "Unable to load bidders.");
    } finally {
      setAssignLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!assignOpen) return;
    loadAssignPeople();
  }, [assignOpen, loadAssignPeople]);

  const assignBidderToProfile = async (profileId, bidderUserId) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) throw new Error("Missing token");
    const endpoint = API_BASE ? `${API_BASE}/profiles/${profileId}/assign-bidder` : `/profiles/${profileId}/assign-bidder`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ bidder_user_id: bidderUserId })
    });
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/auth";
      return null;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Unable to assign bidder.");
    }
    return res.json();
  };

  const unassignBidderFromProfile = async (profileId) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) throw new Error("Missing token");
    const endpoint = API_BASE ? `${API_BASE}/profiles/${profileId}/unassign-bidder` : `/profiles/${profileId}/unassign-bidder`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/auth";
      return null;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Unable to unassign bidder.");
    }
    return res.json();
  };

  const openAssignModal = (request) => {
    const profile = getRequestProfile(request);
    if (!profile?.id) {
      setRequestsError("This request is missing the profile.");
      return;
    }
    setAssignRequest({ ...request, profile });
    setAssignError("");
    setAssignOpen(true);
  };

  const closeAssignModal = () => {
    if (assignSubmitting) return;
    setAssignOpen(false);
    setAssignRequest(null);
    setAssignError("");
  };

  const handleAssignSubmit = async ({ assigneeId }) => {
    if (!assignRequest?.profile?.id || !assigneeId) return;
    try {
      setAssignSubmitting(true);
      setAssignError("");
      await assignBidderToProfile(assignRequest.profile.id, assigneeId);
      const selectedPerson = assignPeople.find(
        (person) => String(getPersonId(person)) === String(assigneeId)
      );
      const assigneeDisplayName =
        selectedPerson?.name ||
        selectedPerson?.display_name ||
        selectedPerson?.username ||
        selectedPerson?.email ||
        "";
      const assigneeUsername = selectedPerson?.username || "";
      const assigneeEmail = selectedPerson?.email || "";
      const updated = await requestsService.updateRequest(assignRequest.id, {
        status: "working",
        assignee_user_id: assigneeId
      });
      setRequests((prev) => {
        if (updated?.archived) {
          return prev.filter((item) => item.id !== assignRequest.id);
        }
        return prev.map((item) =>
          item.id === assignRequest.id
            ? {
                ...item,
                ...updated,
                assignee_display_name: assigneeDisplayName || item.assignee_display_name,
                assignee_username: assigneeUsername || item.assignee_username,
                assignee_email: assigneeEmail || item.assignee_email
              }
            : item
        );
      });
      closeAssignModal();
    } catch (err) {
      setAssignError(err?.message || "Unable to assign bidder.");
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleStatusChange = useCallback(
    async (request, status) => {
      if (!request?.id || !isAdmin) return;
      if (status === "working" && String(request.role).toLowerCase() === "bidder") {
        const action = getBidderAction(request);
        if (action === "unassign") {
          const profile = getRequestProfile(request);
          if (!profile?.id) {
            setRequestsError("This request is missing the profile.");
            return;
          }
          try {
            setUpdatingId(request.id);
            setRequestsError("");
            await unassignBidderFromProfile(profile.id);
            const updated = await requestsService.updateRequest(request.id, {
              status: "working",
              assignee_user_id: null
            });
            setRequests((prev) =>
              updated?.archived
                ? prev.filter((item) => item.id !== request.id)
                : prev.map((item) => (item.id === request.id ? { ...item, ...updated } : item))
            );
          } catch (err) {
            setRequestsError(err?.message || "Unable to update request.");
          } finally {
            setUpdatingId("");
          }
          return;
        }
        openAssignModal(request);
        return;
      }
      try {
        setUpdatingId(request.id);
        setRequestsError("");
        const updated = await requestsService.updateRequest(request.id, { status });
        setRequests((prev) =>
          updated?.archived
            ? prev.filter((item) => item.id !== request.id)
            : prev.map((item) => (item.id === request.id ? { ...item, ...updated } : item))
        );
      } catch (err) {
        setRequestsError(err?.message || "Unable to update request.");
      } finally {
        setUpdatingId("");
      }
    },
    [isAdmin]
  );

  const orderedRequests = useMemo(() => {
    const items = Array.isArray(requests) ? [...requests] : [];
    items.sort((a, b) => {
      const aPending = a.status === "pending";
      const bPending = b.status === "pending";
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      return 0;
    });
    return items;
  }, [requests]);

  const openEdit = (request) => {
    if (!request) return;
    const detail = request.detail || {};
    if (String(request.role).toLowerCase() === "caller") {
      setEditDetail({
        job_url: detail.job_url || detail.jobUrl || "",
        meeting_url: detail.meeting_url || detail.meetingUrl || "",
        other: detail.other || detail.notes || "",
        text: ""
      });
    } else {
      const textValue =
        typeof detail === "string" ? detail : detail?.text || detail?.notes || "";
      setEditDetail({ job_url: "", meeting_url: "", other: "", text: textValue });
    }
    setEditRequest(request);
    setEditError("");
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditOpen(false);
    setEditRequest(null);
    setEditError("");
  };

  const handleEditSave = async () => {
    if (!editRequest?.id) return;
    const isCaller = String(editRequest.role).toLowerCase() === "caller";
    const payloadDetail = isCaller
      ? {
          job_url: String(editDetail.job_url || "").trim(),
          meeting_url: String(editDetail.meeting_url || "").trim(),
          other: String(editDetail.other || "").trim()
        }
      : String(editDetail.text || "").trim();

    if (isCaller && (!payloadDetail.job_url || !payloadDetail.meeting_url)) {
      setEditError("Job URL and Meeting URL are required.");
      return;
    }

    try {
      setEditSaving(true);
      setEditError("");
      const updated = await requestsService.updateRequest(editRequest.id, {
        detail: payloadDetail || null
      });
      setRequests((prev) =>
        prev.map((item) => (item.id === editRequest.id ? { ...item, ...updated } : item))
      );
      closeEdit();
    } catch (err) {
      setEditError(err?.message || "Unable to update request.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (request) => {
    if (!request?.id) return;
    const confirmed = window.confirm("Delete this request?");
    if (!confirmed) return;
    try {
      setRequestsError("");
      await requestsService.deleteRequest(request.id);
      setRequests((prev) => prev.filter((item) => item.id !== request.id));
    } catch (err) {
      setRequestsError(err?.message || "Unable to delete request.");
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] border-t border-border px-6 py-6">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Requests</h1>
            <p className="text-sm text-ink-muted">Manage bidder and caller requests.</p>
          </div>
          <button
            type="button"
            onClick={loadRequests}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-ink-muted hover:text-ink"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        {requestsLoading ? (
          <div className="rounded-2xl border border-border bg-white p-6 text-sm text-ink-muted">
            Loading requests...
          </div>
        ) : requestsError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {requestsError}
          </div>
        ) : (
          <div className="grid gap-6">
            <RequestTable
              title="Requests"
              items={orderedRequests}
              isAdmin={isAdmin}
              onStatusChange={handleStatusChange}
              onEdit={openEdit}
              onDelete={handleDelete}
              updatingId={updatingId}
            />
          </div>
        )}
      </div>
      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Edit request</h2>
              <button
                type="button"
                onClick={closeEdit}
                className="text-sm text-ink-muted hover:text-ink"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {String(editRequest?.role || "").toLowerCase() === "caller" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-ink">Job URL</label>
                    <input
                      className="h-11 w-full rounded-xl border border-border px-3 text-sm text-ink"
                      value={editDetail.job_url}
                      onChange={(event) =>
                        setEditDetail((prev) => ({ ...prev, job_url: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-ink">Meeting URL</label>
                    <input
                      className="h-11 w-full rounded-xl border border-border px-3 text-sm text-ink"
                      value={editDetail.meeting_url}
                      onChange={(event) =>
                        setEditDetail((prev) => ({ ...prev, meeting_url: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-ink">Other</label>
                    <textarea
                      className="h-24 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm text-ink"
                      value={editDetail.other}
                      onChange={(event) =>
                        setEditDetail((prev) => ({ ...prev, other: event.target.value }))
                      }
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-ink">Detail</label>
                  <textarea
                    className="h-24 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm text-ink"
                    value={editDetail.text}
                    onChange={(event) =>
                      setEditDetail((prev) => ({ ...prev, text: event.target.value }))
                    }
                  />
                </div>
              )}
              {editError ? <p className="text-sm text-red-600">{editError}</p> : null}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditSave}
                  disabled={editSaving}
                  className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {editSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {assignOpen ? (
        <HireRequestModal
          open={assignOpen}
          title={`Assign bidder to ${assignRequest?.profile?.name || "profile"}`}
          roleLabel="Bidder"
          rateLabel="Rate per application"
          showWhen={false}
          showDetail={false}
          people={assignPeople}
          loading={assignLoading}
          submitting={assignSubmitting}
          initialAssigneeId={assignRequest?.assignee_user_id || ""}
          error={assignError}
          onClose={closeAssignModal}
          onSubmit={handleAssignSubmit}
          submitLabel="Assign bidder"
          submittingLabel="Assigning..."
        />
      ) : null}
    </main>
  );
};

export default RequestsPage;
