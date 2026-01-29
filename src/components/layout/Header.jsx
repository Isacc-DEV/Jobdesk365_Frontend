import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, CircleUserRound, LogOut, Settings, User } from "lucide-react";
import IconButton from "../common/IconButton";
import SearchBar from "../common/SearchBar";
import Logo from "./Logo";

const Header = ({ searchPlaceholder, onNavigate }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleNavigate = (path) => {
    if (onNavigate) {
      onNavigate(path);
      return;
    }
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("authToken");
      window.location.href = "/auth";
    }
  };

  return (
    <header className="h-16 grid grid-cols-[auto_1fr_auto] items-center gap-6 px-7 bg-main border-b border-border">
      <div className="flex items-center">
        <Logo />
      </div>
      <div className="justify-self-center">
        <SearchBar placeholder={searchPlaceholder} />
      </div>
      <div className="flex items-center gap-2.5">
        <IconButton icon={Bell} ariaLabel="Notifications" />
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-1.5 rounded-xl border border-border-soft bg-main px-2 py-1 text-ink transition duration-150 ease-out hover:border-ink-muted hover:-translate-y-[1px] hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
          >
            <CircleUserRound size={18} strokeWidth={1.8} />
            <ChevronDown size={14} className="text-ink-muted" />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-white shadow-lg p-1 z-50"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  handleNavigate("/user");
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-gray-100"
              >
                <User size={16} />
                Profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  handleNavigate("/settings");
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-gray-100"
              >
                <Settings size={16} />
                Settings
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default Header;
