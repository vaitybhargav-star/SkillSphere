import Navbar from "../components/Navbar";

function MainLayout({ children, theme = "dark" }) {
  const shellClass = theme === "light" ? "page-shell light-theme text-slate-900" : "page-shell text-slate-100";

  return (
    <div className={`min-h-screen ${shellClass}`}>
      <Navbar theme={theme} />
      <main className="px-6 pb-16 pt-6 sm:px-10 lg:px-12">{children}</main>
    </div>
  );
}

export default MainLayout;