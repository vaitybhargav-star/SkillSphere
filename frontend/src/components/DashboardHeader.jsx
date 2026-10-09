const DashboardHeader = () => {
  const currentHour = new Date().getHours();

  let greeting = "Good Evening";

  if (currentHour < 12) greeting = "Good Morning";
  else if (currentHour < 17) greeting = "Good Afternoon";

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">

      <div className="flex justify-between items-center">

        <div>

          <h1 className="text-4xl font-bold text-slate-800">
            {greeting},
            <span className="text-blue-600"> Freelancer 👋</span>
          </h1>

          <p className="text-gray-500 mt-3">
            Welcome back to SkillSphere.
            Manage your projects, earnings and profile from one place.
          </p>

        </div>

        <div>

          <button className="bg-blue-600 hover:bg-blue-700 transition px-6 py-3 rounded-xl text-white font-semibold shadow-lg">

            + New Proposal

          </button>

        </div>

      </div>

    </div>
  );
};

export default DashboardHeader;