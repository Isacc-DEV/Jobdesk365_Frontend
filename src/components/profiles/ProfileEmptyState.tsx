import { UserRoundPlus } from "lucide-react";

const ProfileEmptyState = ({ onCreate }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-10 text-center border border-border rounded-2xl bg-white">
      <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-ink-muted">
        <UserRoundPlus size={22} strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-lg font-semibold text-ink">No profiles yet</p>
        <p className="text-sm text-ink-muted">Create a profile to start applying for jobs.</p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="px-4 py-2 rounded-lg bg-accent-primary text-white text-sm font-semibold"
      >
        Create Profile
      </button>
    </div>
  );
};

export default ProfileEmptyState;
