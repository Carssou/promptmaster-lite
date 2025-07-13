import { Link, Outlet, useNavigate } from "react-router-dom";
import { Home, Plus, BarChart3, Settings } from "lucide-react";
import { useEffect } from "react";
import { GlobalSearch } from "./search/GlobalSearch";

export function Layout() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "n") {
        event.preventDefault();
        navigate("/new");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigate]);

  const handleSearchSelect = (promptUuid: string) => {
    navigate(`/editor/${promptUuid}`);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <nav className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">PromptMaster</h1>
        </div>

        <div className="flex-1 p-4">
          <ul className="space-y-2">
            <NavItem to="/" icon={<Home size={18} />} label="Dashboard" />
            <NavItem to="/new" icon={<Plus size={18} />} label="New Prompt" />
            <NavItem
              to="/analytics"
              icon={<BarChart3 size={18} />}
              label="Analytics"
            />
            <NavItem
              to="/settings"
              icon={<Settings size={18} />}
              label="Settings"
            />
          </ul>
        </div>
      </nav>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar with search */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex-shrink-0">
          <div className="max-w-lg">
            <GlobalSearch onSelectResult={handleSearchSelect} />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        {icon}
        <span className="font-medium">{label}</span>
      </Link>
    </li>
  );
}
