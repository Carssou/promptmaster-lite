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
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      {/* Sidebar */}
      <nav className="w-full md:w-64 bg-white border-b md:border-r border-gray-200 p-4 md:p-0">
        <div className="p-4 hidden md:block">
          <h1 className="text-xl font-bold">PromptMaster</h1>
        </div>
        <ul className="flex md:flex-col justify-around md:justify-start space-x-1 md:space-x-0 md:space-y-1 p-2">
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
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
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
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100"
      >
        {icon}
        <span>{label}</span>
      </Link>
    </li>
  );
}
