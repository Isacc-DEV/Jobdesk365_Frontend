type LogoProps = {
  onNavigate?: (path: string) => void;
  href?: string;
};

const Logo = ({ onNavigate, href = "/" }: LogoProps) => {
  const handleClick = () => {
    if (onNavigate) {
      onNavigate(href);
      return;
    }
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center justify-center p-0"
      aria-label="JobDesk365"
    >
      <img src="/images/logo.png" alt="JobDesk365" className="h-8 w-auto object-contain" />
    </button>
  );
};

export default Logo;
