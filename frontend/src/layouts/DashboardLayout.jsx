import { Bell, Search, UserCircle } from "lucide-react";
import Sidebar from "../components/Sidebar";

const DashboardLayout = ({ children }) => {
  return (
    <div className="flex bg-slate-100 min-h-screen">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-72">

        {/* Top Navbar */}
        <header className="bg-white shadow-md h-20 flex items-center justify-between px-8 sticky top-0 z-50">

          {/* Search */}
          <div className="flex items-center bg-slate-100 rounded-xl px-4 py-2 w-96">
            <Search size={18} className="text-gray-500" />

            <input
              type="text"
              placeholder="Search freelancers, projects..."
              className="bg-transparent outline-none ml-3 w-full"
            />
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-6">

            <button className="relative">

              <Bell size={24} />

              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500"></span>

            </button>

            <div className="flex items-center gap-3">

              <UserCircle size={40} className="text-blue-600" />

              <div>
                <h3 className="font-semibold">
                  Welcome
                </h3>

                <p className="text-sm text-gray-500">
                  Freelancer
                </p>
              </div>

            </div>

          </div>

        </header>

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>

      </div>

    </div>
  );
};

export default DashboardLayout;