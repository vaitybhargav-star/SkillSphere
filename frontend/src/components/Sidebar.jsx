import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  Briefcase,
  MessageSquare,
  Bell,
  CreditCard,
  BarChart3,
  Settings,
  Star,
  Search,
} from "lucide-react";

const Sidebar = () => {
  const menuItems = [
    {
      title: "Search",
      icon: <Search size={20} />,
      path: "/search",
    },
    {
      title: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/dashboard",
    },
    {
      title: "My Profile",
      icon: <User size={20} />,
      path: "/freelancer/profile",
    },
    {
      title: "Projects",
      icon: <Briefcase size={20} />,
      path: "/projects",
    },
    {
      title: "Messages",
      icon: <MessageSquare size={20} />,
      path: "/messages",
    },
    {
      title: "Payments",
      icon: <CreditCard size={20} />,
      path: "/payments",
    },
    {
      title: "Notifications",
      icon: <Bell size={20} />,
      path: "/notifications",
    },
    {
      title: "Analytics",
      icon: <BarChart3 size={20} />,
      path: "/analytics",
    },
    {
      title: "Settings",
      icon: <Settings size={20} />,
      path: "/settings",
    },
    {
      title: "Reviews",
      icon: <Star size={20} />,
      path: "/reviews",
    },
  ];

  return (
    <div className="w-72 h-screen bg-slate-900 text-white fixed left-0 top-0 shadow-2xl">

      <div className="p-6 border-b border-slate-700">

        <h1 className="text-3xl font-bold text-blue-400">
          SkillSphere
        </h1>

        <p className="text-sm text-slate-400 mt-2">
          Intelligent Freelance Platform
        </p>

      </div>

      <div className="mt-8 flex flex-col">

        {menuItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.path}
            className={({ isActive }) =>
              `mx-4 mb-2 flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 ${
                isActive
                  ? "bg-blue-600"
                  : "hover:bg-slate-800"
              }`
            }
          >
            {item.icon}
            <span>{item.title}</span>
          </NavLink>
        ))}

      </div>

    </div>
  );
};

export default Sidebar;