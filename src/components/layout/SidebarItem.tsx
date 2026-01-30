import type { ComponentType } from "react";

type SidebarItemProps = {
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  active?: boolean;
  expanded: boolean;
  href?: string;
  currentRoute: string;
  onNavigate?: (path: string) => void;
};

const SidebarItem = ({
  icon: Icon,
  label,
  active,
  expanded,
  href,
  currentRoute,
  onNavigate
}: SidebarItemProps) => {
  const base =
    "relative w-full h-11 rounded-xl text-[15px] font-medium transition duration-150 ease-out hover:bg-white/5";
  // Avoid "/" matching every route; allow prefix match only for nested sections.
  const isActive =
    active ??
    (href
      ? href === "/"
        ? currentRoute === "/"
        : currentRoute === href || currentRoute.startsWith(`${href}/`)
      : false);
  const colors = isActive ? "bg-white/10 text-sidebar-text" : "text-sidebar-muted";

  const handleClick = () => {
    if (href && onNavigate) {
      onNavigate(href);
    }
  };

  return (
    <button type="button" onClick={handleClick} className={[base, colors].join(" ")}>
      <div
        className={`flex items-center h-full ${
          expanded ? "justify-start gap-3 px-4" : "justify-center px-0"
        }`}
      >
        <Icon size={18} strokeWidth={1.7} />
        <span
          className={`text-left whitespace-nowrap overflow-hidden transition-all duration-150 ${
            expanded ? "opacity-100 max-w-[160px] visible" : "opacity-0 max-w-0 invisible"
          }`}
        >
          {label}
        </span>
      </div>
    </button>
  );
};

export default SidebarItem;
