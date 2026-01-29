const IconButton = ({ icon: Icon, ariaLabel, onClick, className = "", type = "button" }) => {
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`h-[34px] w-[34px] grid place-items-center rounded-xl border border-border-soft bg-main text-ink transition duration-150 ease-out hover:border-ink-muted hover:-translate-y-[1px] hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary ${className}`}
    >
      <Icon size={18} strokeWidth={1.8} />
    </button>
  );
};

export default IconButton;
