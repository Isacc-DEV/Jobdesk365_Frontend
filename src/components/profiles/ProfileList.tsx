import ProfileRow from "./ProfileRow";

const getGridTemplate = (showOwner) =>
  showOwner
    ? "minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 1.05fr) minmax(0, 0.85fr)"
    : "minmax(0, 1.5fr) minmax(0, 1.5fr) minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 1.05fr) minmax(0, 0.85fr)";

const ProfileList = ({
  profiles,
  loading,
  error,
  onTemplateClick,
  onEmailOpen,
  onOpen,
  onDelete,
  onBidderRequest,
  onTemplatesOpen,
  allowBidderAssign,
  showOwner
}) => {
  if (loading) {
    return (
      <div className="border border-border rounded-2xl bg-white p-6 text-sm text-ink-muted">
        Loading profiles…
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-border rounded-2xl bg-white p-6 text-sm text-red-600">
        Couldn&apos;t load profiles. Please try again.
      </div>
    );
  }

  if (!profiles || profiles.length === 0) {
    return (
      <div className="border border-border rounded-2xl bg-white p-6 text-sm text-ink-muted">
        There is no profiles.
      </div>
    );
  }

  const headerCells = [
    { label: "Profile", align: "text-left" },
    ...(showOwner ? [{ label: "Username", align: "text-left" }] : []),
    { label: "Email", align: "text-left" },
    { label: "Template", align: "text-left" },
    { label: "Bidder", align: "text-left" },
    { label: "Inbox", align: "text-left" },
    { label: "Next Interview", align: "text-left" },
    { label: "Actions", align: "text-right" }
  ];

  const gridTemplate = getGridTemplate(showOwner);

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-white">
      <div
        className="grid items-stretch gap-0 px-4 py-3 text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted bg-[#F5F7FA] border-b border-border"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {headerCells.map((cell, index) => (
          <div
            key={cell.label}
            className={`${cell.align} px-2 flex items-center h-full box-border min-w-0 ${
              index === headerCells.length - 1 ? "" : "border-r border-border"
            }`}
          >
            {cell.label}
          </div>
        ))}
      </div>
      <div className="divide-y divide-border">
        {profiles.map((profile) => (
          <ProfileRow
            key={profile.id}
            profile={profile}
            onOpen={() => onOpen?.(profile)}
            onTemplateClick={(anchor) => onTemplateClick?.(profile, anchor)}
            onEmailOpen={() => onEmailOpen?.(profile)}
            onDelete={() => onDelete?.(profile)}
            onBidderRequest={() => onBidderRequest?.(profile)}
            onTemplatesOpen={onTemplatesOpen}
            allowBidderAssign={allowBidderAssign}
            showOwner={showOwner}
            gridTemplate={gridTemplate}
          />
        ))}
      </div>
    </div>
  );
};

export default ProfileList;
