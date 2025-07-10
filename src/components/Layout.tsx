import { Link, Outlet, useNavigate } from "react-router-dom";
import { Home, Plus, BarChart3, Settings } from "lucide-react";
import { useEffect } from "react";

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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <nav className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">PromptMaster</h1>
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

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
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
