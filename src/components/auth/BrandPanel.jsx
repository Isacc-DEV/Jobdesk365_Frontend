const BrandPanel = () => {
  const bullets = [
    "Profiles with synced email",
    "Apply Assist + tailored resumes",
    "Hire bidders & callers with credits"
  ];

  return (
    <aside className="w-[520px] min-h-screen bg-sidebar-bg text-sidebar-text px-12 py-14 flex flex-col gap-10">
      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-[#11182759] text-sm font-semibold">
        JobDesk365
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold leading-tight">Apply smarter.</h1>
        <h1 className="text-3xl font-extrabold leading-tight">Hire help when needed.</h1>
      </div>
      <ul className="space-y-3 text-[15px] text-sidebar-text">
        {bullets.map((item) => (
          <li key={item} className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-accent-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default BrandPanel;
