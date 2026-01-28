import { Bell, CircleUserRound } from "lucide-react";
import IconButton from "../common/IconButton";
import SearchBar from "../common/SearchBar";
import Logo from "./Logo";

const Header = () => {
  return (
    <header className="h-16 grid grid-cols-[auto_1fr_auto] items-center gap-6 px-7 bg-main border-b border-border">
      <div className="flex items-center">
        <Logo />
      </div>
      <div className="justify-self-center">
        <SearchBar />
      </div>
      <div className="flex items-center gap-2.5">
        <IconButton icon={Bell} ariaLabel="Notifications" />
        <IconButton icon={CircleUserRound} ariaLabel="Profile" />
      </div>
    </header>
  );
};

export default Header;
