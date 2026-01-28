import { useState } from "react";
import { useProfiles } from "../../hooks/useProfiles";
import { useTemplates } from "../../hooks/useTemplates";
import ProfileList from "../profiles/ProfileList";
import CreateProfileModal from "../profiles/CreateProfileModal";
import TemplateSelectModal from "../profiles/TemplateSelectModal";
import ProfileDetailPanel from "../profiles/ProfileDetailPanel";

const MainPlaceholder = () => {
  const { profiles, loading, error, createProfile, updateProfile } = useProfiles();
  const { templates, loading: templatesLoading, error: templatesError } = useTemplates();
  const [createOpen, setCreateOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateProfile, setTemplateProfile] = useState(null);
  const [templateAnchor, setTemplateAnchor] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailProfile, setDetailProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

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

  return (
    <main className="bg-main min-h-[calc(100vh-64px)] border-t border-border px-8 py-8">
      <div className="mx-auto flex flex-col gap-6">
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
          onOpen={(profile) => {
            setDetailProfile(profile);
            setDetailOpen(true);
          }}
        />
        {message ? (
          <div
            className={`text-sm px-4 py-3 rounded-lg border ${
              messageType === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
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
      />
    </main>
  );
};

export default MainPlaceholder;
