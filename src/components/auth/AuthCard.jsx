const AuthCard = ({ title, subtitle, children, footer }) => {
  return (
    <div className="w-[460px] rounded-2xl border border-border bg-white px-10 py-10 shadow-sm">
      <div className="space-y-1 mb-6">
        <h2 className="text-2xl font-bold text-ink">{title}</h2>
        {subtitle ? <p className="text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
      {footer ? <div className="mt-6 text-sm text-ink-muted">{footer}</div> : null}
    </div>
  );
};

export default AuthCard;
