import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import ProfileDetailProfileTab from "./ProfileDetailProfileTab";
import ProfileDetailBaseInfoTab from "./ProfileDetailBaseInfoTab";
import ProfileDetailBaseResumeTab from "./ProfileDetailBaseResumeTab";

const tabs = [
  { id: "profile", label: "Profile" },
  { id: "baseInfo", label: "Base Info" },
  { id: "baseResume", label: "Base Resume" }
];

const normalizeEmailStatus = (status, fallbackConnected) => {
  if (!status) return fallbackConnected ? "connected" : "not_connected";
  const normalized = String(status).toLowerCase();
  if (normalized === "active" || normalized === "connected") return "connected";
  if (normalized === "expired" || normalized === "revoked" || normalized === "error") {
    return "expired";
  }
  return "not_connected";
};

const buildProfileForm = (profile) => {
  const raw = profile?.raw || {};
  const baseInfo = raw.base_info || raw.baseInfo || {};
  return {
    name: profile?.name || raw.name || "",
    description: raw.description || raw.profile_description || profile?.subtitle || "",
    assignedBidderId: raw.assigned_bidder_user_id || "",
    email: profile?.email || baseInfo.email || "",
    emailStatus: normalizeEmailStatus(raw.email_status || raw.email_connection_status, profile?.emailConnected)
  };
};

const buildBaseInfoForm = (profile) => {
  const raw = profile?.raw || {};
  const baseInfo = raw.base_info || raw.baseInfo || {};
  return {
    prefix: baseInfo.prefix || baseInfo.name_prefix || "",
    firstName: baseInfo.first_name || baseInfo.firstName || "",
    lastName: baseInfo.last_name || baseInfo.lastName || "",
    desiredSalary: baseInfo.desired_annual_salary || baseInfo.desiredAnnualSalary || "",
    currentSalary: baseInfo.current_salary || baseInfo.currentSalary || "",
    noticePeriod: baseInfo.notice_period || baseInfo.noticePeriod || "",
    currency: baseInfo.currency || "USD",
    email: baseInfo.email || profile?.email || "",
    password: baseInfo.password || baseInfo.profile_password || "",
    phoneCountryCode: baseInfo.phone_country_code || baseInfo.phoneCountryCode || "",
    phoneNumber: baseInfo.phone_number || baseInfo.phoneNumber || "",
    city: baseInfo.city || "",
    state: baseInfo.state || "",
    country: baseInfo.country || "",
    nationality: baseInfo.nationality || "",
    gender: baseInfo.gender || "",
    postalCode: baseInfo.postal_code || baseInfo.postalCode || "",
    linkedInUrl: baseInfo.linkedin_url || baseInfo.linkedinUrl || "",
    raceEthnicity: baseInfo.race_ethnicity || baseInfo.raceEthnicity || "",
    sexualOrientation: baseInfo.sexual_orientation || baseInfo.sexualOrientation || "",
    disabilityStatus: baseInfo.disability_status || baseInfo.disabilityStatus || "",
    veteranStatus: baseInfo.veteran_status || baseInfo.veteranStatus || ""
  };
};

const normalizeExperience = (exp) => {
  const endDate = exp?.end_date || exp?.endDate || "";
  const isPresent = exp?.isPresent || String(endDate).toLowerCase() === "present";
  const bulletsValue = exp?.bullets ?? exp?.bullet_points ?? exp?.bulletPoints ?? "";
  const bullets = Array.isArray(bulletsValue)
    ? bulletsValue.filter(Boolean).join("\n")
    : bulletsValue || "";
  return {
    id: exp?.id || `exp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    companyName: exp?.companyTitle || exp?.company_name || exp?.companyName || "",
    roleTitle: exp?.roleTitle || exp?.role_title || "",
    employmentType: exp?.employmentType || exp?.employment_type || "",
    location: exp?.location || exp?.location_text || exp?.locationText || "",
    startDate: exp?.startDate || exp?.start_date || "",
    endDate: isPresent ? "Present" : endDate,
    isPresent,
    bullets
  };
};

const buildResumeForm = (profile) => {
  const raw = profile?.raw || {};
  const resume = raw.base_resume || raw.baseResume || {};
  const profileBlock = resume.Profile || resume.profile || {};
  const contactBlock = profileBlock.contact || resume.contact || {};
  const summaryValue =
    resume.summary?.text || resume.summary?.summary || resume.summary || "";
  const skillsValue =
    resume.skills?.raw ||
    resume.skills?.skills ||
    resume.skills ||
    resume.skill ||
    [];
  const skills = Array.isArray(skillsValue)
    ? skillsValue.filter(Boolean)
    : typeof skillsValue === "string"
    ? skillsValue
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
  const experienceSource =
    resume.workExperience || resume.work_experience || resume.workExperience || resume.experience || [];
  const experienceItems = Array.isArray(experienceSource) ? experienceSource : [];
  return {
    name: profileBlock.name || resume.name || resume.full_name || resume.fullName || "",
    location: contactBlock.location || resume.location || resume.location_text || resume.locationText || "",
    email: contactBlock.email || resume.email || "",
    phone: contactBlock.phone || resume.phone || resume.phone_number || resume.phoneNumber || "",
    linkedin: contactBlock.linkedin || resume.linkedin || resume.linkedin_url || resume.linkedinUrl || "",
    headline: profileBlock.headline || resume.headline || "",
    summary: summaryValue,
    skills,
    experience: experienceItems.map(normalizeExperience)
  };
};

const buildResumeExport = (form) => {
  const skills = Array.isArray(form.skills) ? form.skills.filter(Boolean) : [];
  const experienceItems = Array.isArray(form.experience) ? form.experience : [];
  const workExperience = experienceItems.map((exp) => {
    const bullets = typeof exp.bullets === "string"
      ? exp.bullets
          .split("\n")
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      : Array.isArray(exp.bullets)
      ? exp.bullets.filter(Boolean)
      : [];
    return {
      companyTitle: exp.companyName || "",
      roleTitle: exp.roleTitle || "",
      employmentType: exp.employmentType || "",
      location: exp.location || "",
      startDate: exp.startDate || "",
      endDate: exp.isPresent ? "Present" : exp.endDate || "",
      bullets: bullets.length ? bullets : [""]
    };
  });

  return {
    Profile: {
      name: form.name || "",
      headline: form.headline || "",
      contact: {
        location: form.location || "",
        email: form.email || "",
        phone: form.phone || "",
        linkedin: form.linkedin || ""
      }
    },
    summary: { text: form.summary || "" },
    workExperience: workExperience.length ? workExperience : [
      {
        companyTitle: "",
        roleTitle: "",
        employmentType: "",
        location: "",
        startDate: "",
        endDate: "",
        bullets: [""]
      }
    ],
    education: [
      {
        institution: "",
        degree: "",
        field: "",
        date: "",
        coursework: [""]
      }
    ],
    skills: { raw: skills.length ? skills : [""] }
  };
};

const downloadJson = (filename, data) => {
  if (typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

type ProfileDetailPanelProps = {
  open: boolean;
  onClose: () => void;
  profile?: any;
  bidders?: any[];
  onSaveProfile?: (payload: any) => Promise<void> | void;
  onSaveBaseInfo?: (payload: any) => Promise<void> | void;
  onSaveBaseResume?: (payload: any) => Promise<void> | void;
  onConnectEmail?: (profileId: string) => Promise<void> | void;
  emailConnecting?: boolean;
};

const ProfileDetailPanel = ({
  open,
  onClose,
  profile,
  bidders = [],
  onSaveProfile,
  onSaveBaseInfo,
  onSaveBaseResume,
  onConnectEmail,
  emailConnecting = false
}: ProfileDetailPanelProps) => {
  const [activeTab, setActiveTab] = useState("profile");
  const [dirtyTabs, setDirtyTabs] = useState({
    profile: false,
    baseInfo: false,
    baseResume: false
  });
  const [savingTab, setSavingTab] = useState(null);
  const [profileForm, setProfileForm] = useState(() => buildProfileForm(profile));
  const [baseInfoForm, setBaseInfoForm] = useState(() => buildBaseInfoForm(profile));
  const [resumeForm, setResumeForm] = useState(() => buildResumeForm(profile));
  const [skillsInput, setSkillsInput] = useState("");

  useEffect(() => {
    setProfileForm(buildProfileForm(profile));
    setBaseInfoForm(buildBaseInfoForm(profile));
    setResumeForm(buildResumeForm(profile));
    setDirtyTabs({ profile: false, baseInfo: false, baseResume: false });
    setActiveTab("profile");
    setSkillsInput("");
  }, [profile]);

  const bidderOptions = useMemo(() => {
    if (Array.isArray(bidders) && bidders.length > 0) return bidders;
    const raw = profile?.raw;
    if (Array.isArray(raw?.bidders)) return raw.bidders;
    return [];
  }, [bidders, profile]);

  const selectedBidder = bidderOptions.find(
    (bidder) => String(bidder.id) === String(profileForm.assignedBidderId)
  );

  const markDirty = (tab) => {
    setDirtyTabs((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
  };

  const updateProfileForm = (key, value) => {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
    markDirty("profile");
  };

  const updateBaseInfoForm = (key, value) => {
    setBaseInfoForm((prev) => ({ ...prev, [key]: value }));
    markDirty("baseInfo");
  };

  const updateResumeForm = (key, value) => {
    setResumeForm((prev) => ({ ...prev, [key]: value }));
    markDirty("baseResume");
  };

  const updateExperience = (id, key, value) => {
    setResumeForm((prev) => ({
      ...prev,
      experience: prev.experience.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    }));
    markDirty("baseResume");
  };

  const addExperience = () => {
    setResumeForm((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        normalizeExperience({
          id: `exp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          isPresent: false
        })
      ]
    }));
    markDirty("baseResume");
  };

  const removeExperience = (id) => {
    setResumeForm((prev) => ({
      ...prev,
      experience: prev.experience.filter((item) => item.id !== id)
    }));
    markDirty("baseResume");
  };

  const addSkill = (value) => {
    const trimmed = value.trim().replace(/,$/, "");
    if (!trimmed) return;
    setResumeForm((prev) => {
      const exists = prev.skills.some((skill) => skill.toLowerCase() === trimmed.toLowerCase());
      if (exists) return prev;
      return { ...prev, skills: [...prev.skills, trimmed] };
    });
    setSkillsInput("");
    markDirty("baseResume");
  };

  const removeSkill = (value) => {
    setResumeForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== value)
    }));
    markDirty("baseResume");
  };

  const handleSkillKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addSkill(skillsInput);
    }
    if (event.key === "Backspace" && !skillsInput && resumeForm.skills.length) {
      removeSkill(resumeForm.skills[resumeForm.skills.length - 1]);
    }
  };

  const handleSave = async () => {
    if (!dirtyTabs[activeTab] || savingTab) return;
    setSavingTab(activeTab);
    try {
      if (activeTab === "profile") {
        await onSaveProfile?.(profileForm);
      } else if (activeTab === "baseInfo") {
        await onSaveBaseInfo?.(baseInfoForm);
      } else if (activeTab === "baseResume") {
        await onSaveBaseResume?.(resumeForm);
      }
      setDirtyTabs((prev) => ({ ...prev, [activeTab]: false }));
    } finally {
      setSavingTab(null);
    }
  };

  const emailStatusLabel = profileForm.emailStatus === "connected" ? "Connected" : "Not Connected";
  const emailActionLabel =
    profileForm.emailStatus === "expired"
      ? "Reconnect"
      : profileForm.emailStatus === "not_connected"
      ? "Connect"
      : null;

  const handleConnectEmail = () => {
    if (profile?.id) {
      onConnectEmail?.(profile.id);
    }
  };

  const handleImportBaseInfo = (data) => {
    const normalized = buildBaseInfoForm({ raw: { base_info: data, baseInfo: data } });
    setBaseInfoForm(normalized);
    markDirty("baseInfo");
  };

  const handleExportBaseInfo = () => {
    downloadJson(`base-info-${profile?.id || "profile"}.json`, baseInfoForm);
  };

  const handleImportBaseResume = (data) => {
    const normalized = buildResumeForm({ raw: { base_resume: data, baseResume: data } });
    setResumeForm(normalized);
    setSkillsInput("");
    markDirty("baseResume");
  };

  const handleExportBaseResume = () => {
    downloadJson(`base-resume-${profile?.id || "profile"}.json`, buildResumeExport(resumeForm));
  };

  const panel = (
    <aside
      aria-hidden={!open}
      style={{ right: 0, top: 0, bottom: 0, height: "100vh" }}
      className={`fixed z-50 w-[460px] max-w-[calc(100vw-1rem)] rounded-l-2xl rounded-r-none bg-white shadow-[-12px_0_24px_rgba(15,23,42,0.12)] ring-1 ring-black/5 transition-all duration-300 ease-out ${
        open ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
            <div className="sticky top-0 z-20 bg-white">
              <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Profile Details</h2>
                  <p className="text-xs text-ink-muted">Manage profile data and base records.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!dirtyTabs[activeTab] || Boolean(savingTab)}
                    className="px-3 py-1.5 rounded-lg bg-accent-primary text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingTab === activeTab ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-md text-ink-muted hover:text-ink hover:bg-gray-100"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-border bg-white">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-accent-primary/10 text-accent-primary"
                          : "text-ink-muted hover:text-ink hover:bg-gray-100"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {dirtyTabs[tab.id] ? (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-5 py-5 space-y-6">
              <ProfileDetailProfileTab
                visible={activeTab === "profile"}
                profileForm={profileForm}
                updateProfileForm={updateProfileForm}
                selectedBidder={selectedBidder}
                bidderOptions={bidderOptions}
                emailStatusLabel={emailStatusLabel}
                emailActionLabel={emailActionLabel}
                onConnectEmail={handleConnectEmail}
                emailConnecting={emailConnecting}
              />
              <ProfileDetailBaseInfoTab
                visible={activeTab === "baseInfo"}
                baseInfoForm={baseInfoForm}
                updateBaseInfoForm={updateBaseInfoForm}
                onImportJson={handleImportBaseInfo}
                onExportJson={handleExportBaseInfo}
              />
              <ProfileDetailBaseResumeTab
                visible={activeTab === "baseResume"}
                resumeForm={resumeForm}
                skillsInput={skillsInput}
                setSkillsInput={setSkillsInput}
                handleSkillKeyDown={handleSkillKeyDown}
                removeSkill={removeSkill}
                addExperience={addExperience}
                removeExperience={removeExperience}
                updateExperience={updateExperience}
                updateResumeForm={updateResumeForm}
                onImportJson={handleImportBaseResume}
                onExportJson={handleExportBaseResume}
              />
            </div>
          </div>
        </div>
      </aside>
  );

  if (typeof document === "undefined") return null;
  return createPortal(panel, document.body);
};

export default ProfileDetailPanel;
