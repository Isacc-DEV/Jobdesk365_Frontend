import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Save, X } from "lucide-react";
import ProfileDetailProfileTab from "./ProfileDetailProfileTab";
import ProfileDetailBaseInfoTab from "./ProfileDetailBaseInfoTab";
import ProfileDetailBaseResumeTab from "./ProfileDetailBaseResumeTab";
import {
  normalizeResumeDateInput,
  normalizeResumeExperienceDates
} from "../../lib/resumeDate";

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

const formatPersonLabel = (person) =>
  person?.name ||
  person?.display_name ||
  person?.displayName ||
  person?.username ||
  person?.email ||
  person?.id ||
  "";

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
    desiredSalary:
      baseInfo.desired_annual_salary ||
      baseInfo.desiredAnnualSalary ||
      baseInfo.desiredSalary ||
      "",
    currentSalary: baseInfo.current_salary || baseInfo.currentSalary || "",
    noticePeriod: baseInfo.notice_period || baseInfo.noticePeriod || "",
    currency: baseInfo.currency || "USD",
    email: baseInfo.email || "",
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
  const startRaw = exp?.startDate || exp?.start_date || "";
  const endRaw = exp?.end_date || exp?.endDate || "";
  const isPresent = exp?.isPresent || String(endRaw).toLowerCase() === "present";
  const normalizedStart = normalizeResumeDateInput(startRaw, { allowPresent: false });
  const normalizedEnd = normalizeResumeDateInput(isPresent ? "Present" : endRaw, { allowPresent: true });
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
    startDate: normalizedStart.isValid ? normalizedStart.value : startRaw,
    endDate: normalizedEnd.isValid ? normalizedEnd.value : (isPresent ? "Present" : endRaw),
    isPresent: normalizedEnd.isValid ? normalizedEnd.value === "Present" : isPresent,
    bullets
  };
};

const normalizeEducation = (entry) => {
  const courseworkValue = entry?.coursework ?? entry?.courses ?? "";
  const coursework = Array.isArray(courseworkValue)
    ? courseworkValue.filter(Boolean).join("\n")
    : courseworkValue || "";
  const dateRaw = entry?.date || entry?.graduationDate || "";
  const normalizedDate = normalizeResumeDateInput(dateRaw, { allowPresent: false });
  return {
    id: entry?.id || `edu-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    institution: entry?.institution || entry?.school || "",
    degree: entry?.degree || "",
    field: entry?.field || entry?.major || "",
    date: normalizedDate.isValid ? normalizedDate.value : dateRaw,
    coursework
  };
};

const dateErrorKey = (id, field) => `${id}:${field}`;

const normalizeResumeExperienceForForm = (experienceItems) => {
  const normalized = normalizeResumeExperienceDates(experienceItems);
  const items = Array.isArray(normalized.items)
    ? normalized.items.map((item, index) => {
        if (!item || typeof item !== "object") return item;
        const entry = item as any;
        return {
          ...entry,
          id: entry.id || experienceItems?.[index]?.id || `exp-${Date.now()}-${index}`
        };
      })
    : [];
  const errors: Record<string, string> = {};

  normalized.issues.forEach((issue) => {
    const item = items?.[issue.index];
    if (!item || !item.id) return;
    errors[dateErrorKey(item.id, issue.field)] = issue.message;
  });

  return { items, errors, issues: normalized.issues };
};

const normalizeResumeEducationForForm = (educationItems) => {
  const items = Array.isArray(educationItems)
    ? educationItems.map((item, index) => {
        const entry = item && typeof item === "object" ? item : {};
        return {
          ...entry,
          id: entry.id || `edu-${Date.now()}-${index}`,
          date: entry.date || ""
        };
      })
    : [];
  const errors: Record<string, string> = {};
  const issues: Array<{ index: number; field: "date"; value: string; message: string }> = [];

  items.forEach((item, index) => {
    const rawDate = item?.date || "";
    const normalizedDate = normalizeResumeDateInput(rawDate, { allowPresent: false });
    if (!normalizedDate.isValid) {
      errors[dateErrorKey(item.id, "date")] = normalizedDate.error || "Invalid date format.";
      issues.push({
        index,
        field: "date",
        value: normalizedDate.value,
        message: normalizedDate.error || "Invalid date."
      });
      return;
    }
    item.date = normalizedDate.value;
  });

  return { items, errors, issues };
};

const normalizeResumeFormForEditor = (form) => {
  const normalizedExperience = normalizeResumeExperienceForForm(form?.experience);
  const normalizedEducation = normalizeResumeEducationForForm(form?.education);
  return {
    form: {
      ...form,
      experience: normalizedExperience.items,
      education: normalizedEducation.items
    },
    errors: {
      ...normalizedExperience.errors,
      ...normalizedEducation.errors
    },
    issues: [...normalizedExperience.issues, ...normalizedEducation.issues]
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
  const educationSource = resume.education || resume.educationHistory || [];
  const experienceItems = Array.isArray(experienceSource) ? experienceSource : [];
  const educationItems = Array.isArray(educationSource) ? educationSource : [];
  return {
    name: profileBlock.name || resume.name || resume.full_name || resume.fullName || "",
    location: contactBlock.location || resume.location || resume.location_text || resume.locationText || "",
    email: contactBlock.email || resume.email || "",
    phone: contactBlock.phone || resume.phone || resume.phone_number || resume.phoneNumber || "",
    linkedin: contactBlock.linkedin || resume.linkedin || resume.linkedin_url || resume.linkedinUrl || "",
    headline: profileBlock.headline || resume.headline || "",
    summary: summaryValue,
    skills,
    experience: experienceItems.map(normalizeExperience),
    education: educationItems.map(normalizeEducation)
  };
};

const buildResumeExport = (form) => {
  const skills = Array.isArray(form.skills)
    ? form.skills
        .map((skill) => String(skill || "").trim())
        .filter(Boolean)
    : [];
  const experienceItems = Array.isArray(form.experience) ? form.experience : [];
  const educationItems = Array.isArray(form.education) ? form.education : [];
  const normalizedExperience = normalizeResumeExperienceDates(experienceItems);
  const workExperience = normalizedExperience.items
    .map((rawExp) => {
    const exp = rawExp as any;
    const companyTitle = (exp.companyName || "").trim();
    if (!companyTitle) return null;
    const bullets = typeof exp.bullets === "string"
      ? exp.bullets
          .split("\n")
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      : Array.isArray(exp.bullets)
      ? exp.bullets.filter(Boolean)
      : [];
    const item: any = {
      companyTitle,
      roleTitle: exp.roleTitle || "",
      employmentType: exp.employmentType || "",
      location: exp.location || "",
      startDate: exp.startDate || "",
      endDate: exp.isPresent ? "Present" : exp.endDate || ""
    };
    if (bullets.length) {
      item.bullets = bullets;
    }
    return item;
  })
    .filter(Boolean);
  const education = educationItems
    .map((rawEdu) => {
    const edu = rawEdu as any;
    const dateNormalized = normalizeResumeDateInput(edu.date || "", { allowPresent: false });
    const date = dateNormalized.isValid ? dateNormalized.value : (edu.date || "");
    const coursework = typeof edu.coursework === "string"
      ? edu.coursework
          .split("\n")
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      : Array.isArray(edu.coursework)
      ? edu.coursework.filter(Boolean)
      : [];
    const institution = (edu.institution || "").trim();
    const degree = (edu.degree || "").trim();
    const field = (edu.field || "").trim();
    const dateValue = String(date || "").trim();
    if (!institution && !degree && !field && !dateValue && coursework.length === 0) {
      return null;
    }
    const item: any = {
      institution,
      degree,
      field,
      date: dateValue
    };
    if (coursework.length) {
      item.coursework = coursework;
    }
    return item;
  })
    .filter(Boolean);

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
    workExperience,
    education,
    skills: { raw: skills }
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
  onSaveProfile?: (payload: any) => Promise<void> | void;
  onSaveBaseInfo?: (payload: any) => Promise<void> | void;
  onSaveBaseResume?: (payload: any) => Promise<void> | void;
  onConnectEmail?: (profileId: string) => Promise<void> | void;
  onDisconnectEmail?: (profileId: string) => Promise<void> | void;
  onChangeEmail?: (profileId: string) => Promise<void> | void;
  emailConnecting?: boolean;
  emailDisconnecting?: boolean;
  emailChanging?: boolean;
};

const ProfileDetailPanel = ({
  open,
  onClose,
  profile,
  onSaveProfile,
  onSaveBaseInfo,
  onSaveBaseResume,
  onConnectEmail,
  onDisconnectEmail,
  onChangeEmail,
  emailConnecting = false,
  emailDisconnecting = false,
  emailChanging = false
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
  const [resumeDateErrors, setResumeDateErrors] = useState<Record<string, string>>({});
  const [skillsInput, setSkillsInput] = useState("");

  useEffect(() => {
    setProfileForm(buildProfileForm(profile));
    setBaseInfoForm(buildBaseInfoForm(profile));
    const nextResumeForm = buildResumeForm(profile);
    const normalized = normalizeResumeFormForEditor(nextResumeForm);
    setResumeForm(normalized.form);
    setResumeDateErrors(normalized.errors);
    setDirtyTabs({ profile: false, baseInfo: false, baseResume: false });
    setActiveTab("profile");
    setSkillsInput("");
  }, [profile]);

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

  const clearDateError = (id, field) => {
    const key = dateErrorKey(id, field);
    setResumeDateErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateExperience = (id, key, value) => {
    setResumeForm((prev) => ({
      ...prev,
      experience: prev.experience.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    }));
    if (key === "startDate" || key === "endDate") {
      clearDateError(id, key);
    }
    if (key === "isPresent" && value) {
      clearDateError(id, "endDate");
    }
    markDirty("baseResume");
  };

  const handleExperienceDateBlur = (id, field) => {
    const selected = resumeForm.experience.find((item) => item.id === id);
    if (!selected) return;
    if (field === "endDate" && selected.isPresent) {
      updateExperience(id, "endDate", "Present");
      clearDateError(id, "endDate");
      return;
    }
    const normalized = normalizeResumeDateInput(selected[field], {
      allowPresent: field === "endDate"
    });
    if (!normalized.isValid) {
      setResumeDateErrors((prev) => ({
        ...prev,
        [dateErrorKey(id, field)]: normalized.error || "Invalid date format."
      }));
      return;
    }
    if (field === "endDate") {
      const isPresent = normalized.value === "Present";
      updateExperience(id, "isPresent", isPresent);
    }
    updateExperience(id, field, normalized.value);
    clearDateError(id, field);
  };

  const addExperience = () => {
    const newItem = normalizeExperience({
      id: `exp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      isPresent: false
    });
    setResumeForm((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        newItem
      ]
    }));
    markDirty("baseResume");
  };

  const removeExperience = (id) => {
    setResumeForm((prev) => ({
      ...prev,
      experience: prev.experience.filter((item) => item.id !== id)
    }));
    setResumeDateErrors((prev) => {
      const next = { ...prev };
      delete next[dateErrorKey(id, "startDate")];
      delete next[dateErrorKey(id, "endDate")];
      return next;
    });
    markDirty("baseResume");
  };

  const addEducation = () => {
    const newItem = normalizeEducation({
      id: `edu-${Date.now()}-${Math.random().toString(16).slice(2)}`
    });
    setResumeForm((prev) => ({
      ...prev,
      education: [...(Array.isArray(prev.education) ? prev.education : []), newItem]
    }));
    markDirty("baseResume");
  };

  const updateEducation = (id, key, value) => {
    setResumeForm((prev) => ({
      ...prev,
      education: (Array.isArray(prev.education) ? prev.education : []).map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    }));
    if (key === "date") {
      clearDateError(id, "date");
    }
    markDirty("baseResume");
  };

  const removeEducation = (id) => {
    setResumeForm((prev) => ({
      ...prev,
      education: (Array.isArray(prev.education) ? prev.education : []).filter((item) => item.id !== id)
    }));
    setResumeDateErrors((prev) => {
      const next = { ...prev };
      delete next[dateErrorKey(id, "date")];
      return next;
    });
    markDirty("baseResume");
  };

  const handleEducationDateBlur = (id) => {
    const selected = resumeForm.education.find((item) => item.id === id);
    if (!selected) return;
    const normalized = normalizeResumeDateInput(selected.date, { allowPresent: false });
    if (!normalized.isValid) {
      setResumeDateErrors((prev) => ({
        ...prev,
        [dateErrorKey(id, "date")]: normalized.error || "Invalid date format."
      }));
      return;
    }
    updateEducation(id, "date", normalized.value);
    clearDateError(id, "date");
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
        const normalized = normalizeResumeFormForEditor(resumeForm);
        setResumeForm(normalized.form);
        setResumeDateErrors(normalized.errors);
        if (normalized.issues.length > 0) {
          return;
        }
        const payload = buildResumeExport(normalized.form);
        await onSaveBaseResume?.(payload);
      }
      setDirtyTabs((prev) => ({ ...prev, [activeTab]: false }));
    } finally {
      setSavingTab(null);
    }
  };

  const emailStatusLabel = profileForm.emailStatus === "connected" ? "Connected" : "Not Connected";
  const connectActionLabel =
    profileForm.emailStatus === "expired"
      ? "Reconnect"
      : profileForm.emailStatus === "not_connected"
      ? "Connect"
      : "Connect";
  const assignedBidderLabel =
    profile?.assignedBidderLabel ||
    formatPersonLabel({
      name: profile?.raw?.assigned_bidder_display_name,
      username: profile?.raw?.assigned_bidder_username,
      email: profile?.raw?.assigned_bidder_email,
      id: profile?.raw?.assigned_bidder_user_id
    }) ||
    "";

  const handleConnectEmail = () => {
    if (profile?.id) {
      onConnectEmail?.(profile.id);
    }
  };

  const handleDisconnectEmail = () => {
    if (profile?.id) {
      onDisconnectEmail?.(profile.id);
    }
  };

  const handleChangeEmail = () => {
    if (profile?.id) {
      onChangeEmail?.(profile.id);
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
    const normalizedForm = buildResumeForm({ raw: { base_resume: data, baseResume: data } });
    const normalized = normalizeResumeFormForEditor(normalizedForm);
    setResumeForm(normalized.form);
    setResumeDateErrors(normalized.errors);
    setSkillsInput("");
    markDirty("baseResume");
  };

  const handleExportBaseResume = () => {
    downloadJson(`base-resume-${profile?.id || "profile"}.json`, buildResumeExport(resumeForm));
  };

  const panel = (
    <>
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
                      aria-label={savingTab === activeTab ? "Saving" : "Save changes"}
                      title={savingTab === activeTab ? "Saving..." : "Save changes"}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-accent-primary disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {savingTab === activeTab ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
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
                assignedBidderLabel={assignedBidderLabel}
                emailStatusLabel={emailStatusLabel}
                connectActionLabel={connectActionLabel}
                onConnectEmail={handleConnectEmail}
                onDisconnectEmail={handleDisconnectEmail}
                onChangeEmail={handleChangeEmail}
                emailConnecting={emailConnecting}
                emailDisconnecting={emailDisconnecting}
                emailChanging={emailChanging}
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
                  templateId={profile?.templateId || profile?.raw?.resume_template_id || ""}
                  templateTitle={profile?.templateTitle || profile?.raw?.resume_template_title || ""}
                  skillsInput={skillsInput}
                  setSkillsInput={setSkillsInput}
                  handleSkillKeyDown={handleSkillKeyDown}
                  removeSkill={removeSkill}
                  addExperience={addExperience}
                  removeExperience={removeExperience}
                  updateExperience={updateExperience}
                  addEducation={addEducation}
                  removeEducation={removeEducation}
                  updateEducation={updateEducation}
                  onExperienceDateBlur={handleExperienceDateBlur}
                  onEducationDateBlur={handleEducationDateBlur}
                  resumeDateErrors={resumeDateErrors}
                  updateResumeForm={updateResumeForm}
                  onImportJson={handleImportBaseResume}
                  onExportJson={handleExportBaseResume}
                />
              </div>
            </div>
          </div>
        </aside>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(panel, document.body);
};

export default ProfileDetailPanel;
