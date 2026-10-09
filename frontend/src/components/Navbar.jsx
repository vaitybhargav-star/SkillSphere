import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar({ theme = "dark" }) {
  // Use Auth context for consistent state
  const { token, user, logout } = useAuth();
  const [role, setRole] = useState(() => (user && user.role) || "");

  useEffect(() => {
    setRole((user && user.role) || "");
  }, [user]);

  // expose logout handler using context
  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const navThemeClasses = theme === "light"
    ? "bg-white/95 border-b border-slate-200/70 text-slate-900"
    : "bg-slate-950/95 border-b border-slate-800/70 text-slate-100";

  const linkThemeClasses = theme === "light"
    ? "rounded-full px-4 py-2 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
    : "rounded-full px-4 py-2 text-slate-200 transition hover:bg-slate-800 hover:text-white";

  const buttonThemeClasses = theme === "light"
    ? "brand-button-light rounded-full px-5 py-2 text-sm font-semibold"
    : "brand-button rounded-full px-5 py-2 text-sm font-semibold";

  return (
    <nav className={`sticky top-0 z-30 backdrop-blur-xl shadow-2xl ${navThemeClasses}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Link to="/" className={theme === "light" ? "text-3xl font-bold text-slate-900" : "text-3xl font-bold text-cyan-300"}>SkillSphere</Link>
          <span className={theme === "light" ? "hidden md:inline-block text-sm text-slate-500" : "hidden md:inline-block text-sm text-slate-400"}>AI-powered freelancer marketplace</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link to="/" className={linkThemeClasses}>Home</Link>
          {token ? (
            <>
              <Link to="/dashboard" className={linkThemeClasses}>Dashboard</Link>
              <Link to="/gigs" className={linkThemeClasses}>Marketplace</Link>
              <Link to="/messages" className={linkThemeClasses}>Messages</Link>
              <Link to="/payments" className={linkThemeClasses}>Payments</Link>
              <Link to="/disputes" className={linkThemeClasses}>Disputes</Link>
              <Link to="/profile" className={linkThemeClasses}>Profile</Link>
              {role === "admin" && <Link to="/admin" className={linkThemeClasses}>Admin</Link>}
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {token ? (
            <button
              onClick={handleLogout}
              className={buttonThemeClasses}
            >
              Logout
            </button>
          ) : (
            <>
              <Link to="/login" className={linkThemeClasses}>Login</Link>
              <Link
                to="/register"
                className={buttonThemeClasses}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;