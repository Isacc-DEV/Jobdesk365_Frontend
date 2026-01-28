const ProfileDetailBaseResumeTab = ({
  visible,
  resumeForm,
  skillsInput,
  setSkillsInput,
  handleSkillKeyDown,
  removeSkill,
  addExperience,
  removeExperience,
  updateExperience,
  updateResumeForm
}) => (
  <section className="space-y-6" style={{ display: visible ? "block" : "none" }}>
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Header</h3>
      <input
        type="text"
        placeholder="Headline"
        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        value={resumeForm.headline}
        onChange={(event) => updateResumeForm("headline", event.target.value)}
      />
    </div>

    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Summary</h3>
      <textarea
        rows={4}
        placeholder="Summary"
        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        value={resumeForm.summary}
        onChange={(event) => updateResumeForm("summary", event.target.value)}
      />
    </div>

    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Skills</h3>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
        {resumeForm.skills.map((skill) => (
          <span
            key={skill}
            className="flex items-center gap-1 rounded-full bg-accent-primary/10 px-2 py-1 text-xs font-semibold text-accent-primary"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="text-accent-primary/70 hover:text-accent-primary"
            >
              x
            </button>
          </span>
        ))}
        <input
          type="text"
          className="flex-1 min-w-[120px] border-none p-1 text-sm focus:outline-none"
          placeholder="Add a skill"
          value={skillsInput}
          onChange={(event) => setSkillsInput(event.target.value)}
          onKeyDown={handleSkillKeyDown}
        />
      </div>
    </div>

    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Work Experience</h3>
        <button
          type="button"
          onClick={addExperience}
          className="text-sm font-semibold text-accent-primary hover:underline"
        >
          Add Experience
        </button>
      </div>
      <div className="space-y-4">
        {resumeForm.experience.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-ink-muted">
            No experience added yet.
          </div>
        ) : null}
        {resumeForm.experience.map((exp) => (
          <div key={exp.id} className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-ink">Role</h4>
              <button
                type="button"
                onClick={() => removeExperience(exp.id)}
                className="text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Remove Role
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <input
                type="text"
                placeholder="Company Name"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                value={exp.companyName}
                onChange={(event) => updateExperience(exp.id, "companyName", event.target.value)}
              />
              <input
                type="text"
                placeholder="Role Title"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                value={exp.roleTitle}
                onChange={(event) => updateExperience(exp.id, "roleTitle", event.target.value)}
              />
              <select
                className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                value={exp.employmentType}
                onChange={(event) => updateExperience(exp.id, "employmentType", event.target.value)}
              >
                <option value="">Employment Type</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Freelance">Freelance</option>
                <option value="Internship">Internship</option>
              </select>
              <input
                type="date"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                value={exp.startDate}
                onChange={(event) => updateExperience(exp.id, "startDate", event.target.value)}
              />
              <input
                type="date"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                value={exp.isPresent ? "" : exp.endDate}
                onChange={(event) => updateExperience(exp.id, "endDate", event.target.value)}
                disabled={exp.isPresent}
              />
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={exp.isPresent}
                  onChange={(event) => {
                    const isPresent = event.target.checked;
                    updateExperience(exp.id, "isPresent", isPresent);
                    updateExperience(exp.id, "endDate", isPresent ? "Present" : "");
                  }}
                />
                Present
              </label>
            </div>
            <textarea
              rows={3}
              placeholder="Bullets"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              value={exp.bullets}
              onChange={(event) => updateExperience(exp.id, "bullets", event.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ProfileDetailBaseResumeTab;
