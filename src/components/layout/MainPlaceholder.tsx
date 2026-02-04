import { useEffect, useState } from "react";
import { useProfiles } from "../../hooks/useProfiles";
import { useTemplates } from "../../hooks/useTemplates";
import { useUser } from "../../hooks/useUser";
import ProfileList from "../profiles/ProfileList";
import CreateProfileModal from "../profiles/CreateProfileModal";
import TemplateSelectModal from "../profiles/TemplateSelectModal";
import ProfileDetailPanel from "../profiles/ProfileDetailPanel";
import { BACKEND_ORIGIN } from "../../config";
import Modal from "../common/Modal";
import { requestsService } from "../../services/requestsService";
import HireRequestModal from "../hire/HireRequestModal";

const MainPlaceholder = () => {
  const { user } = useUser();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isAdmin = roles.includes("admin") || roles.includes("manager");
  const {
    profiles,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    fetchProfile,
    startOutlookConnect,
    refreshProfiles,
    assignBidder
  } = useProfiles({ scope: isAdmin ? "all" : undefined });
  const { templates, loading: templatesLoading, error: templatesError } = useTemplates();
  const [createOpen, setCreateOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateProfile, setTemplateProfile] = useState(null);
  const [templateAnchor, setTemplateAnchor] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailProfile, setDetailProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [emailConnecting, setEmailConnecting] = useState(false);
  const [bidderModalOpen, setBidderModalOpen] = useState(false);
  const [bidderModalProfile, setBidderModalProfile] = useState(null);
  const [bidderAction, setBidderAction] = useState("assign");
  const [bidderNote, setBidderNote] = useState("");
  const [bidderSubmitting, setBidderSubmitting] = useState(false);
  const [bidderError, setBidderError] = useState("");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignProfile, setAssignProfile] = useState(null);
  const [assignPeople, setAssignPeople] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState("");

  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.origin !== BACKEND_ORIGIN) return;
      const payload = event.data || {};
      if (payload.type === "email_connected" && payload.profileId) {
        try {
          const updated = await fetchProfile(payload.profileId);
          if (detailProfile?.id === payload.profileId && updated) {
            setDetailProfile(updated);
          }
          await refreshProfiles();
          setMessageType("success");
          setMessage("Email connected successfully.");
        } catch (err) {
          setMessageType("error");
          setMessage(err?.message || "Email connected, but failed to refresh profile.");
        }
      }
      if (payload.type === "email_connect_error") {
        setMessageType("error");
        setMessage(payload.message || "Email connection failed.");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [detailProfile, fetchProfile, refreshProfiles]);

  const handleBidderRequest = (profile) => {
    if (isAdmin) {
      setAssignProfile(profile);
      setAssignError("");
      setAssignModalOpen(true);
      return;
    }
    setBidderModalProfile(profile);
    const hasAssigned = Boolean(profile?.assignedBidderId);
    setBidderAction(hasAssigned ? "reassign" : "assign");
    setBidderNote("");
    setBidderError("");
    setBidderModalOpen(true);
  };

  useEffect(() => {
    if (!assignModalOpen) return;
    const loadBidders = async () => {
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
    };
    loadBidders();
  }, [assignModalOpen]);

  const closeBidderModal = () => {
    if (bidderSubmitting) return;
    setBidderModalOpen(false);
    setBidderModalProfile(null);
    setBidderNote("");
    setBidderAction("assign");
    setBidderError("");
  };

  const closeAssignModal = () => {
    if (assignSubmitting) return;
    setAssignModalOpen(false);
    setAssignProfile(null);
    setAssignError("");
  };

  const handleBidderSubmit = async () => {
    if (!bidderModalProfile) return;
    try {
      setBidderSubmitting(true);
      setBidderError("");
      const hasAssigned = Boolean(bidderModalProfile?.assignedBidderId);
      if ((bidderAction === "unassign" || bidderAction === "reassign") && !hasAssigned) {
        setBidderError("This profile is not assigned yet.");
        return;
      }
      await requestsService.createRequest({
        role: "bidder",
        detail: {
          profile_id: bidderModalProfile.id,
          profile_name: bidderModalProfile.name,
          action: bidderAction,
          note: bidderNote || ""
        }
      });
      setMessageType("success");
      setMessage("Bidder request sent.");
      setBidderModalOpen(false);
      setBidderModalProfile(null);
    } catch (err) {
      const fallback = "Unable to send request.";
      setBidderError(err?.message || fallback);
      setMessageType("error");
      setMessage(err?.message || fallback);
    } finally {
      setBidderSubmitting(false);
    }
  };

  const getPersonId = (person) => person?.user_id ?? person?.userId ?? person?.id ?? "";

  const handleAssignSubmit = async ({ assigneeId }) => {
    if (!assignProfile?.id || !assigneeId) return;
    const selected = assignPeople.find(
      (person) => String(getPersonId(person)) === String(assigneeId)
    );
    const bidderName =
      selected?.name ||
      selected?.display_name ||
      selected?.username ||
      selected?.email ||
      "this bidder";
    const confirmed = window.confirm(
      `Assign ${bidderName} to "${assignProfile.name}"?`
    );
    if (!confirmed) return;
    try {
      setAssignSubmitting(true);
      setAssignError("");
      await assignBidder(assignProfile.id, assigneeId);
      setMessageType("success");
      setMessage("Bidder assigned.");
      setAssignModalOpen(false);
      setAssignProfile(null);
    } catch (err) {
      setAssignError(err?.message || "Unable to assign bidder.");
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleCreate = async (payload) => {
    try {
      setMessage("");
      await createProfile({
        name: payload.name,
        description: payload.description,
        resume_template_id: payload.templateId
      });
      setMessageType("success");
      setMessage("Profile created successfully.");
    } catch (err) {
      setMessageType("error");
      setMessage(err?.message || "Unable to create profile.");
      throw err;
    }
  };

  const handleConnectEmail = async (profileId) => {
    if (!profileId) return;
    try {
      setMessage("");
      setEmailConnecting(true);
      const authUrl = await startOutlookConnect(profileId);
      if (!authUrl) return;
      const width = 600;
      const height = 720;
      const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
      const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
      const popup = window.open(
        authUrl,
        "outlook-connect",
        `width=${width},height=${height},left=${left},top=${top}`
      );
      if (!popup) {
        throw new Error("Popup blocked. Please allow popups and try again.");
      }
    } catch (err) {
      setMessageType("error");
      setMessage(err?.message || "Unable to start email connection.");
    } finally {
      setEmailConnecting(false);
    }
  };

  const handleOpenInbox = (profile) => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (profile?.raw?.email_account_id) {
      params.set("account_id", profile.raw.email_account_id);
    } else if (profile?.id) {
      params.set("profile_id", profile.id);
    }
    const query = params.toString();
    window.history.pushState({}, "", `/inbox${query ? `?${query}` : ""}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleOpenResumeTemplates = () => {
    if (typeof window === "undefined") return;
    window.history.pushState({}, "", "/resume-templates");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <main className="bg-main min-h-[calc(100vh-64px)] border-t border-border px-8 py-8">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Profiles</h1>
            <p className="text-sm text-ink-muted">Control & overview of profile activity.</p>
          </div>
          <button
            className="px-4 py-2 rounded-lg bg-accent-primary text-white text-sm font-semibold"
            onClick={() => setCreateOpen(true)}
          >
            Create Profile
          </button>
        </div>
        <ProfileList
          profiles={profiles}
          loading={loading}
          error={error}
          onTemplateClick={(profile, anchor) => {
            setTemplateProfile(profile);
            setTemplateAnchor(anchor);
            setTemplateOpen(true);
          }}
          onEmailOpen={handleOpenInbox}
          onDelete={async (profile) => {
            if (!profile?.id) return;
            const confirmed = window.confirm(`Delete profile "${profile.name}"?`);
            if (!confirmed) return;
            try {
              await deleteProfile(profile.id);
              if (detailProfile?.id === profile.id) {
                setDetailOpen(false);
                setDetailProfile(null);
              }
              setMessageType("success");
              setMessage("Profile deleted.");
            } catch (err) {
              setMessageType("error");
              setMessage(err?.message || "Unable to delete profile.");
            }
          }}
          onOpen={(profile) => {
            setDetailProfile(profile);
            setDetailOpen(true);
          }}
          onBidderRequest={handleBidderRequest}
          onTemplatesOpen={handleOpenResumeTemplates}
          allowBidderAssign={isAdmin}
          showOwner={isAdmin}
        />
        {message ? (
          <div
            className={`text-sm px-4 py-3 rounded-lg border ${
              messageType === "success"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {message}
          </div>
        ) : null}
      </div>
      <CreateProfileModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
        templates={templates}
        templatesLoading={templatesLoading}
        templatesError={templatesError}
      />
      <TemplateSelectModal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        templates={templates}
        loading={templatesLoading}
        error={templatesError}
        profile={templateProfile}
        anchor={templateAnchor}
        onConfirm={async (template) => {
          if (!templateProfile) return;
          await updateProfile(templateProfile.id, { resume_template_id: template.id });
          setMessageType("success");
          setMessage(`Template updated to ${template.title}.`);
        }}
      />
      <Modal
        open={bidderModalOpen}
        onClose={closeBidderModal}
        title="Bidder request"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeBidderModal}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink"
              disabled={bidderSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBidderSubmit}
              disabled={bidderSubmitting}
              className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {bidderSubmitting ? "Sending..." : "Send request"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-gray-50 px-4 py-3 text-sm">
            <div className="text-xs uppercase tracking-wide text-ink-muted">Profile</div>
            <div className="mt-1 font-semibold text-ink">{bidderModalProfile?.name || "-"}</div>
            <div className="mt-3 text-xs uppercase tracking-wide text-ink-muted">Current bidder</div>
            <div className="mt-1 text-sm text-ink">
              {bidderModalProfile?.assignedBidderLabel || "Unassigned"}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink">Action</label>
            <div className="grid gap-2">
              {bidderModalProfile?.assignedBidderId ? (
                <>
                  <button
                    type="button"
                    onClick={() => setBidderAction("reassign")}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      bidderAction === "reassign"
                        ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                        : "border-border text-ink hover:bg-gray-50"
                    }`}
                  >
                    Reassign bidder
                    <span className="mt-1 block text-xs font-normal text-ink-muted">
                      Request a new bidder for this profile.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBidderAction("unassign")}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      bidderAction === "unassign"
                        ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                        : "border-border text-ink hover:bg-gray-50"
                    }`}
                  >
                    Unassign bidder
                    <span className="mt-1 block text-xs font-normal text-ink-muted">
                      Remove the current bidder from this profile.
                    </span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setBidderAction("assign")}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                    bidderAction === "assign"
                      ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                      : "border-border text-ink hover:bg-gray-50"
                  }`}
                >
                  Assign bidder
                  <span className="mt-1 block text-xs font-normal text-ink-muted">
                    Ask a manager to assign a bidder.
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink">Note (optional)</label>
            <textarea
              className="h-24 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm text-ink"
              value={bidderNote}
              onChange={(event) => setBidderNote(event.target.value)}
              placeholder="Add any context for the manager..."
            />
          </div>

          {bidderError ? <p className="text-sm text-red-600">{bidderError}</p> : null}
        </div>
      </Modal>
      {assignModalOpen ? (
        <HireRequestModal
          open={assignModalOpen}
          title={`Assign bidder to ${assignProfile?.name || "profile"}`}
          roleLabel="Bidder"
          rateLabel="Rate per application"
          showWhen={false}
          showDetail={false}
          people={assignPeople}
          loading={assignLoading}
          submitting={assignSubmitting}
          initialAssigneeId={assignProfile?.assignedBidderId || ""}
          error={assignError}
          onClose={closeAssignModal}
          onSubmit={handleAssignSubmit}
          submitLabel="Assign bidder"
          submittingLabel="Assigning..."
        />
      ) : null}
      <ProfileDetailPanel
        open={detailOpen}
        profile={detailProfile}
        onClose={() => setDetailOpen(false)}
        onSaveProfile={async (payload) => {
          if (!detailProfile) return;
          const updated = await updateProfile(detailProfile.id, {
            name: payload.name,
            description: payload.description
          });
          setDetailProfile(updated);
          setMessageType("success");
          setMessage("Profile details saved.");
        }}
        onSaveBaseInfo={async (payload) => {
          if (!detailProfile) return;
          const updated = await updateProfile(detailProfile.id, {
            base_info: payload
          });
          setDetailProfile(updated);
          setMessageType("success");
          setMessage("Base info saved.");
        }}
        onSaveBaseResume={async (payload) => {
          if (!detailProfile) return;
          const updated = await updateProfile(detailProfile.id, {
            base_resume: payload
          });
          setDetailProfile(updated);
          setMessageType("success");
          setMessage("Base resume saved.");
        }}
        onConnectEmail={handleConnectEmail}
        emailConnecting={emailConnecting}
      />
    </main>
  );
};

export default MainPlaceholder;
