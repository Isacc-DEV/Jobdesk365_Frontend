import { Search } from "lucide-react";

const SearchBar = ({ placeholder = "Search profiles, emails, people..." }) => {
  return (
    <label className="flex items-center gap-2 w-[min(480px,55vw)] px-3 py-2 bg-search border border-border-soft rounded-xl text-ink-muted shadow-inner">
      <Search size={16} strokeWidth={1.8} />
      <input
        type="search"
        placeholder={placeholder}
        className="w-full border-none bg-transparent text-sm font-medium text-ink placeholder:text-ink-muted focus:outline-none"
      />
    </label>
  );
};

export default SearchBar;
