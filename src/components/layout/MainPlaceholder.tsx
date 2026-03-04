import { useEffect, useState } from "react";
import { useProfiles } from "../../hooks/useProfiles";
import { useTemplates } from "../../hooks/useTemplates";
import { useUser } from "../../hooks/useUser";
import ProfileList from "../profiles/ProfileList";
import CreateProfileModal from "../profiles/CreateProfileModal";
import TemplateSelectModal from "../profiles/TemplateSelectModal";
import ProfileDetailPanel from "../profiles/ProfileDetailPanel";
import { API_BASE, BACKEND_ORIGIN, TOKEN_KEY } from "../../config";
import Modal from "../common/Modal";
import { requestsService } from "../../services/requestsService";
import HireRequestModal from "../hire/HireRequestModal";
import { getInboxRouteByRoles } from "../../lib/profilesAccess";
import { renderResumeTemplate, sanitizeTemplateResume } from "../../lib/resumeTemplateRenderer";
import {
  openPreviewWindow,
  wrapHtmlIfNeeded,
  writePreviewError,
  writePreviewHtml
} from "../../lib/previewWindow";

const TEMPLATE_ENDPOINT = API_BASE ? `${API_BASE}/templates` : "/templates";

const MainPlaceholder = ({ profileMode = "user" }) => {
  const { user } = useUser();
  const roleScope = Array.isArray(user?.roles) ? user.roles : undefined;
  const roles = roleScope || [];
  const inboxRoute = getInboxRouteByRoles(roles);
  const hasAdminRole = roles.includes("admin");
  const hasManagerRole = roles.includes("manager");
  const isElevatedCreator = hasAdminRole || hasManagerRole;
  const allowEditAnyProfile = hasAdminRole || hasManagerRole;
  const allowDeleteAnyProfile = hasAdminRole;
  const allowDeleteOwnProfile = !hasManagerRole || hasAdminRole;
  const isAdmin = hasAdminRole || hasManagerRole;
  const endpointPath =
    profileMode === "admin"
      ? "/admin/profiles"
      : profileMode === "manager"
      ? "/manager/profiles"
      : "/profiles";
  const {
    profiles,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    fetchProfile,
    startOutlookConnect,
    disconnectOutlookEmail,
    refreshProfiles,
    assignBidder
  } = useProfiles({ endpointPath });
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
  const [emailDisconnecting, setEmailDisconnecting] = useState(false);
  const [emailChanging, setEmailChanging] = useState(false);
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
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerOptions, setOwnerOptions] = useState([]);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerError, setOwnerError] = useState("");

  const currentUserId = user?.id ? String(user.id) : "";
  const currentUsername =
    user?.username || user?.user_name || user?.email || user?.id || "";
  const currentDisplayName = user?.display_name || user?.displayName || "";
  const currentEmail = user?.email || "";

  const normalizeOwnerOption = (candidate) => {
    const id = candidate?.id ? String(candidate.id) : "";
    if (!id) return null;
    return {
      id,
      username: candidate?.username ? String(candidate.username) : id,
      display_name: candidate?.display_name || candidate?.displayName || "",
      email: candidate?.email || ""
    };
  };

  const buildOwnerOptions = (items) => {
    const map = new Map();
    const selfOption = normalizeOwnerOption({
      id: currentUserId,
      username: currentUsername,
      display_name: currentDisplayName,
      email: currentEmail
    });
    if (selfOption) {
      map.set(selfOption.id, selfOption);
    }
    (Array.isArray(items) ? items : []).forEach((item) => {
      const normalized = normalizeOwnerOption(item);
      if (normalized) {
        map.set(normalized.id, normalized);
      }
    });
    return Array.from(map.values());
  };

  useEffect(() => {
    if (!createOpen || !isElevatedCreator) {
      return;
    }

    const query = ownerQuery.trim();

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setOwnerLoading(true);
        setOwnerError("");
        const users = await requestsService.searchUsers(query, {
          roles: roleScope,
          context: "profile_owner"
        });
        if (cancelled) return;
        setOwnerOptions(buildOwnerOptions(users));
      } catch (err) {
        if (cancelled) return;
        setOwnerError(err?.message || "Unable to search users.");
        setOwnerOptions(buildOwnerOptions([]));
      } finally {
        if (!cancelled) {
          setOwnerLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    createOpen,
    isElevatedCreator,
    ownerQuery,
    roleScope,
    currentUserId,
    currentUsername,
    currentDisplayName,
    currentEmail
  ]);

  const openCreateModal = () => {
    setCreateOpen(true);
    if (isElevatedCreator) {
      setOwnerQuery("");
      setOwnerError("");
      setOwnerLoading(false);
      setOwnerOptions(buildOwnerOptions([]));
    }
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setOwnerQuery("");
    setOwnerError("");
    setOwnerLoading(false);
    setOwnerOptions([]);
  };

  useEffect(() => {
    const formatTraceSuffix = (traceId) =>
      traceId && String(traceId).trim() ? ` (trace: ${String(traceId).trim()})` : "";

    const handleMessage = async (event) => {
      if (event.origin !== BACKEND_ORIGIN) return;
      const payload = event.data || {};
      if (payload.type === "email_connected" && payload.profileId) {
        const traceSuffix = formatTraceSuffix(payload.traceId);
        try {
          const updated = await fetchProfile(payload.profileId);
          const updatedEmailAccountId = updated?.raw?.email_account_id || null;
          if (detailProfile?.id === payload.profileId && updated) {
            setDetailProfile(updated);
          }
          await refreshProfiles();

          if (!updatedEmailAccountId) {
            setMessageType("error");
            setMessage(
              `Email callback succeeded, but profile email account is still empty. Check backend logs with trace id${traceSuffix}.`
            );
            return;
          }

          if (payload.emailAccountId && payload.emailAccountId !== updatedEmailAccountId) {
            setMessageType("error");
            setMessage(
              `Email callback returned account ${payload.emailAccountId}, but profile has ${updatedEmailAccountId}.${traceSuffix}`
            );
            return;
          }

          setMessageType("success");
          setMessage(`Email connected successfully${traceSuffix}.`);
        } catch (err) {
          setMessageType("error");
          setMessage(
            err?.message ||
              `Email callback succeeded, but failed to refresh profile${traceSuffix}.`
          );
        }
      }
      if (payload.type === "email_connect_error") {
        const traceSuffix = formatTraceSuffix(payload.traceId);
        setMessageType("error");
        setMessage(payload.message || `Email connection failed${traceSuffix}.`);
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
        const items = await requestsService.listTalents("bidder", { roles: roleScope });
        setAssignPeople(items);
      } catch (err) {
        setAssignError(err?.message || "Unable to load bidders.");
      } finally {
        setAssignLoading(false);
      }
    };
    loadBidders();
  }, [assignModalOpen, roleScope]);

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
      }, { roles: roleScope });
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
      const createPayload = {
        name: payload.name,
        description: payload.description,
        resume_template_id: payload.templateId
      };
      if (isElevatedCreator && payload.ownerUserId) {
        createPayload.user_id = payload.ownerUserId;
      }
      await createProfile(createPayload);
      setMessageType("success");
      setMessage("Profile created successfully.");
    } catch (err) {
      setMessageType("error");
      setMessage(err?.message || "Unable to create profile.");
      throw err;
    }
  };

  const openOutlookConnectFlow = async (profileId) => {
    if (!profileId) return;
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

    const startedAt = Date.now();
    const pollWindow = window.setInterval(async () => {
      const elapsed = Date.now() - startedAt;
      if (!popup.closed && elapsed < 5 * 60 * 1000) {
        return;
      }
      window.clearInterval(pollWindow);
      try {
        const updated = await fetchProfile(profileId);
        if (updated) {
          setDetailProfile((prev) => (prev?.id === profileId ? updated : prev));
        }
        await refreshProfiles();
      } catch {
        // noop: message listener still handles successful callback in normal flow.
      }
    }, 1000);
  };

  const runDisconnectFlow = async (profileId) => {
    const updated = await disconnectOutlookEmail(profileId);
    if (updated) {
      setDetailProfile((prev) => (prev?.id === profileId ? updated : prev));
    }
    await refreshProfiles();
    return updated;
  };

  const handleConnectEmail = async (profileId) => {
    if (!profileId) return;
    try {
      setMessage("");
      setEmailConnecting(true);
      await openOutlookConnectFlow(profileId);
    } catch (err) {
      setMessageType("error");
      setMessage(err?.message || "Unable to start email connection.");
    } finally {
      setEmailConnecting(false);
    }
  };

  const handleDisconnectEmail = async (profileId) => {
    if (!profileId) return;
    const confirmed = window.confirm(
      "Disconnect this profile email? Existing synced emails and calendar events for this account will be removed."
    );
    if (!confirmed) return;

    try {
      setMessage("");
      setEmailDisconnecting(true);
      await runDisconnectFlow(profileId);
      setMessageType("success");
      setMessage("Email disconnected. Synced email/calendar data removed.");
    } catch (err) {
      setMessageType("error");
      setMessage(err?.message || "Unable to disconnect email.");
    } finally {
      setEmailDisconnecting(false);
    }
  };

  const handleChangeEmail = async (profileId) => {
    if (!profileId) return;
    const confirmed = window.confirm(
      "Change connected email account? This will disconnect the current account and remove its synced emails/calendar before reconnecting."
    );
    if (!confirmed) return;

    setMessage("");
    setEmailChanging(true);
    try {
      setEmailDisconnecting(true);
      await runDisconnectFlow(profileId);
      setMessageType("success");
      setMessage("Previous email disconnected. Complete Outlook sign-in to connect a new account.");
    } catch (err) {
      setMessageType("error");
      setMessage(err?.message || "Unable to disconnect current email.");
      setEmailDisconnecting(false);
      setEmailChanging(false);
      return;
    } finally {
      setEmailDisconnecting(false);
    }

    try {
      setEmailConnecting(true);
      await openOutlookConnectFlow(profileId);
    } catch (err) {
      setMessageType("error");
      setMessage(
        `Previous email disconnected. ${err?.message || "Unable to start reconnection. Please reconnect manually."}`
      );
    } finally {
      setEmailConnecting(false);
      setEmailChanging(false);
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
    window.history.pushState({}, "", `${inboxRoute}${query ? `?${query}` : ""}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleOpenResumeTemplates = () => {
    if (typeof window === "undefined") return;
    window.history.pushState({}, "", "/resume-templates");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const splitLines = (value) =>
    String(value || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const buildResumePreviewPayload = (profile) => {
    const raw = profile?.raw || {};
    let resume = raw.base_resume ?? raw.baseResume;
    if (!resume) {
      throw new Error("This profile has no base resume to preview.");
    }
    if (typeof resume === "string") {
      try {
        resume = JSON.parse(resume);
      } catch {
        throw new Error("Base resume JSON is invalid.");
      }
    }
    if (!resume || typeof resume !== "object" || Array.isArray(resume)) {
      throw new Error("Base resume format is invalid.");
    }

    const profileBlock = resume.Profile || resume.profile || {};
    const contactBlock = profileBlock.contact || resume.contact || {};
    const experienceSource =
      resume.workExperience || resume.work_experience || resume.workExperience || resume.experience || [];
    const educationSource = resume.education || resume.educationHistory || [];
    const skillsValue =
      resume.skills?.raw || resume.skills?.skills || resume.skills || resume.skill || [];
    const skills = Array.isArray(skillsValue)
      ? skillsValue.map((item) => String(item || "").trim()).filter(Boolean)
      : typeof skillsValue === "string"
      ? skillsValue
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    return {
      Profile: {
        name:
          profileBlock.name || resume.name || resume.full_name || resume.fullName || profile?.name || "",
        headline: profileBlock.headline || resume.headline || profile?.subtitle || "",
        contact: {
          location: contactBlock.location || resume.location || resume.location_text || resume.locationText || "",
          email: contactBlock.email || resume.email || "",
          phone: contactBlock.phone || resume.phone || resume.phone_number || resume.phoneNumber || "",
          linkedin: contactBlock.linkedin || resume.linkedin || resume.linkedin_url || resume.linkedinUrl || ""
        }
      },
      summary: {
        text: resume.summary?.text || resume.summary?.summary || resume.summary || ""
      },
      workExperience: (Array.isArray(experienceSource) ? experienceSource : []).map((exp) => ({
        companyTitle: exp?.companyTitle || exp?.company_name || exp?.companyName || "",
        roleTitle: exp?.roleTitle || exp?.role_title || "",
        employmentType: exp?.employmentType || exp?.employment_type || "",
        location: exp?.location || exp?.location_text || exp?.locationText || "",
        startDate: exp?.startDate || exp?.start_date || "",
        endDate: exp?.isPresent ? "Present" : exp?.endDate || exp?.end_date || "",
        bullets: splitLines(exp?.bullets ?? exp?.bullet_points ?? exp?.bulletPoints ?? "")
      })),
      education: (Array.isArray(educationSource) ? educationSource : []).map((edu) => ({
        institution: edu?.institution || edu?.school || "",
        degree: edu?.degree || "",
        field: edu?.field || edu?.major || "",
        date: edu?.date || edu?.graduationDate || "",
        coursework: splitLines(edu?.coursework ?? edu?.courses ?? "")
      })),
      skills: { raw: skills }
    };
  };

  const fetchTemplateCodeById = async (templateId) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      throw new Error("Missing token.");
    }
    const res = await fetch(`${TEMPLATE_ENDPOINT}/${templateId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/auth";
      throw new Error("Authentication required.");
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Unable to load template (${res.status}).`);
    }
    const data = await res.json();
    const code = typeof data?.code === "string" ? data.code : "";
    if (!code.trim()) {
      throw new Error("Template HTML is empty.");
    }
    return code;
  };

  const handlePreviewBaseResume = async (profile) => {
    const popup = openPreviewWindow();
    if (!popup) {
      setMessageType("error");
      setMessage("Popup blocked. Please allow popups and try again.");
      return;
    }
    try {
      const templateId = profile?.templateId || profile?.raw?.resume_template_id;
      if (!templateId) {
        throw new Error("No resume template selected for this profile.");
      }
      const templateCode = await fetchTemplateCodeById(String(templateId));
      const resumePayload = sanitizeTemplateResume(buildResumePreviewPayload(profile));
      const rendered = renderResumeTemplate(templateCode, resumePayload);
      writePreviewHtml(popup, wrapHtmlIfNeeded(rendered || templateCode));
    } catch (err) {
      const message = err?.message || "Unable to open preview.";
      writePreviewError(popup, message);
      setMessageType("error");
      setMessage(message);
    }
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
            onClick={openCreateModal}
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
          onPreview={handlePreviewBaseResume}
          onBidderRequest={handleBidderRequest}
          onTemplatesOpen={handleOpenResumeTemplates}
          allowBidderAssign={isAdmin}
          allowEditAny={allowEditAnyProfile}
          allowDeleteAny={allowDeleteAnyProfile}
          allowDeleteOwn={allowDeleteOwnProfile}
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
        onClose={closeCreateModal}
        onCreate={handleCreate}
        templates={templates}
        templatesLoading={templatesLoading}
        templatesError={templatesError}
        requireOwnerSelection={isElevatedCreator}
        ownerQuery={ownerQuery}
        ownerOptions={ownerOptions}
        ownerLoading={ownerLoading}
        ownerError={ownerError}
        onOwnerQueryChange={setOwnerQuery}
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
        onDisconnectEmail={handleDisconnectEmail}
        onChangeEmail={handleChangeEmail}
        emailDisconnecting={emailDisconnecting}
        emailChanging={emailChanging}
      />
    </main>
  );
};

export default MainPlaceholder;
