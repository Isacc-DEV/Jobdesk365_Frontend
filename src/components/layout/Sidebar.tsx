import { useNavigation } from "../../hooks/useNavigation";
import SidebarItem from "./SidebarItem";

const COLLAPSED_WIDTH = 72;
const EXPANDED_WIDTH = 240;

const Sidebar = ({ expanded, onExpand, onCollapse, currentRoute, onNavigate }) => {
  const items = useNavigation();
  const width = expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  return (
    <aside
      onMouseEnter={onExpand}
      onMouseLeave={onCollapse}
      className="relative min-h-screen bg-sidebar-bg text-sidebar-text px-3.5 pt-6 pb-5 transition-[width] duration-200 ease-out overflow-hidden"
      style={{ width }}
    >
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <SidebarItem
            key={item.label}
            expanded={expanded}
            currentRoute={currentRoute}
            onNavigate={onNavigate}
            {...item}
          />
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
